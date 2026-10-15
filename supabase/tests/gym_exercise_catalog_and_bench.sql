-- Self-contained test: use ONLY a fresh isolated fittrackr_gym_test_* database.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'fittrackr_gym_test_%' then
    raise exception 'Use a fresh isolated fittrackr_gym_test_* database';
  end if;
end $$;
do $$ declare role_name text; begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = role_name) then
      execute format('create role %I', role_name);
    end if;
  end loop;
end $$;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth, public to authenticated;
grant execute on function auth.uid() to authenticated;
-- Reproduce the shared project's restrictive defaults for future RPCs.
alter default privileges in schema public revoke execute on functions from public;
\ir ../migrations/20260929160000_gym_training_plans.sql
\ir ../migrations/20260929170000_gym_rep_ranges_and_sides.sql
\ir ../migrations/20261004154000_gym_plan_order.sql
grant select, insert, update, delete on all tables in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into public.gym_plans (id, user_id, name) values
  ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Old A'),
  ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','Old B');
insert into public.gym_plan_exercises (plan_id,position,exercise_name,equipment,target_sets,target_reps) values
  ('00000000-0000-0000-0000-000000000101',0,'Croci su panca','Manubri',3,10),
  ('00000000-0000-0000-0000-000000000102',0,'Privato B','Cavi',3,10);
insert into public.gym_sessions (id,user_id,plan_name,date,completed_at) values
  ('00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000001','Deleted plan','2026-10-01',now());
insert into public.gym_sets (session_id,exercise_position,exercise_name,equipment,set_number,target_reps) values
  ('00000000-0000-0000-0000-000000000201',0,' CROCI SU PANCA ','manubri',1,10),
  ('00000000-0000-0000-0000-000000000201',1,'Solo nello storico','Cavi',1,10);
\ir ../migrations/20261015120000_gym_exercise_catalog_and_bench.sql
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$
declare
  v_plan uuid;
  v_session uuid;
  v_first_session uuid;
  v_exercises jsonb := '[{"exercise_name":"Distensioni personalizzate","equipment":"Manubri","target_sets":2,"target_reps":8,"target_reps_max":12,"per_side":true,"bench_angle":30}]';
begin
  if (select count(*) from public.gym_custom_exercises) <> 2 then raise exception 'Backfill missing/deduplication/RLS failed'; end if;
  if not exists (select 1 from public.gym_custom_exercises where exercise_name = 'Solo nello storico') then raise exception 'History backfill missing'; end if;
  if exists (select 1 from public.gym_plan_exercises where bench_angle is not null) then raise exception 'Old unspecified angles changed'; end if;
  v_plan := public.save_gym_plan(auth.uid(),null,'New plan',v_exercises);
  perform public.save_gym_plan(auth.uid(),v_plan,'New plan',v_exercises);
  if (select count(*) from public.gym_custom_exercises) <> 3 then raise exception 'Custom save duplicated or missing'; end if;
  begin
    perform public.save_gym_plan(auth.uid(),v_plan,'Invalid update',
      '[{"exercise_name":"Invalid custom","equipment":"Cavi","target_sets":3,"target_reps":10,"bench_angle":91}]');
    raise exception 'Out-of-range angle accepted';
  exception when check_violation then null; end;
  begin
    perform public.save_gym_plan(auth.uid(),v_plan,'Invalid sets',
      '[{"exercise_name":"Invalid custom","equipment":"Cavi","target_sets":0,"target_reps":10}]');
    raise exception 'Invalid sets accepted';
  exception when check_violation then null; end;
  if (select name from public.gym_plans where id = v_plan) <> 'New plan'
    or (select bench_angle from public.gym_plan_exercises where plan_id = v_plan) <> 30
    or (select count(*) from public.gym_custom_exercises) <> 3 then raise exception 'Invalid update was not atomic'; end if;
  v_first_session := public.start_gym_session(auth.uid(),v_plan,'2026-10-15');
  if (select count(*) from public.gym_sets where session_id = v_first_session and bench_angle = 30 and per_side and target_reps_max = 12) <> 2 then raise exception 'Session snapshot incomplete'; end if;
  update public.gym_sets set done = true, weight_kg = 40, reps = 8 where session_id = v_first_session;
  update public.gym_sessions set completed_at = now() where id = v_first_session;
  perform public.save_gym_plan(auth.uid(),v_plan,'Flat plan',jsonb_set(v_exercises,'{0,bench_angle}','0'));
  v_session := public.start_gym_session(auth.uid(),v_plan,'2026-10-16');
  if exists (select 1 from public.gym_sets where session_id = v_session and (bench_angle <> 0 or weight_kg is not null)) then raise exception 'Different angle reused previous weight'; end if;
  update public.gym_sessions set completed_at = now() where id = v_session;
  perform public.save_gym_plan(auth.uid(),v_plan,'Cable plan',jsonb_set(v_exercises,'{0,equipment}','"Cavi"'));
  v_session := public.start_gym_session(auth.uid(),v_plan,'2026-10-17');
  if exists (select 1 from public.gym_sets where session_id = v_session and weight_kg is not null) then raise exception 'Different equipment reused previous weight'; end if;
  update public.gym_sessions set completed_at = now() where id = v_session;
  perform public.save_gym_plan(auth.uid(),v_plan,'Incline again',v_exercises);
  v_session := public.start_gym_session(auth.uid(),v_plan,'2026-10-18');
  if (select count(*) from public.gym_sets where session_id = v_session and weight_kg = 40 and reps = 8 and bench_angle = 30) <> 2 then raise exception 'Matching angle history not reused'; end if;
  delete from public.gym_plans where id = v_plan;
  if not exists (select 1 from public.gym_custom_exercises where exercise_name = 'Distensioni personalizzate' and equipment = 'Manubri') then raise exception 'Deleting plan removed reusable custom exercise'; end if;
  if not exists (select 1 from public.gym_sets where session_id = v_first_session and bench_angle = 30) then raise exception 'Editing/deleting plan rewrote history'; end if;
  -- Old clients can still omit bench_angle.
  v_plan := public.save_gym_plan(auth.uid(),null,'Legacy',
    '[{"exercise_key":"squat","exercise_name":"Squat","equipment":"Bilanciere","target_sets":3,"target_reps":10}]');
  if exists (select 1 from public.gym_plan_exercises where plan_id = v_plan and bench_angle is not null) then raise exception 'Legacy write changed unspecified angle'; end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
  if (select count(*) from public.gym_custom_exercises) <> 1 then raise exception 'Other user catalog exposed'; end if;
  begin
    insert into public.gym_custom_exercises(user_id,exercise_name,equipment)
    values ('00000000-0000-0000-0000-000000000001','Forbidden','Cavi');
    raise exception 'Foreign catalog insert accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_gym_plan(auth.uid(),v_plan,'Foreign plan',v_exercises);
    raise exception 'Foreign plan update accepted';
  exception when no_data_found then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.save_gym_plan('00000000-0000-0000-0000-000000000001',null,'Anonymous',v_exercises);
    raise exception 'Unauthenticated save accepted';
  exception when insufficient_privilege then null; end;
  if has_table_privilege('anon','public.gym_custom_exercises','select')
    or has_function_privilege('anon','public.save_gym_plan(uuid,uuid,text,jsonb)','execute')
    or has_function_privilege('anon','public.start_gym_session(uuid,uuid,date)','execute') then raise exception 'Anonymous access allowed'; end if;
  raise notice 'Gym SQL checks passed: backfill, deduplication, atomic save, angles, snapshots, previous weights, deletion, legacy clients, RLS and grants';
end $$;
rollback;
