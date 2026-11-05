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

-- Already registered users are backfilled; shared non-fitness Auth stays out.
insert into auth.users values
('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),
('00000000-0000-0000-0000-000000000003'),('00000000-0000-0000-0000-000000000004');
insert into public.user_health_profiles(user_id,age,sex,weight_kg) values
('00000000-0000-0000-0000-000000000001',30,'female',70),
('00000000-0000-0000-0000-000000000002',30,'male',80);
\ir ../migrations/20261105150000_fitness_leaderboard.sql
select pg_temp.assert((select count(*)=2 from public.fitness_usernames),'Only fitness profiles backfilled');
select pg_temp.assert((select bool_and(username ~ '^user[0-9]{9}$') from public.fitness_usernames),'Automatic random names');
insert into public.user_health_profiles(user_id,age,sex,weight_kg) values
('00000000-0000-0000-0000-000000000004',40,'female',65);
select pg_temp.assert((select count(*)=3 from public.fitness_usernames),'New profile trigger');
select pg_temp.assert(not has_function_privilege('anon','public.get_fitness_leaderboard(integer,integer)','execute'),'No anonymous leaderboard');
select pg_temp.assert(not has_function_privilege('authenticated','public.fitness_points_days_for_user(uuid)','execute'),'No private scorer access');
select pg_temp.assert(not has_function_privilege('authenticated','public.assign_fitness_username()','execute'),'No trigger RPC');
select pg_temp.assert(not has_table_privilege('authenticated','public.fitness_usernames','update'),'No direct username updates');
select pg_temp.assert(has_function_privilege('authenticated','public.set_fitness_username(text)','execute'),'Explicit rename grant');
insert into public.workouts(user_id,date,activity,duration_min)
select user_id,(now() at time zone 'Europe/Rome')::date,'running',60
from public.user_health_profiles where user_id in ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((select count(*)=1 from public.fitness_usernames),'Owner-only username reads');
select pg_temp.assert(public.set_fitness_username('  Runner_1  ')='runner_1','Name normalized server-side');
select pg_temp.assert((public.get_fitness_leaderboard()->>'total_users')::int=3,'Every fitness account included, finance excluded');
select pg_temp.assert((public.get_fitness_leaderboard()->'me'->>'total')::int=(public.get_fitness_points()->>'total')::int,'Same canonical total as own recap');
select pg_temp.assert((public.get_fitness_leaderboard()->'me'->>'rank')::int=1,'Leading rank');
select pg_temp.assert((public.get_fitness_leaderboard()->'entries'->1->>'rank')::int=1,'Equal points equal rank');
select pg_temp.assert((public.get_fitness_leaderboard()->'entries'->2->>'rank')::int=3,'Competition rank after tie');
select pg_temp.assert(jsonb_array_length(public.get_fitness_leaderboard(1,0)->'entries')=1,'Page size');
select pg_temp.assert((public.get_fitness_leaderboard(1,0)->>'has_more')::boolean,'More pages');
select pg_temp.assert(not(public.get_fitness_leaderboard(1,2)->>'has_more')::boolean,'Last page');
select pg_temp.assert(public.get_fitness_leaderboard(1,2)->'me'->>'username'='runner_1','Own position outside current page');
select pg_temp.assert(public.get_fitness_leaderboard()->'me' ?& array['username','total','rank','is_me'],'Public fields');
select pg_temp.assert((select count(*)=4 from jsonb_object_keys(public.get_fitness_leaderboard()->'me')),'No UUID, health or email fields');
select pg_temp.assert(auth.uid()='00000000-0000-0000-0000-000000000001','Caller identity unchanged');
do $$ declare name text; begin
  foreach name in array array['ab','has space','with-dash','ééé',repeat('a',25),''] loop
    begin perform public.set_fitness_username(name); raise exception 'Accepted invalid name %',name;
    exception when invalid_parameter_value then null; end;
  end loop;
  begin perform public.get_fitness_leaderboard(101,0); raise exception 'Unbounded limit';
  exception when invalid_parameter_value then null; end;
  begin perform public.get_fitness_leaderboard(1,-1); raise exception 'Negative offset';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
  begin perform public.set_fitness_username('RUNNER_1'); raise exception 'Duplicate accepted';
  exception when unique_violation then null; end;
end $$;
select pg_temp.assert((select username<>'runner_1' from public.fitness_usernames),'Duplicate failure retains old name');
select public.set_fitness_username('other_runner');
reset role;
-- Source edits immediately rerank without a refresh job or cached old award.
delete from public.workouts where user_id='00000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert((public.get_fitness_leaderboard()->'me'->>'total')::int=0,'Source deletion recalculated');
select pg_temp.assert((public.get_fitness_leaderboard()->'me'->>'rank')::int=2,'Rerank after deletion');
select pg_temp.assert(public.get_fitness_leaderboard()->'entries'->0->>'username'='other_runner','Other user score independent of caller');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$ begin
  begin perform public.get_fitness_leaderboard(); raise exception 'Shared-only Auth allowed';
  exception when raise_exception then if sqlerrm <> 'Completa prima il profilo' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
  begin perform public.get_fitness_leaderboard(); raise exception 'No subject allowed';
  exception when raise_exception then if sqlerrm <> 'Accesso richiesto' then raise; end if; end;
end $$;
reset role;
delete from public.user_health_profiles where user_id='00000000-0000-0000-0000-000000000004';
select pg_temp.assert((select count(*)=2 from public.fitness_usernames),'Profile deletion cascades');
rollback;
\echo 'Fitness leaderboard SQL checks passed'
