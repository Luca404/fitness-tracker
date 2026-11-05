-- Isolated fixture only. Never run against application or hosted data.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'fittrackr_dish_test_%' then
    raise exception 'Use an isolated fittrackr_dish_test_* database';
  end if;
end $$;
do $$ declare r text; begin
  foreach r in array array['anon','authenticated'] loop
    if not exists(select 1 from pg_roles where rolname=r) then execute format('create role %I',r); end if;
  end loop;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth,public to authenticated;
grant execute on function auth.uid() to authenticated;
alter default privileges in schema public revoke execute on functions from public;
create table public.dishes(id uuid primary key default gen_random_uuid(),user_id uuid,name text,is_preparation boolean default false);
alter table public.dishes enable row level security;
create policy own_dishes on public.dishes using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.dishes to authenticated;
create table public.meals(id uuid primary key default gen_random_uuid(),user_id uuid,date date);
alter table public.meals enable row level security;
create policy own_meals on public.meals using(user_id=auth.uid());
create table public.prepared_batches(id uuid primary key, user_id uuid,source_dish_id uuid,snapshot_dish_id uuid);
alter table public.prepared_batches enable row level security;
create policy own_batches on public.prepared_batches using(user_id=auth.uid());
create table public.meal_entries(id uuid primary key default gen_random_uuid(),meal_id uuid references public.meals,dish_id uuid,prepared_batch_id uuid);
alter table public.meal_entries enable row level security;
create policy own_entries on public.meal_entries using(exists(select 1 from public.meals where id=meal_id and user_id=auth.uid()));
grant select on public.meals,public.meal_entries,public.prepared_batches to authenticated;
-- Minimal lower-level fixture: existing recipe RPC behavior remains outside this migration.
create function public.create_dish_with_items(p_user_id uuid,p_name text,p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$ declare d public.dishes; begin
  if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'not authorized' using errcode='42501'; end if;
  insert into public.dishes(user_id,name) values(p_user_id,p_name) returning * into d;
  return to_jsonb(d);
end $$;
create function public.update_dish_with_items(p_dish_id uuid,p_name text,p_items jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$ declare d public.dishes; begin
  update public.dishes set name=p_name where id=p_dish_id and user_id=auth.uid() returning * into d;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  return to_jsonb(d);
end $$;
grant execute on function public.create_dish_with_items(uuid,text,jsonb),public.update_dish_with_items(uuid,text,jsonb) to authenticated;
\ir ../migrations/20260924200000_dish_meal_categories.sql
insert into public.dishes(id,user_id,name) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Pasta esistente'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','Privato');
\ir ../migrations/20261105210000_dish_secondary_categories_and_usage.sql
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAILED: %',message; end if; end $$;
select pg_temp.assert((select categories='{}' from public.dishes where name='Pasta esistente'),'Existing dishes start uncategorized');
select pg_temp.assert(not has_function_privilege('anon','public.get_recent_dish_usage()','execute'),'No anonymous usage');
select pg_temp.assert(not has_function_privilege('anon','public.create_dish_with_categories(uuid,text,jsonb,text[],text[])','execute'),'No anonymous create');
select pg_temp.assert(not has_function_privilege('anon','public.update_dish_with_categories(uuid,text,jsonb,text[],text[])','execute'),'No anonymous update');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert(public.create_dish_with_categories(auth.uid(),'Pasta e verdure','[]',array['lunch','dinner'],array['pasta','vegetables'])->'categories'='["pasta","vegetables"]','Multiple independent secondary categories');
select pg_temp.assert((select meal_types=array['lunch','dinner'] and categories=array['pasta','vegetables'] from public.dishes where name='Pasta e verdure'),'Categories persist with meal types');
select public.update_dish_with_categories((select id from public.dishes where name='Pasta e verdure'),'Ricetta aggiornata','[]',array['lunch']);
select pg_temp.assert((select categories=array['pasta','vegetables'] from public.dishes where name='Ricetta aggiornata'),'Old update keeps existing secondary categories');
select pg_temp.assert(public.update_dish_with_categories((select id from public.dishes where name='Ricetta aggiornata'),'Ricetta aggiornata','[]',array['lunch'],array[]::text[])->'categories'='[]','Categories can be cleared');
select pg_temp.assert(public.create_dish_with_categories(auth.uid(),'Ricetta vecchio client','[]',array['lunch'])->'categories'='[]','Old create remains supported');
do $$ declare cats text[]; begin
  foreach cats slice 1 in array array[array['invalid'],array[null::text]] loop
    begin perform public.create_dish_with_categories(auth.uid(),'Non deve esistere','[]',array['lunch'],cats);
      raise exception 'Invalid category accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  begin perform public.update_dish_with_categories('10000000-0000-0000-0000-000000000002','Cross account','[]',array['lunch'],array['rice']);
    raise exception 'Cross account accepted'; exception when insufficient_privilege then null; end;
  begin perform public.create_dish_with_categories('00000000-0000-0000-0000-000000000002','Cross account','[]',array['lunch'],array['rice']);
    raise exception 'Cross create accepted'; exception when insufficient_privilege then null; end;
end $$;
select pg_temp.assert((select count(*)=0 from public.dishes where name='Non deve esistere'),'Invalid save is atomic');
reset role;
insert into public.dishes(id,user_id,name,is_preparation) values('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Snapshot',true);
insert into public.prepared_batches values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004');
insert into public.meals(id,user_id,date)
select ('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001',(now() at time zone 'Europe/Rome')::date+delta
from (values(1,0),(2,-29),(3,-30),(4,1))t(n,delta);
insert into public.meal_entries(meal_id,dish_id)
select id,'10000000-0000-0000-0000-000000000001' from public.meals;
insert into public.meal_entries(meal_id,dish_id,prepared_batch_id)
select id,'10000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001' from public.meals
where date=(now() at time zone 'Europe/Rome')::date;
-- The other account's activity must not inflate user A's usage.
insert into public.meals(id,user_id,date) values('30000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002',(now() at time zone 'Europe/Rome')::date);
insert into public.meal_entries(meal_id,dish_id) values('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002');
set local role authenticated;
select pg_temp.assert((select recent_use_count=3 and last_used_on=(now() at time zone 'Europe/Rome')::date from public.get_recent_dish_usage() where dish_id='10000000-0000-0000-0000-000000000001'),'Last 30 days inclusive, prepared recipe counted, old/future excluded');
select pg_temp.assert((select count(*)=3 from public.get_recent_dish_usage()),'Only own regular recipes, including unused recipes');
select pg_temp.assert((select bool_and(recent_use_count=0 and last_used_on is null) from public.get_recent_dish_usage() where dish_id<>'10000000-0000-0000-0000-000000000001'),'Unused recipes retained');
reset role;
delete from public.meal_entries where prepared_batch_id is not null;
set local role authenticated;
select pg_temp.assert((select recent_use_count=2 from public.get_recent_dish_usage() where dish_id='10000000-0000-0000-0000-000000000001'),'Deleted diary entries recalculate usage');
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
set local role authenticated;
select pg_temp.assert((select count(*)=1 and sum(recent_use_count)=1 from public.get_recent_dish_usage()),'Account switch isolates usage');
reset role;
rollback;
\echo 'Dish categories and recent usage checks passed'
