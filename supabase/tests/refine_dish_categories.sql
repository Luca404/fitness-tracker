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
update public.dishes set categories=array['pasta','legumes','dairy'] where name='Pasta esistente';
update public.dishes set categories=array['pizza','eggs'] where name='Privato';
\ir ../migrations/20261105220000_refine_dish_categories.sql
select pg_temp.assert((select name='Pasta esistente' and categories=array['pasta'] and cardinality(meal_types)=4 from public.dishes where id='10000000-0000-0000-0000-000000000001'),'Only retired labels removed; recipe metadata preserved');
select pg_temp.assert((select categories='{}' from public.dishes where name='Privato'),'Retired-only recipe remains uncategorized');
select pg_temp.assert((select count(*)=2 from public.dishes),'No recipe removed');
select pg_temp.assert(not has_function_privilege('anon','public.create_dish_with_categories(uuid,text,jsonb,text[],text[])','execute'),'Anonymous create remains denied');
select pg_temp.assert(not has_function_privilege('anon','public.update_dish_with_categories(uuid,text,jsonb,text[],text[])','execute'),'Anonymous update remains denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select pg_temp.assert(public.create_dish_with_categories(auth.uid(),'Polpette vegane','[]',array['lunch','dinner'],array['vegan_main'])->'categories'='["vegan_main"]','Vegan main is accepted');
select pg_temp.assert(public.create_dish_with_categories(auth.uid(),'Bowl yogurt','[]',array['snack'],array['yogurt'])->'categories'='["yogurt"]','Yogurt is accepted');
select pg_temp.assert(public.create_dish_with_categories(auth.uid(),'Vecchio client','[]',array['lunch'],array['pizza','pasta','eggs','dairy','legumes'])->'categories'='["pasta"]','Old client can save without reintroducing retired labels');
select pg_temp.assert(public.update_dish_with_categories('10000000-0000-0000-0000-000000000001','Ricetta aggiornata','[]',array['dinner'],array['yogurt','dairy'])->'categories'='["yogurt"]','Old update labels normalized too');
select public.update_dish_with_categories('10000000-0000-0000-0000-000000000001','Ricetta aggiornata','[]',array['dinner']);
select pg_temp.assert((select categories=array['yogurt'] from public.dishes where name='Ricetta aggiornata'),'Four-argument update preserves current labels');
do $$ begin
  begin update public.dishes set categories=array['pizza'] where name='Ricetta aggiornata'; raise exception 'Retired direct write accepted';
  exception when check_violation then null; end;
  begin perform public.update_dish_with_categories('10000000-0000-0000-0000-000000000001','Invalid','[]',array['dinner'],array['unknown']); raise exception 'Unknown category accepted';
  exception when invalid_parameter_value then null; end;
  begin perform public.update_dish_with_categories('10000000-0000-0000-0000-000000000002','Other user','[]',array['dinner'],array['vegan_main']); raise exception 'Other owner modified';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.assert((select count(*)=1 from public.dishes where name='Ricetta aggiornata'),'Invalid update is atomic');
reset role;
select pg_temp.assert((select name='Privato' and categories='{}' from public.dishes where id='10000000-0000-0000-0000-000000000002'),'Other account recipe unchanged by owner updates');
rollback;
\echo 'Refined dish categories checks passed'
