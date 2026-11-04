-- Self-contained fixture; NEVER run on an application or hosted database.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'fittrackr_gamification_test_%' then
    raise exception 'Use an isolated fittrackr_gamification_test_* database';
  end if;
end $$;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I',r); end if;
  end loop;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth, public to authenticated;
grant execute on function auth.uid() to authenticated;
alter default privileges in schema public revoke execute on functions from public;
create table public.user_health_profiles(user_id uuid primary key, age int, sex text, weight_kg float8);
create table public.user_goals(user_id uuid primary key, calorie_target int);
create table public.meals(id uuid primary key default gen_random_uuid(),user_id uuid,date date,meal_type text);
create table public.meal_items(id uuid primary key default gen_random_uuid(),meal_id uuid references public.meals on delete cascade,
  quantity_g float8,unit text,category text,alcohol_abv float8,fiber_g float8,sugars_g float8,salt_g float8);
create table public.workouts(id uuid primary key default gen_random_uuid(),user_id uuid,date date,activity text,duration_min int,distance_km float8);
create table public.gym_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,date date,plan_name text,started_at timestamptz,completed_at timestamptz);
create table public.gym_sets(id uuid primary key default gen_random_uuid(),session_id uuid references public.gym_sessions on delete cascade,
  exercise_key text,exercise_name text,equipment text,weight_kg numeric,per_side boolean,done boolean,reps int);
\ir ../migrations/20261104120000_fitness_gamification.sql
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
insert into public.user_health_profiles values ('00000000-0000-0000-0000-000000000001',30,'female',70),('00000000-0000-0000-0000-000000000002',40,'male',80);
insert into public.user_goals values ('00000000-0000-0000-0000-000000000001',2000);
select pg_temp.assert(not has_function_privilege('anon','public.get_fitness_points(date)','execute'),'Anonymous RPC denied');
select pg_temp.assert(not has_function_privilege('authenticated','public.fitness_points_days()','execute'),'Internal scorer inaccessible');
select pg_temp.assert(not has_function_privilege('authenticated','public.fitness_points_met(text,numeric,numeric)','execute'),'Internal MET inaccessible');
select pg_temp.assert(not has_table_privilege('authenticated','public.fitness_points_confirmations','insert'),'No client points/confirmation writes');
select pg_temp.assert(has_function_privilege('authenticated','public.get_fitness_points(date)','execute'),'Explicit authenticated grant');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert(public.get_fitness_points() = '{"enabled":false}'::jsonb,'Opt in required');
select public.enable_fitness_points('Europe/Rome');
select public.enable_fitness_points('Pacific/Auckland');
select pg_temp.assert((select timezone = 'Europe/Rome' from public.fitness_points_settings),'Idempotent activation/fixed timezone');
select pg_temp.assert((public.get_fitness_points()->>'total')::int = 0,'Empty day gives no points including no alcohol bonus');
do $$ begin
  begin perform public.confirm_fitness_points_day(current_date,true); raise exception 'Empty day accepted';
    exception when raise_exception then if sqlerrm = 'Empty day accepted' then raise; end if; end;
  begin perform public.enable_fitness_points('Invalid/Zone'); raise exception 'Invalid timezone accepted';
    exception when raise_exception then if sqlerrm = 'Invalid timezone accepted' then raise; end if; end;
end $$;
reset role;
-- History setup is privileged fixture work; clients cannot backdate activation.
update public.fitness_points_settings set started_on = (now() at time zone timezone)::date - 34;
insert into public.meals(user_id,date,meal_type)
select s.user_id,s.started_on+n,t from public.fitness_points_settings s,
  generate_series(-1,35) n,unnest(array['breakfast','lunch','dinner']) t;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,case m.meal_type when 'breakfast' then 360 when 'lunch' then 400 else 100 end,'g',
  case m.meal_type when 'breakfast' then 'fruit' when 'lunch' then 'vegetable' else 'grain' end,10,20,1 from public.meals m;
insert into public.meal_items(meal_id,quantity_g,unit,category,fiber_g,sugars_g,salt_g)
select m.id,v.grams,'g',v.category,0,0,0 from public.meals m join public.fitness_points_settings s on m.user_id=s.user_id and m.date=s.started_on,
  (values (450,'legume'),(300,'fish')) v(grams,category) where m.meal_type='dinner';
set local role authenticated;
do $$ declare d date; begin
  for d in select generate_series(started_on, (now() at time zone timezone)::date,'1 day')::date from public.fitness_points_settings loop
    perform public.confirm_fitness_points_day(d,true);
    perform public.confirm_fitness_points_day(d,true);
  end loop;
end $$;
select pg_temp.assert((public.get_fitness_points()->>'total')::int = 3175,'35 days daily, streak, weekly totals; no duplicate awards or future/backfill points');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int = 35,'Current streak');
select pg_temp.assert((public.get_fitness_points()->>'best_streak')::int = 35,'Best streak');
select pg_temp.assert(jsonb_array_length(public.get_fitness_points()->'history')=30,'History is paginated');
select pg_temp.assert((public.get_fitness_points()->>'has_older')::boolean,'Older history available');
do $$ begin
  begin perform public.confirm_fitness_points_day(current_date,false); raise exception 'Missing drinks accepted';
    exception when raise_exception then if sqlerrm = 'Missing drinks accepted' then raise; end if; end;
