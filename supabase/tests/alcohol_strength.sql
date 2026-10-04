-- Run after repository migrations in an isolated Supabase/PostgreSQL database.
-- The transaction is rolled back; fixtures use reserved UUIDs.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000041'), ('00000000-0000-0000-0000-000000000042');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000041', true);
do $$
declare
  v_user uuid := auth.uid();
  v_items jsonb := '[{"food_name":"Birra test","quantity_g":330,"unit":"ml","alcohol_abv":6,"category":"alcohol","calories":160.13,"protein_g":1.65,"carbs_g":11.88,"fat_g":0,"source":"manual"}]';
  v_result jsonb;
  v_entry uuid;
  v_dish uuid;
  v_dish_item uuid;
  v_pantry uuid;
  v_batch uuid;
  v_before integer;
  v_known_entry uuid;
begin
  v_result := public.add_meal_entry(v_user, '2026-10-04', 'drinks', 'Birra test', v_items, null);
  v_entry := (v_result->'entry'->>'id')::uuid;
  if v_result->'entry'->'items'->0->>'alcohol_abv' <> '6.00' then raise exception 'ABV not saved in diary'; end if;
  v_items := jsonb_set(jsonb_set(v_items, '{0,alcohol_abv}', '7.5'), '{0,quantity_g}', '500');
  v_result := public.update_meal_entry(v_entry, 'Birra modificata', v_items);
  if (v_result->'items'->0->>'alcohol_abv')::numeric <> 7.5
    or (v_result->'items'->0->>'quantity_g')::numeric <> 500 then raise exception 'Diary update lost volume/strength'; end if;

  -- A failed insert must roll back the new entry and its meal.
  select count(*) into v_before from public.meal_entries;
  begin
    perform public.add_meal_entry(v_user, '2026-10-05', 'drinks', 'Invalid', jsonb_set(v_items, '{0,alcohol_abv}', '101'), null);
    raise exception 'Invalid strength accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.meal_entries) <> v_before then raise exception 'Failed entry was not atomic'; end if;
  begin
    perform public.update_meal_entry(v_entry, 'Invalid', jsonb_set(v_items, '{0,alcohol_abv}', '-1'));
    raise exception 'Negative strength accepted';
  exception when check_violation then null; end;
  if (select alcohol_abv from public.meal_items where entry_id = v_entry) <> 7.5 then raise exception 'Failed update erased the original'; end if;

  v_result := public.create_dish_with_items(v_user, 'Drink recipe', v_items);
  v_dish := (v_result->>'id')::uuid;
  v_dish_item := (v_result->'items'->0->>'id')::uuid;
  if v_result->'items'->0->>'unit' <> 'ml' then raise exception 'Recipe lost volume unit'; end if;
  v_items := jsonb_set(v_result->'items', '{0,alcohol_abv}', '8');
  v_result := public.update_dish_with_items(v_dish, 'Drink recipe', v_items);
  if (v_result->'items'->0->>'id')::uuid <> v_dish_item or (v_result->'items'->0->>'alcohol_abv')::numeric <> 8 then raise exception 'Recipe update lost identity/strength'; end if;

  v_result := public.create_prepared_batch(v_user, 'Snapshot test', v_items, v_dish, null, 500, 0, '2026-10-04', 'lunch');
  v_batch := (v_result->>'id')::uuid;
  v_result := public.prepared_portion_items(v_batch, 250);
  if (v_result->0->>'quantity_g')::numeric <> 250 or (v_result->0->>'alcohol_abv')::numeric <> 8 then raise exception 'Portion scaled strength instead of volume'; end if;

  insert into public.pantry_items(user_id, name, category, source, nutrition_unit, alcohol_abv,
    calories_100g, protein_100g, carbs_100g, fat_100g)
  values (v_user, 'Saved beer', 'alcohol', 'manual', 'ml', 5, 43, 0.5, 3.6, 0)
  returning id into v_pantry;
  v_items := jsonb_build_array(jsonb_build_object('food_name','Saved beer','quantity_g',330,'unit','ml',
    'alcohol_abv',6,'category','alcohol','pantry_item_id',v_pantry,'calories',160.13,
    'protein_g',1.65,'carbs_g',11.88,'fat_g',0,'source','pantry'));
  v_result := public.add_meal_entry(v_user, '2026-10-04', 'drinks', 'Custom strength', v_items, null);
  v_entry := (v_result->'entry'->>'id')::uuid;
  if (v_result->'entry'->'items'->0->>'calories')::numeric <> 160.13 then raise exception 'Source trigger erased alcohol energy adjustment'; end if;
  v_result := public.add_meal_entry(v_user, '2026-10-04', 'drinks', 'Default strength', jsonb_set(v_items, '{0,alcohol_abv}', '5'), null);
  v_known_entry := (v_result->'entry'->>'id')::uuid;
  update public.pantry_items set alcohol_abv = 4 where id = v_pantry;
  if (select alcohol_abv from public.meal_items where entry_id = v_entry) <> 6 then raise exception 'Catalog edit erased custom strength'; end if;
  if (select calories from public.meal_items where entry_id = v_entry) <> 178.35 then raise exception 'Catalog update lost custom alcohol energy'; end if;
  if (select alcohol_abv from public.meal_items where entry_id = v_known_entry) <> 4 then raise exception 'Catalog correction did not propagate'; end if;
  v_result := public.update_meal_entry(v_entry, 'Alcohol free', jsonb_set(v_items, '{0,alcohol_abv}', '0'));
  if (v_result->'items'->0->>'alcohol_abv')::numeric <> 0 then raise exception 'Explicit zero replaced with default'; end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000042', true);
  if exists(select 1 from public.meal_items where entry_id = v_entry) then raise exception 'RLS exposed another user'; end if;
  begin
    perform public.update_meal_entry(v_entry, 'Cross-user write', v_items);
    raise exception 'Cross-user update accepted';
  exception when no_data_found then null; end;
  begin
    perform public.add_meal_entry(v_user, '2026-10-04', 'drinks', 'Cross-user insert', v_items, null);
    raise exception 'Cross-user insert accepted';
  exception when insufficient_privilege then null; end;
  raise notice 'Alcohol SQL checks passed: diary, recipes, portions, source calories, zero, constraints, rollback, RLS';
end;
$$;
rollback;
