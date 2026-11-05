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
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.user_health_profiles(user_id,age,sex,weight_kg) values
('00000000-0000-0000-0000-000000000001',30,'female',70),('00000000-0000-0000-0000-000000000002',30,'female',70);
insert into public.user_goals values ('00000000-0000-0000-0000-000000000001',2000);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'enabled')::boolean,'Automatic setup, no action');
select pg_temp.assert((public.get_fitness_points()->>'rules_version')::int=3,'Scaled rules version');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=0,'Empty diary earns no points');
select pg_temp.assert(not has_function_privilege('authenticated','public.confirm_fitness_points_day(date,boolean)','execute'),'No manual confirmation API');
reset role;
update public.fitness_points_settings set started_on=(now() at time zone timezone)::date-34;
insert into public.meals(user_id,date,meal_type)
select s.user_id,s.started_on+n,t from public.fitness_points_settings s,
  generate_series(-1,35)n,unnest(array['breakfast','lunch','dinner'])t;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,case m.meal_type when 'breakfast' then 360 when 'lunch' then 400 else 100 end,'g',
  case m.meal_type when 'breakfast' then 'fruit' when 'lunch' then 'vegetable' else 'grain' end,10,20,1 from public.meals m;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,v.grams,'g',v.category,0,0,0 from public.meals m join public.fitness_points_settings s on s.user_id=m.user_id and m.date=s.started_on,
  (values (450,'legume'),(300,'fish'))v(grams,category) where m.meal_type='dinner';
set local role authenticated;
select pg_temp.assert((select count(*)=0 from public.fitness_points_confirmations),'No confirmation written');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=312,'Automatic 35-day total; today wellbeing pending');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=35,'Automatic streak');
select pg_temp.assert((public.get_fitness_points()->>'registered_days')::int=35,'Recorded days, no manual declarations');
select pg_temp.assert((public.get_fitness_points()->'day'->>'registered')::boolean,'Today registered from three valid slots');
select pg_temp.assert(not (public.get_fitness_points()->'day' ? 'confirmed'),'Public API uses registered state');
select pg_temp.assert((select bool_and((a->>'points')::int=0 and a->'detail'->>'status'='pending') from jsonb_array_elements(public.get_fitness_points()->'day'->'awards')a where a->>'kind' in ('habit','penalty')),'All daily and checkpoint wellbeing pending until day end');
select pg_temp.assert((select (a->>'points')::int=3 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-28)->'day'->'awards')a where a->>'key'='legumes'),'Finished checkpoint scored automatically');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=312,'Repeated reads never duplicate awards');
reset role;
insert into public.workouts(user_id,date,activity,duration_min,distance_km) values
('00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'running',30,5);
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=4 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards')a where a->>'kind'='activity'),'Activity scores immediately during the day');
reset role;
insert into public.gym_sessions(id,user_id,date,plan_name,started_at,completed_at) values
('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'Forza',now()-interval '2 hours',now()-interval '1 hour');
insert into public.gym_sets(session_id,exercise_key,exercise_name,equipment,weight_kg,per_side,done,reps)
select id,'push_up','Piegamenti','Corpo libero',0,false,true,10 from public.gym_sessions;
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=3 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards')a where a->>'kind'='gym'),'Gym scores immediately on completion');
reset role;
delete from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='lunch';
set local role authenticated;
select pg_temp.assert(not (public.get_fitness_points()->'day'->>'registered')::boolean,'Deleting a slot removes diary credit automatically');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=34,'Pending today preserves yesterday streak');
select pg_temp.assert((public.get_fitness_points()->'day'->>'points')::int=7,'Movement points independent from diary completeness');
reset role;
insert into public.meals(user_id,date,meal_type) values ('00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'lunch');
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,400,'g','vegetable',10,20,1 from public.meals m where date=(now() at time zone 'Europe/Rome')::date and meal_type='lunch';
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->'day'->>'registered')::boolean,'Restoring a slot restores points with no confirmation');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=35,'Streak restored automatically');
reset role;
update public.meal_items i set salt_g=10 where i.meal_id in (select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=0 and a->'detail'->>'status'='pending' from jsonb_array_elements(public.get_fitness_points()->'day'->'awards')a where a->>'key'='salt'),'Current-day excess waits for day close');
reset role;
update public.meal_items i set salt_g=10 where i.meal_id in (select id from public.meals where date=(now() at time zone 'Europe/Rome')::date-1 and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=-1 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-1)->'day'->'awards')a where a->>'key'='salt'),'Past-day correction recalculates penalties automatically');
reset role;
update public.meal_items i set sugars_g=null where i.meal_id in (select id from public.meals where date=(now() at time zone 'Europe/Rome')::date-2 and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=0 and a->'detail'->>'status'='incomplete' from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-2)->'day'->'awards')a where a->>'key'='sugars'),'Incomplete nutrients remain unknown on settled days');
reset role;
-- Same date is open in UTC-12 and closed in UTC+14. This exercises period
-- settlement independently of the wall-clock hour at which tests run.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select public.get_fitness_points() is not null;
reset role;
update public.fitness_points_settings set timezone='Etc/GMT+12',started_on=(now() at time zone 'Etc/GMT+12')::date-6 where user_id='00000000-0000-0000-0000-000000000002';
insert into public.meals(user_id,date,meal_type)
select '00000000-0000-0000-0000-000000000002',(now() at time zone 'Etc/GMT+12')::date,t from unnest(array['breakfast','lunch','dinner'])t;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,case m.meal_type when 'breakfast' then 360 when 'lunch' then 400 else 100 end,'g',
  case m.meal_type when 'breakfast' then 'fruit' when 'lunch' then 'vegetable' else 'grain' end,10,20,1
