-- Run ONLY in an isolated database with migrations through 20261004140000.
-- This tests the historical backfill and both new migrations in a rolled-back transaction.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-000000000051'), ('00000000-0000-0000-0000-000000000052');
insert into public.gym_plans(id, user_id, name, created_at) values
 ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000051', 'Scheda A', '2026-10-01'),
 ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000051', 'Scheda B', '2026-10-02'),
 ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000052', 'Private', '2026-10-01');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000051', true);
set local role authenticated;
insert into public.dishes(id, user_id, name) values
 ('00000000-0000-0000-0000-000000000301', auth.uid(), 'Fruit then oats');
insert into public.dish_items(id, dish_id, position, food_name, category, quantity_g, calories, protein_g, carbs_g, fat_g, source) values
 ('ffffffff-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000301',0,'Mela','fruit',100,52,0,14,0,'manual'),
 ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000301',1,'Avena','grain',50,190,6,30,3,'manual');
insert into public.meals(id, user_id, date, meal_type) values
 ('00000000-0000-0000-0000-000000000401',auth.uid(),'2026-10-04','lunch');
insert into public.meal_entries(id, meal_id, dish_id, name) values
 ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000301','Fruit then oats');
-- Deliberately wrong physical/UUID order with identical timestamps.
insert into public.meal_items(id, meal_id, entry_id, dish_item_id, food_name, category, quantity_g, calories, protein_g, carbs_g, fat_g, source, created_at) values
 ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000002','Avena','grain',50,190,6,30,3,'manual','2026-10-04'),
 ('ffffffff-0000-0000-0000-000000000602','00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000501','ffffffff-0000-0000-0000-000000000001','Mela','fruit',100,52,0,14,0,'manual','2026-10-04');
reset role;
\ir ../migrations/20261004153000_preserve_diary_ingredient_order.sql
\ir ../migrations/20261004154000_gym_plan_order.sql
set local role authenticated;
do $$
declare
  v_entry uuid;
  v_result jsonb;
  v_items jsonb := '[{"food_name":"Mela","category":"fruit","quantity_g":100,"calories":52,"protein_g":0,"carbs_g":14,"fat_g":0},{"food_name":"Avena","category":"grain","quantity_g":50,"calories":190,"protein_g":6,"carbs_g":30,"fat_g":3}]';
  v_a uuid := '00000000-0000-0000-0000-000000000101';
  v_b uuid := '00000000-0000-0000-0000-000000000102';
  v_other uuid := '00000000-0000-0000-0000-000000000201';
  v_c uuid;
  v_d uuid;
  v_batch uuid;
  v_recipe jsonb;
  v_exercises jsonb := '[{"exercise_name":"Panca","equipment":"Bilanciere","target_sets":1,"target_reps":8},{"exercise_name":"Squat","equipment":"Bilanciere","target_sets":1,"target_reps":10}]';
