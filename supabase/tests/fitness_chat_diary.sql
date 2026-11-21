-- Run against an isolated fittrackr_chat_test_* database with fitness migrations applied.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database() not like 'fittrackr_chat_test_%' then
    raise exception 'Use an isolated fittrackr_chat_test_* database';
  end if;
end $$;

insert into auth.users(id) values ('00000000-0000-0000-0000-000000000091'), ('00000000-0000-0000-0000-000000000092');
insert into public.user_goals(user_id, calorie_target, protein_g, carbs_g, fat_g) values
  ('00000000-0000-0000-0000-000000000091', 2000, 120, 210, 60),
  ('00000000-0000-0000-0000-000000000092', 3000, 200, 240, 90);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000091', true);
do $$
declare
  req uuid := '10000000-0000-4000-8000-000000000091';
  batch_req uuid := '10000000-0000-4000-8000-000000000092';
  items jsonb := '[{"food_name":"Riso basmati cotto","quantity_g":150,"unit":"g","category":"grain","food_key":"basic:riso-basmati","calories":178,"protein_g":4.45,"carbs_g":38.9,"fat_g":0.45,"source":"basic"}]';
  first_receipt jsonb;
  receipt jsonb;
  summary jsonb;
  batch_id uuid;
begin
  if has_function_privilege('anon', 'public.get_fitness_chat_diary(date,date,boolean)', 'execute')
    or has_function_privilege('anon', 'public.record_fitness_chat_meal(uuid,date,text,text,jsonb,uuid,uuid,numeric)', 'execute') then
    raise exception 'anonymous chat RPC execution must be denied';
  end if;
  first_receipt := public.record_fitness_chat_meal(req, '2026-01-05', 'lunch', 'Riso basmati cotto', items, null, null, null);
  receipt := public.record_fitness_chat_meal(req, '2026-01-06', 'snack', 'Retry with a changed body', items, null, null, null);
  if receipt <> first_receipt or (select count(*) from public.meal_entries) <> 1 then
    raise exception 'same request did not return the original entry';
  end if;
  summary := public.get_fitness_chat_diary('2026-01-05', '2026-01-07', true);
  if (summary->>'days_logged')::int <> 1 or (summary->>'days_in_range')::int <> 3
    or (summary->'daily_average'->>'calories')::numeric <> 178
    or (summary->'current_targets'->>'protein_g')::numeric <> 120
    or summary->'entries'->0->>'name' <> 'Riso basmati cotto' then
    raise exception 'wrong summary or coverage: %', summary;
  end if;

  batch_id := (public.create_prepared_batch(auth.uid(), 'Preparazione chat', items, null, null, 300, 0, '2026-01-05', 'dinner')->>'id')::uuid;
  receipt := public.record_fitness_chat_meal(batch_req, '2026-01-05', 'dinner', null, null, null, batch_id, 100);
  if public.record_fitness_chat_meal(batch_req, '2026-01-05', 'dinner', null, null, null, batch_id, 100) <> receipt
    or (select remaining_g from public.prepared_batches where id = batch_id) <> 200 then
    raise exception 'prepared portion was applied twice';
  end if;

  perform public.delete_meal_entry((first_receipt->>'entry_id')::uuid);
  if public.record_fitness_chat_meal(req, '2026-01-05', 'lunch', 'Do not recreate', items, null, null, null) <> first_receipt
    or exists (select 1 from public.meal_entries where id = (first_receipt->>'entry_id')::uuid) then
    raise exception 'replaying a deleted entry recreated it';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000092', true);
  summary := public.get_fitness_chat_diary('2026-01-05', '2026-01-07', false);
  if (summary->>'days_logged')::int <> 0 or (summary->'current_targets'->>'protein_g')::numeric <> 200
    or exists (select 1 from public.fitness_chat_meal_receipts) then
    raise exception 'chat crossed account boundaries';
  end if;
  begin
    perform public.record_fitness_chat_meal(batch_req, '2026-01-05', 'dinner', null, null, null, batch_id, 100);
    raise exception 'another user consumed a prepared batch';
  exception when no_data_found then null;
  end;
  begin
    perform public.get_fitness_chat_diary('2026-01-05', '2026-01-15', true);
    raise exception 'detailed diary range validation failed';
  exception when invalid_parameter_value then null;
  end;
  receipt := public.record_fitness_chat_meal(req, '2026-01-05', 'lunch', 'Pranzo proprio', items, null, null, null);
  if receipt->>'entry_id' = first_receipt->>'entry_id' or receipt->>'name' <> 'Pranzo proprio' then
    raise exception 'request deduplication crossed accounts';
  end if;
end $$;
rollback;
\echo 'Sagebite diary checks passed'