from public.meals m where user_id='00000000-0000-0000-0000-000000000002';
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,v.grams,'g',v.category,0,0,0 from public.meals m,(values(450,'legume'),(300,'fish'))v(grams,category)
where user_id='00000000-0000-0000-0000-000000000002' and meal_type='dinner';
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'total')::int=2,'Open checkpoint day has only diary points');
reset role;
update public.fitness_points_settings set timezone='Etc/GMT-14' where user_id='00000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'total')::int=14,'Daily and weekly wellbeing settle with no confirmation or award job');
select pg_temp.assert((public.get_fitness_points()->>'registered_days')::int=1,'Other account diary remains private');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=2 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-32)->'day'->'awards')a where a->>'key'='streak'),'1.5-point streak bonus rounded to two');
select pg_temp.assert((select bool_and((d->>'points')::int=(select sum((a->>'points')::int) from jsonb_array_elements(d->'awards')a)) from jsonb_array_elements(public.get_fitness_points()->'history')d),'Daily scores equal the sum of rounded award rows');
reset role;
update public.meal_items i set salt_g=5.5 where i.meal_id in (select id from public.meals where user_id='00000000-0000-0000-0000-000000000001' and date=(now() at time zone 'Europe/Rome')::date-1 and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=-1 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-1)->'day'->'awards')a where a->>'key'='salt'),'Negative half-point rounded away from zero');
reset role;
update public.meal_items i set salt_g=3.1 where i.meal_id in (select id from public.meals where user_id='00000000-0000-0000-0000-000000000001' and date=(now() at time zone 'Europe/Rome')::date-1 and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=0 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-1)->'day'->'awards')a where a->>'key'='salt'),'Sub-half-point deduction rounds to zero');
reset role;
insert into public.workouts(user_id,date,activity,duration_min,distance_km)
select '00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'running',120,20 from generate_series(1,3);
set local role authenticated;
select pg_temp.assert((select sum((a->>'points')::int)=12 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards')a where a->>'kind' in ('activity','gym')),'Shared movement cap is twelve points');
select pg_temp.assert((public.get_fitness_points()->'day'->>'movement_raw')::numeric>12,'Raw movement uses the new point unit');
reset role;
rollback;
\echo 'Scaled scoring checks passed'
