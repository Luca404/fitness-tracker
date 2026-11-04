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
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
insert into auth.users select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4)n;
insert into public.user_health_profiles(user_id,age,sex,weight_kg,created_at) values
  ('00000000-0000-0000-0000-000000000001',30,'female',70,'2026-01-01'),
  ('00000000-0000-0000-0000-000000000002',40,'male',80,'2026-01-01');
insert into public.user_goals values ('00000000-0000-0000-0000-000000000002',2400);
-- An account already using points retains its settings and confirmations.
insert into public.fitness_points_settings(user_id,started_on,timezone,sugars_target,alcohol_target,reference_weight)
values ('00000000-0000-0000-0000-000000000001','2026-11-04','Pacific/Auckland',65,1,68);
insert into public.fitness_points_confirmations values ('00000000-0000-0000-0000-000000000001','2026-11-04','preserve',now());
\ir ../migrations/20261104130000_fitness_points_by_default.sql
select pg_temp.assert((select count(*)=2 from public.fitness_points_settings),'All existing fitness profiles initialized');
select pg_temp.assert((select count(*)=1 from public.fitness_points_confirmations where fingerprint='preserve'),'Old confirmations preserved');
select pg_temp.assert(not has_function_privilege('authenticated','public.fitness_points_summary(date)','execute'),'Internal summary inaccessible');
select pg_temp.assert(not has_function_privilege('anon','public.get_fitness_points(date)','execute'),'Anonymous read denied');
select pg_temp.assert(has_function_privilege('authenticated','public.get_fitness_points(date)','execute'),'Explicit authenticated grant');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'enabled')::boolean,'Existing activated account remains active');
select pg_temp.assert((select timezone='Pacific/Auckland' and sugars_target=65 and reference_weight=68 from public.fitness_points_settings),'Old targets and timezone unchanged');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.assert((public.get_fitness_points()->>'enabled')::boolean,'Unactivated existing account is active');
select pg_temp.assert((public.get_fitness_points()->>'started_on')::date='2026-11-04','Existing accounts start at rollout');
select pg_temp.assert((public.get_fitness_points()->>'sugars_target')::numeric=90,'Personal targets from saved goals');
select pg_temp.assert((public.get_fitness_points()->>'total')::int=0,'Empty diary gives no reward');
reset role;
-- Profile and goals created after rollout; no activation API involved.
insert into public.user_health_profiles(user_id,age,sex,weight_kg)
values ('00000000-0000-0000-0000-000000000003',35,'female',60);
insert into public.user_goals values ('00000000-0000-0000-0000-000000000003',1800);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select pg_temp.assert((public.get_fitness_points()->>'enabled')::boolean,'Future accounts active on first read');
select pg_temp.assert((public.get_fitness_points()->>'sugars_target')::numeric=67.5,'New account initialized after onboarding goals');
select pg_temp.assert((select count(*)=1 from public.fitness_points_settings),'Repeated reads remain idempotent and owner-scoped');
select public.enable_fitness_points('UTC');
select pg_temp.assert((select timezone='Europe/Rome' from public.fitness_points_settings),'Legacy client cannot reset defaults');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$ begin
  begin perform public.get_fitness_points(); raise exception 'Account without health profile initialized';
    exception when raise_exception then if sqlerrm='Account without health profile initialized' then raise; end if; end;
end $$;
select pg_temp.assert((select count(*)=0 from public.fitness_points_settings),'Accounts from other Trackrs apps not enrolled');
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.get_fitness_points(); raise exception 'Anonymous context accepted';
    exception when raise_exception then if sqlerrm='Anonymous context accepted' then raise; end if; end;
end $$;
rollback;
\echo 'Default fitness points checks passed'
