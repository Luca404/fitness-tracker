-- Keep the receipt after an entry is deleted so an old request cannot recreate it.
create table public.fitness_chat_meal_receipts (
  user_id uuid not null references auth.users on delete cascade,
  request_id uuid not null,
  entry_id uuid not null,
  date date not null,
  meal_type text not null,
  name text not null,
  primary key (user_id, request_id)
);

alter table public.fitness_chat_meal_receipts enable row level security;
revoke all on public.fitness_chat_meal_receipts from public, anon, authenticated;
grant select, insert on public.fitness_chat_meal_receipts to authenticated;
create policy "read own chat receipts" on public.fitness_chat_meal_receipts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "record own chat receipts" on public.fitness_chat_meal_receipts
  for insert to authenticated with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.meal_entries e join public.meals m on m.id = e.meal_id
      where e.id = fitness_chat_meal_receipts.entry_id and m.user_id = (select auth.uid())
    )
  );

create function public.record_fitness_chat_meal(
  p_request_id uuid, p_date date, p_meal_type text, p_name text,
  p_items jsonb, p_dish_id uuid, p_batch_id uuid, p_grams numeric
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_receipt public.fitness_chat_meal_receipts;
begin
  if v_user_id is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_request_id is null or p_date is null or p_date > (now() at time zone 'Europe/Rome')::date
    or p_meal_type is null or p_meal_type not in ('breakfast','lunch','dinner','snack','drinks') then
    raise exception 'invalid diary request' using errcode = '22023';
  end if;

  -- Serialize only retries for this account and request. The existing diary
  -- RPCs still own recipe, item order and prepared-portion consistency.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('fitness-chat:' || v_user_id || ':' || p_request_id, 0));
  select * into v_receipt from public.fitness_chat_meal_receipts
  where user_id = v_user_id and request_id = p_request_id;
  if not found then
    if p_batch_id is not null then
      v_result := public.consume_prepared_batch(p_batch_id, p_date, p_meal_type, p_grams);
    else
      v_result := public.add_meal_entry(v_user_id, p_date, p_meal_type, p_name, p_items, p_dish_id);
    end if;
    insert into public.fitness_chat_meal_receipts (user_id, request_id, entry_id, date, meal_type, name)
    values (v_user_id, p_request_id, (v_result->'entry'->>'id')::uuid, p_date, p_meal_type, v_result->'entry'->>'name')
    returning * into v_receipt;
  end if;
  return to_jsonb(v_receipt) - 'user_id' - 'request_id';
end;
$$;

create function public.get_fitness_chat_diary(p_from date, p_to date, p_detail boolean)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_from is null or p_to is null or p_to - p_from not between 0 and 89
    or (p_detail and p_to - p_from > 6) then
    raise exception 'invalid diary range' using errcode = '22023';
  end if;

  with entries as (
    select m.date, m.meal_type, e.id, e.name, e.created_at, e.cooked_portion_g,
      sum(i.calories)::numeric as calories, sum(i.protein_g)::numeric as protein_g,
      sum(i.carbs_g)::numeric as carbs_g, sum(i.fat_g)::numeric as fat_g,
      case when p_detail then jsonb_agg(jsonb_build_object('name', left(i.food_name, 120),
        'quantity', round(i.quantity_g::numeric, 2), 'unit', i.unit) order by i.position)
        filter (where i.position < 15) end as ingredients,
      case when p_detail then count(*) > 15 else false end as ingredients_truncated
    from public.meals m join public.meal_entries e on e.meal_id = m.id
    join public.meal_items i on i.entry_id = e.id and i.meal_id = m.id
    where m.user_id = v_user_id and m.date between p_from and p_to
    group by m.date, m.meal_type, e.id, e.name, e.created_at, e.cooked_portion_g
  ), days as (
    select date, count(*) as entries, sum(calories) as calories,
      sum(protein_g) as protein_g, sum(carbs_g) as carbs_g, sum(fat_g) as fat_g
    from entries group by date
  )
  select jsonb_build_object(
    'from', p_from, 'to', p_to, 'days_in_range', p_to - p_from + 1,
    'days_logged', (select count(*) from days),
    'current_targets', (select jsonb_build_object('calories', g.calorie_target, 'protein_g', g.protein_g,
      'carbs_g', g.carbs_g, 'fat_g', g.fat_g) from public.user_goals g where g.user_id = v_user_id),
    'daily_average', (select jsonb_build_object('calories', round(avg(calories), 1),
      'protein_g', round(avg(protein_g), 1), 'carbs_g', round(avg(carbs_g), 1), 'fat_g', round(avg(fat_g), 1)) from days),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('date', d.date, 'entries', d.entries,
      'calories', round(d.calories, 1), 'protein_g', round(d.protein_g, 1), 'carbs_g', round(d.carbs_g, 1),
      'fat_g', round(d.fat_g, 1)) order by d.date), '[]'::jsonb) from days d),
    'details_truncated', case when p_detail then (select count(*) > 40 from entries) else false end,
    'entries', case when p_detail then (
      select coalesce(jsonb_agg(jsonb_build_object('date', e.date, 'meal_type', e.meal_type, 'name', left(e.name, 160),
        'calories', round(e.calories, 1), 'protein_g', round(e.protein_g, 1), 'carbs_g', round(e.carbs_g, 1),
        'fat_g', round(e.fat_g, 1), 'cooked_portion_g', e.cooked_portion_g, 'ingredients', e.ingredients,
        'ingredients_truncated', e.ingredients_truncated) order by e.date desc, e.created_at desc, e.id), '[]'::jsonb)
      from (select * from entries order by date desc, created_at desc, id limit 40) e
    ) else null end
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.record_fitness_chat_meal(uuid, date, text, text, jsonb, uuid, uuid, numeric) from public, anon;
grant execute on function public.record_fitness_chat_meal(uuid, date, text, text, jsonb, uuid, uuid, numeric) to authenticated;
revoke execute on function public.get_fitness_chat_diary(date, date, boolean) from public, anon;
grant execute on function public.get_fitness_chat_diary(date, date, boolean) to authenticated;
