-- Self-contained regression fixture. Never run on a real application DB.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'fittrackr_gamification_test_%' then
    raise exception 'Use an isolated fittrackr_gamification_test_* database';
  end if;
end $$;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if not exists(select 1 from pg_roles where rolname=r) then execute format('create role %I',r); end if;
  end loop;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth,public to authenticated;
grant execute on function auth.uid() to authenticated;
alter default privileges in schema public revoke execute on functions from public;
create table public.user_health_profiles(user_id uuid primary key,age int,sex text,weight_kg float8,created_at timestamptz default now());
create table public.user_goals(user_id uuid primary key,calorie_target int);
create table public.meals(id uuid primary key default gen_random_uuid(),user_id uuid,date date,meal_type text);
create table public.meal_items(id uuid primary key default gen_random_uuid(),meal_id uuid references public.meals on delete cascade,
  quantity_g float8,unit text,category text,alcohol_abv float8,fiber_g float8,sugars_g float8,salt_g float8);
create table public.workouts(id uuid primary key default gen_random_uuid(),user_id uuid,date date,activity text,duration_min int,distance_km float8);
create table public.gym_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,date date,plan_name text,started_at timestamptz,completed_at timestamptz);
create table public.gym_sets(id uuid primary key default gen_random_uuid(),session_id uuid references public.gym_sessions on delete cascade,
  exercise_key text,exercise_name text,equipment text,weight_kg numeric,per_side boolean,done boolean,reps int);
\ir ../migrations/20261104120000_fitness_gamification.sql
\ir ../migrations/20261104130000_fitness_points_by_default.sql
\ir ../migrations/20261104140000_automatic_fitness_points.sql
\ir ../migrations/20261104150000_scale_fitness_points.sql
\ir ../migrations/20261105120000_fitness_points_goals_and_penalties.sql
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
create function pg_temp.award(p_day date,p_key text) returns jsonb language sql as $$
  select a from jsonb_array_elements(public.get_fitness_points(p_day)->'day'->'awards')a where a->>'key'=p_key;
$$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.user_health_profiles(user_id,age,sex,weight_kg) values
('00000000-0000-0000-0000-000000000001',30,'female',70),('00000000-0000-0000-0000-000000000002',30,'female',70);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'rules_version')::int=4,'New automatic rule version');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=0,'Empty diary does not accrue penalties');
reset role;
update public.fitness_points_settings set started_on=(now() at time zone timezone)::date-8;
-- Exactly two distinct food slots, including three consecutive days.
insert into public.meals(user_id,date,meal_type)
select '00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date+n,t
from unnest(array[-8,-2,-1,0])n,unnest(array['breakfast','lunch'])t;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select id,100,'g','grain',0,0,0 from public.meals;
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->'day'->>'registered')::boolean,'Two valid moments register the day');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=3,'Two-slot days count for streaks');
select pg_temp.assert((public.get_fitness_points()->>'registered_days')::int=4,'All two-slot days counted');
select pg_temp.assert((public.get_fitness_points()->'day'->>'points')::int=4,'Today earns diary and streak; wellbeing still pending');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'vegetables')->>'points')::int=-1,'Missing vegetables costs one');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fruit')->>'points')::int=-1,'Missing fruit costs one');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fiber')->>'points')::int=-1,'Known missing fibre costs one');
select pg_temp.assert(pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fiber')->'detail'->>'status'='missed','Missed goal shown explicitly');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-2,'legumes')->>'points')::int=-3,'Weekly legumes miss costs three');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-2,'fish')->>'points')::int=-3,'Weekly fish miss costs three');
reset role;
-- Check strict-limit boundaries and each new penalty band without any rounding
-- that could erase a small excess. User examples: 6g -> -1, 16g -> -3.
do $$ declare v numeric; expected int; actual int; begin
  for v,expected in select * from (values(5,1),(5.001,-1),(6,-1),(9.999,-1),(10,-2),(14.999,-2),(15,-3),(16,-3),(20,-4),(40,-8))cases(v,expected) loop
    update public.meal_items i set salt_g=case when m.meal_type='breakfast' then v else 0 end
      from public.meals m where i.meal_id=m.id and m.date=(now() at time zone 'Europe/Rome')::date-1;
    actual:=(pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'salt')->>'points')::int;
    perform pg_temp.assert(actual=expected,format('Salt %s: expected %s, got %s',v,expected,actual));
  end loop;