end $$;
reset role;
-- Invalidation on quantity edit, plus proportional excess on a partial source.
update public.meal_items i set salt_g=8 where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='dinner');
set local role authenticated;
select pg_temp.assert(not (public.get_fitness_points()->'day'->>'confirmed')::boolean,'Editing invalidates confirmation');
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=34,'Today pending preserves yesterday streak');
select pg_temp.assert((select (a->>'points')::int=-10 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='salt'),'Double salt limit costs ten');
select public.confirm_fitness_points_day((now() at time zone 'Europe/Rome')::date,true);
reset role;
update public.meal_items i set sugars_g=null,alcohol_abv=null,category='alcohol',unit='ml' where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='dinner');
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->'day'->>'meal_count')::int=2,'Only drinks in a meal slot are insufficient');
select pg_temp.assert((select a->'detail'->>'status'='incomplete' from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='alcohol'),'Unknown ABV cannot prove limit');
reset role;
update public.meal_items i set sugars_g=20,alcohol_abv=null,category='grain',unit='g',salt_g=1 where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='dinner');
update public.meal_items i set sugars_g=null,fiber_g=null where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='dinner');
set local role authenticated;
select public.confirm_fitness_points_day((now() at time zone 'Europe/Rome')::date,true);
select pg_temp.assert((select (a->>'points')::int=0 and a->'detail'->>'status'='incomplete' from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='sugars'),'Confirmation does not fill missing nutrients');
select pg_temp.assert((select (a->>'points')::int=0 and a->'detail'->>'status'='incomplete' from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='fiber'),'Partial fibre below target is unknown');
reset role;
update public.meal_items i set fiber_g=30,sugars_g=100 where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date and meal_type='breakfast');
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=10 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='fiber'),'Partial fibre can prove a minimum');
select pg_temp.assert((select (a->>'points')::int=-6 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'key'='sugars'),'Partial sugars can prove excess; proportional ceil');
reset role;
update public.meal_items i set fiber_g=10,sugars_g=20 where i.meal_id in (
  select id from public.meals where date=(now() at time zone 'Europe/Rome')::date);
-- MET speed bands and invalid values.
select pg_temp.assert(public.fitness_points_met('running',30,5)=9.3,'Distance estimates intensity');
select pg_temp.assert(public.fitness_points_met('walking',30,50)=0,'Implausible speed excluded');
select pg_temp.assert(public.fitness_points_met('unknown',30,null)=0,'Unknown activity excluded');
select pg_temp.assert(public.fitness_points_met('walking',30,'NaN')=0,'Nonfinite distance excluded');
-- A 30min 5km run = 30*9.3/10+5*2 = 37.9, rounded to 38.
insert into public.workouts(user_id,date,activity,duration_min,distance_km) values
  ('00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'running',30,5);
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=38 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'kind'='activity'),'Per-activity points');
reset role;
-- Split into two equal sessions: rounding once per day avoids farming.
delete from public.workouts;
insert into public.workouts(user_id,date,activity,duration_min,distance_km)
select '00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'running',15,2.5 from generate_series(1,2);
set local role authenticated;
select pg_temp.assert((select sum((a->>'points')::int)=38 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'kind'='activity'),'Splitting does not create rounding bonus');
reset role;
insert into public.workouts(user_id,date,activity,duration_min,distance_km)
select '00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'running',120,20 from generate_series(1,3);
set local role authenticated;
select pg_temp.assert((select sum((a->>'points')::int)=120 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'kind'='activity'),'Daily movement cap');
reset role;
delete from public.workouts;
insert into public.gym_sessions(id,user_id,date,plan_name,started_at,completed_at) values
  ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'Forza',now()-interval '2 hours',now()-interval '1 hour'),
  ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'Sovrapposto',now()-interval '90 minutes',now()-interval '1 hour'),
  ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'Aperto',now(),null),
  ('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date,'Senza serie',now()-interval '1 hour',now());
insert into public.gym_sets(session_id,exercise_key,exercise_name,equipment,weight_kg,per_side,done,reps)
select id,'push_up','Piegamenti','Corpo libero',0,false,true,10 from public.gym_sessions where plan_name<>'Senza serie';
set local role authenticated;
select pg_temp.assert((select count(*)=1 and sum((a->>'points')::int)=30 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'kind'='gym'),'Completed gym points; open, empty, overlap excluded (60min,210kcal -> 30PT)');
reset role;
delete from public.gym_sessions;
set local role authenticated;
select pg_temp.assert(not exists (select 1 from jsonb_array_elements(public.get_fitness_points()->'day'->'awards') a where a->>'kind'='gym'),'Deleting session removes points');
select public.confirm_fitness_points_day((now() at time zone 'Europe/Rome')::date,true);
reset role;
delete from public.meals where meal_type='breakfast' and date=(now() at time zone 'Europe/Rome')::date-32;
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'streak')::int=32,'Deleting an old meal recalculates all later streaks');
select pg_temp.assert((public.get_fitness_points()->>'registered_days')::int=34,'Deleting an old meal invalidates that day');
reset role;
update public.meal_items set quantity_g=1 where category='legume';
set local role authenticated;
select pg_temp.assert((select (a->>'points')::int=0 from jsonb_array_elements(public.get_fitness_points((now() at time zone 'Europe/Rome')::date-28)->'day'->'awards') a where a->>'key'='legumes'),'Weekly correction removes its checkpoint award');
-- Account isolation in RPCs and protected tables.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.assert(public.get_fitness_points()='{"enabled":false}'::jsonb,'Other account cannot read points');
select pg_temp.assert((select count(*)=0 from public.fitness_points_confirmations),'Confirmation RLS');
select pg_temp.assert((select count(*)=0 from public.fitness_points_settings),'Settings RLS');
select public.enable_fitness_points('UTC');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=0,'New account gets no other account sources');
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.get_fitness_points(); raise exception 'Anonymous context accepted';
    exception when raise_exception then if sqlerrm='Anonymous context accepted' then raise; end if; end;
end $$;
rollback;
\echo 'Fitness gamification SQL checks passed'
