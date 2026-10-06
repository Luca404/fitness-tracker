-- Run only in an isolated database after all repository migrations.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
  ('00000000-0000-0000-0000-000000000061'),
  ('00000000-0000-0000-0000-000000000062');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000061', true);
do $$
declare
  v_user uuid := auth.uid();
  v_items jsonb := '[{"food_name":"Riso test","quantity_g":300,"unit":"g","category":"grain","calories":1200,"protein_g":30,"carbs_g":240,"fat_g":12,"fiber_g":6,"sugars_g":null,"salt_g":1.2,"piece_count":3,"piece_size":"medium","source":"manual"}]';
  v_result jsonb;
  v_batch uuid;
  v_other uuid;
  v_unused uuid;
  v_entry1 uuid;
  v_entry2 uuid;
  v_entry3 uuid;
  v_extra uuid;
  v_snapshot uuid;
  v_item1 uuid;
  v_saved jsonb;
  v_bad numeric;
begin
  if not has_function_privilege('authenticated', 'public.correct_prepared_batch_weight(uuid,numeric,numeric,numeric)', 'execute')
    or has_function_privilege('anon', 'public.correct_prepared_batch_weight(uuid,numeric,numeric,numeric)', 'execute') then
    raise exception 'Incorrect RPC grants';
  end if;
  v_result := public.create_prepared_batch(v_user, 'Weight correction', v_items, null, null, 1206, 0, '2026-10-01', 'lunch');
  v_batch := (v_result->>'id')::uuid;
  v_snapshot := (v_result->>'snapshot_dish_id')::uuid;
  v_saved := (select to_jsonb(di) from public.dish_items di where dish_id = v_snapshot);
  v_result := public.create_prepared_batch(v_user, 'Other preparation', v_items, null, null, 600, 100, '2026-10-01', 'lunch');
  v_other := (v_result->>'id')::uuid;
  v_result := public.consume_prepared_batch(v_batch, '2026-10-01', 'lunch', 300);
  v_entry1 := (v_result->'entry'->>'id')::uuid;
  v_item1 := (v_result->'entry'->'items'->0->>'id')::uuid;
  v_result := public.consume_prepared_batch(v_batch, '2026-10-02', 'dinner', 400);
  v_entry2 := (v_result->'entry'->>'id')::uuid;
  insert into public.meal_items(meal_id, entry_id, food_name, quantity_g, calories,
    protein_g, carbs_g, fat_g, is_customization, position)
  select meal_id, id, 'Extra', 10, 90, 0, 0, 10, true, 1
  from public.meal_entries where id = v_entry1 returning id into v_extra;

  v_result := public.correct_prepared_batch_weight(v_batch, 400, 506, 1206);
  if (v_result->>'total_cooked_g')::numeric <> 1100 or (v_result->>'remaining_g')::numeric <> 400 then
    raise exception 'Incorrect cooked yield';
  end if;
  if (select cooked_portion_g from public.meal_entries where id = v_entry1) <> 300
    or (select cooked_portion_g from public.meal_entries where id = v_entry2) <> 400 then
    raise exception 'Weighed portions changed';
  end if;
  if (select calories from public.meal_items where id = v_item1) <> 327
    or (select calories from public.meal_items where entry_id = v_entry2) <> 436
    or abs((select quantity_g from public.meal_items where id = v_item1) - 300.0 * 300 / 1100) > 0.000001
    or abs((select piece_count from public.meal_items where id = v_item1) - 3.0 * 300 / 1100) > 0.000001
    or (select protein_g from public.meal_items where id = v_item1) <> 8.2
    or (select fiber_g from public.meal_items where id = v_item1) <> 1.64
    or (select salt_g from public.meal_items where id = v_item1) <> 0.33
    or (select sugars_g from public.meal_items where id = v_item1) is not null then
    raise exception 'Historical nutrition not recalculated correctly';
  end if;
  if (select calories from public.meal_items where id = v_extra) <> 90
    or (select remaining_g from public.prepared_batches where id = v_other) <> 500
    or (select to_jsonb(di) from public.dish_items di where dish_id = v_snapshot) <> v_saved then
    raise exception 'Correction changed extras, another batch or source recipe';
  end if;

  -- Repeated correction uses the original snapshot, and future portions and
  -- deletions still use the corrected total and unchanged cooked ledger.
  perform public.correct_prepared_batch_weight(v_batch, 500.13, 400, 1100);
  if (select total_cooked_g from public.prepared_batches where id = v_batch) <> 1200.13 then
    raise exception 'Decimal weight lost';
  end if;
  perform public.correct_prepared_batch_weight(v_batch, 500, 500.13, 1200.13);
  if (select calories from public.meal_items where id = v_item1) <> 300 then
    raise exception 'Repeated correction compounded previous nutrition';
  end if;
  v_result := public.consume_prepared_batch(v_batch, '2026-10-03', 'lunch', 100);
  v_entry3 := (v_result->'entry'->>'id')::uuid;
  if (v_result->'entry'->'items'->0->>'calories')::numeric <> 100 then
    raise exception 'Future portion uses old total';
  end if;
  perform public.update_prepared_portion(v_entry3, 150);
  if (select remaining_g from public.prepared_batches where id = v_batch) <> 350 then
    raise exception 'Portion edit broke corrected remainder';
  end if;
  perform public.delete_meal_entry(v_entry3);
  if (select remaining_g from public.prepared_batches where id = v_batch) <> 500 then
    raise exception 'Portion delete broke corrected remainder';
  end if;

  begin
    perform public.correct_prepared_batch_weight(v_batch, 300, 506, 1206);
    raise exception 'Stale correction accepted';
  exception when serialization_failure then null; end;
  foreach v_bad in array array[null::numeric, -1, 'NaN'::numeric, 'Infinity'::numeric, 100000000] loop
    begin
      perform public.correct_prepared_batch_weight(v_batch, v_bad, 500, 1200);
      raise exception 'Invalid weight accepted: %', v_bad;
    exception when invalid_parameter_value then null; end;
  end loop;
  if (select remaining_g from public.prepared_batches where id = v_batch) <> 500
    or (select calories from public.meal_items where id = v_item1) <> 300 then
    raise exception 'Rejected correction changed data';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000062', true);
  begin
    perform public.correct_prepared_batch_weight(v_batch, 400, 500, 1200);
    raise exception 'Cross-user correction accepted';
  exception when no_data_found then null; end;
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  perform public.correct_prepared_batch_weight(v_batch, 0, 500, 1200);
  if (select total_cooked_g from public.prepared_batches where id = v_batch) <> 700
    or (select remaining_g from public.prepared_batches where id = v_batch) <> 0 then
    raise exception 'Zero remainder lost eaten portions';
  end if;
  perform public.close_prepared_batch(v_batch);
  begin
    perform public.correct_prepared_batch_weight(v_batch, 100, 0, 700);
    raise exception 'Closed batch correction accepted';
  exception when invalid_parameter_value then null; end;

  v_result := public.create_prepared_batch(v_user, 'Not eaten', v_items, null, null, 600, 0, '2026-10-01', 'lunch');
  v_unused := (v_result->>'id')::uuid;
  begin
    perform public.correct_prepared_batch_weight(v_unused, 0, 600, 600);
    raise exception 'Zero total accepted';
  exception when invalid_parameter_value then null; end;
  perform public.correct_prepared_batch_weight(v_unused, 450, 600, 600);
  if (select total_cooked_g from public.prepared_batches where id = v_unused) <> 450 then
    raise exception 'Uneaten batch not corrected';
  end if;
  raise notice 'Prepared weight SQL checks passed: history, weighed grams, repeated corrections, nutrients, extras, ledger, validation, grants, RLS';
end;
$$;
rollback;