end $$;
update public.meal_items i set sugars_g=case when m.meal_type='breakfast' then 76 else 0 end
from public.meals m where i.meal_id=m.id and m.date=(now() at time zone 'Europe/Rome')::date-1;
set local role authenticated;
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'sugars')->>'points')::int=-1,'Small sugar excess never rounds away');
reset role;
update public.meal_items i set sugars_g=case when m.meal_type='breakfast' then 240 else 0 end,
  fiber_g=case when m.meal_type='breakfast' then null else 0 end
from public.meals m where i.meal_id=m.id and m.date=(now() at time zone 'Europe/Rome')::date-1;
set local role authenticated;
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'sugars')->>'points')::int=-3,'Sugar scales by its own 75g target');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fiber')->>'points')::int=0,'Unknown fibre is not a known miss');
select pg_temp.assert(pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fiber')->'detail'->>'status'='incomplete','Partial fibre remains incomplete');
reset role;
insert into public.meal_items(meal_id,quantity_g,unit,category,alcohol_abv,fiber_g,sugars_g,salt_g)
select id,12*3.2/0.789,'ml','alcohol',100,0,0,0 from public.meals
where date=(now() at time zone 'Europe/Rome')::date-1 and meal_type='lunch';
set local role authenticated;
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'alcohol')->>'points')::int=-3,'Alcohol uses its own one-UA target');
reset role;
update public.fitness_points_settings set alcohol_target=0 where user_id='00000000-0000-0000-0000-000000000001';
update public.meal_items set quantity_g=0.1 where category='alcohol';
set local role authenticated;
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'alcohol')->>'points')::int=-1,'Zero alcohol target: any known amount costs at least one');
reset role;
-- Today's known excess is still pending until the day ends.
update public.meal_items i set salt_g=20 from public.meals m where i.meal_id=m.id and m.date=(now() at time zone 'Europe/Rome')::date;
set local role authenticated;
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date,'salt')->>'points')::int=0,'No penalty before day end');
reset role;
-- Deleting a slot invalidates the day automatically; known excess remains a
-- fact, whereas unproven minimum misses do not punish an incomplete diary.
delete from public.meals where date=(now() at time zone 'Europe/Rome')::date-1 and meal_type='lunch';
set local role authenticated;
select pg_temp.assert(not (public.get_fitness_points((now() at time zone 'Europe/Rome')::date-1)->'day'->>'registered')::boolean,'One moment is insufficient');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'fruit')->>'points')::int=0,'Incomplete day does not incur a minimum-goal miss');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-1,'salt')->>'points')::int=-8,'Known excess still counts in an incomplete diary');
select pg_temp.assert((select bool_and((d->>'points')::int=(select sum((a->>'points')::int) from jsonb_array_elements(d->'awards')a)) from jsonb_array_elements(public.get_fitness_points()->'history')d),'Recap sums all positive and negative contributions');
select pg_temp.assert((public.get_fitness_points()->>'net_total')::int=(select sum((d->>'points')::int) from jsonb_array_elements(public.get_fitness_points()->'history')d),'Net balance equals all days in this nine-day history');
reset role;
-- No weekly deductions for an entirely unlogged account.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select public.get_fitness_points() is not null;
reset role;
update public.fitness_points_settings set started_on=(now() at time zone timezone)::date-8 where user_id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'net_total')::int=0,'Empty days and empty weeks are not penalized');
select pg_temp.assert((pg_temp.award((now() at time zone 'Europe/Rome')::date-2,'legumes')->>'points')::int=0,'Unlogged weekly legumes stay unknown');
select pg_temp.assert(not has_function_privilege('authenticated','public.fitness_points_days()','execute'),'Internal scorer remains inaccessible');
select pg_temp.assert((select count(*)=1 from public.fitness_points_settings),'Owner isolation retained');
reset role;
rollback;
\echo 'Two moments and goal-penalty checks passed'