begin
  if (select array_agg(food_name order by position) from public.meal_items where entry_id = '00000000-0000-0000-0000-000000000501') <> array['Mela','Avena'] then raise exception 'Historical recipe order not recovered'; end if;
  v_result := public.add_meal_entry(auth.uid(),'2026-10-04','breakfast','Manual ordered',v_items,null);
  v_entry := (v_result->'entry'->>'id')::uuid;
  if v_result->'entry'->'items'->0->>'food_name' <> 'Mela' or (v_result->'entry'->'items'->1->>'position')::integer <> 1 then raise exception 'RPC response scrambled insertion order'; end if;
  v_result := public.update_meal_entry(v_entry,'Reversed',jsonb_build_array(v_items->1,v_items->0));
  if v_result->'items'->0->>'food_name' <> 'Avena' or (select food_name from public.meal_items where entry_id = v_entry and position = 0) <> 'Avena' then raise exception 'RPC response or persisted update order incorrect'; end if;
  -- Direct/older clients omit the position: append instead of failing.
  insert into public.meal_items(meal_id,entry_id,food_name,category,quantity_g,calories,protein_g,carbs_g,fat_g,source)
  select meal_id,v_entry,'Extra','other',1,1,0,0,0,'manual' from public.meal_entries where id = v_entry;
  if (select position from public.meal_items where entry_id = v_entry and food_name = 'Extra') <> 2 then raise exception 'Legacy insert did not append'; end if;
  begin
    perform public.update_meal_entry(v_entry,'Invalid','[{"food_name":"Bad","quantity_g":-1,"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}]');
    raise exception 'Invalid ingredient accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.meal_items where entry_id = v_entry) <> 3 then raise exception 'Invalid update was not atomic'; end if;
  v_recipe := public.create_dish_with_items(auth.uid(),'Prepared ordered',v_items);
  v_result := public.create_prepared_batch(auth.uid(),'Prepared ordered',v_items,(v_recipe->>'id')::uuid,null,150,75,'2026-10-04','dinner');
  v_batch := (v_result->>'id')::uuid;
  if (select array_agg(mi.food_name order by mi.position) from public.meal_items mi join public.meal_entries e on e.id = mi.entry_id where e.prepared_batch_id = v_batch) <> array['Mela','Avena'] then raise exception 'Prepared portion lost recipe order'; end if;

  if (select position from public.gym_plans where id = v_a) <> 0 or (select position from public.gym_plans where id = v_b) <> 1 then raise exception 'Initial plan order changed'; end if;
  perform public.reorder_gym_plans(array[v_b,v_a]);
  if (select array_agg(id order by position) from public.gym_plans) <> array[v_b,v_a] then raise exception 'Plan order not persisted'; end if;
  v_c := public.save_gym_plan(auth.uid(),null,'Scheda C',v_exercises);
  if (select position from public.gym_plans where id = v_c) <> 2 then raise exception 'New plan did not append'; end if;
  perform public.reorder_gym_plans(array[v_c,v_b,v_a]);
  perform public.save_gym_plan(auth.uid(),v_a,'Scheda A renamed',v_exercises);
  if (select position from public.gym_plans where id = v_a) <> 2 then raise exception 'Renaming a plan reset its position'; end if;
  if (select array_agg(exercise_name order by position) from public.gym_plan_exercises where plan_id = v_a) <> array['Panca','Squat'] then raise exception 'Moving plan changed exercise order'; end if;
  begin
    perform public.reorder_gym_plans(array[v_c,v_b]); raise exception 'Incomplete order accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.reorder_gym_plans(array[v_c,v_c,v_a]); raise exception 'Duplicate order accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.reorder_gym_plans(array[v_c,null,v_a]); raise exception 'Null plan accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.reorder_gym_plans(array[v_c,v_b,v_other]); raise exception 'Foreign plan accepted';
  exception when invalid_parameter_value then null; end;
  if (select array_agg(id order by position) from public.gym_plans) <> array[v_c,v_b,v_a] then raise exception 'Rejected order changed stored plans'; end if;
  delete from public.gym_plans where id = v_b;
  v_d := public.save_gym_plan(auth.uid(),null,'Scheda D',v_exercises);
  if (select position from public.gym_plans where id = v_d) <> 3 then raise exception 'New plan reused a nonterminal position'; end if;
  perform public.reorder_gym_plans(array[v_c,v_a,v_d]);
  set constraints gym_plans_user_position_unique immediate;
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000052',true);
  begin
    perform public.reorder_gym_plans(array[v_c,v_a,v_d]); raise exception 'Another user reordered plans';
  exception when invalid_parameter_value then null; end;
  if (select position from public.gym_plans where id = v_other) <> 0 then raise exception 'Other user order changed'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.reorder_gym_plans(array[]::uuid[]); raise exception 'Unauthenticated reorder accepted';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.reorder_gym_plans(uuid[])','execute') then raise exception 'Anonymous RPC access granted'; end if;
  raise notice 'Ordering SQL checks passed: historical backfill, RPCs, edits, portions, plan order, append, atomic validation and RLS';
end;
$$;
rollback;
