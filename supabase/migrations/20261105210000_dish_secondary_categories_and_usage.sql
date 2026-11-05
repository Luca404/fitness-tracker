-- Optional secondary labels, independent from breakfast/lunch/dinner/snack.
alter table public.dishes add column categories text[] not null default '{}'::text[]
  check (categories <@ array['pasta','rice','vegetables','meat','fish','toast','pizza','legumes','eggs','dairy','soup','dessert','beverages']::text[] and array_position(categories,null) is null);

-- Five-argument overload; existing four-argument clients keep their behavior.
create function public.create_dish_with_categories(
  p_user_id uuid,p_name text,p_items jsonb,p_meal_types text[],p_categories text[]
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if p_categories is null or not (p_categories <@ array['pasta','rice','vegetables','meat','fish','toast','pizza','legumes','eggs','dairy','soup','dessert','beverages']::text[])
    or array_position(p_categories,null) is not null then
    raise exception 'Categorie del piatto non valide' using errcode = '22023';
  end if;
  v_result := public.create_dish_with_categories(p_user_id,p_name,p_items,p_meal_types);
  update public.dishes set categories = p_categories where id = (v_result->>'id')::uuid and user_id = auth.uid();
  return v_result || jsonb_build_object('categories',p_categories);
end $$;
revoke all on function public.create_dish_with_categories(uuid,text,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.create_dish_with_categories(uuid,text,jsonb,text[],text[]) to authenticated;

-- Five-argument overload; existing four-argument clients keep their behavior.
create function public.update_dish_with_categories(
  p_dish_id uuid,p_name text,p_items jsonb,p_meal_types text[],p_categories text[]
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if p_categories is null or not (p_categories <@ array['pasta','rice','vegetables','meat','fish','toast','pizza','legumes','eggs','dairy','soup','dessert','beverages']::text[])
    or array_position(p_categories,null) is not null then
    raise exception 'Categorie del piatto non valide' using errcode = '22023';
  end if;
  v_result := public.update_dish_with_categories(p_dish_id,p_name,p_items,p_meal_types);
  update public.dishes set categories = p_categories where id = p_dish_id and user_id = auth.uid();
  return v_result || jsonb_build_object('categories',p_categories);
end $$;
revoke all on function public.update_dish_with_categories(uuid,text,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.update_dish_with_categories(uuid,text,jsonb,text[],text[]) to authenticated;

-- Count actual diary entries, including portions of a prepared source recipe.
-- Future diary dates and deleted entries never boost the ranking. No counters
-- are written by the browser and existing RLS applies to every source.
create function public.get_recent_dish_usage()
returns table(dish_id uuid,recent_use_count bigint,last_used_on date)
language sql stable security invoker set search_path = '' as $$
  with uses as (
    select coalesce(b.source_dish_id,e.dish_id) as dish_id,m.date
    from public.meals m join public.meal_entries e on e.meal_id = m.id
    left join public.prepared_batches b on b.id = e.prepared_batch_id and b.user_id = auth.uid()
    where m.user_id = auth.uid() and m.date <= (now() at time zone 'Europe/Rome')::date
  )
  select d.id,count(u.dish_id) filter (where u.date >= (now() at time zone 'Europe/Rome')::date - 29),max(u.date)
  from public.dishes d left join uses u on u.dish_id = d.id
  where d.user_id = auth.uid() and not d.is_preparation
  group by d.id;
$$;
revoke all on function public.get_recent_dish_usage() from public,anon,authenticated;
grant execute on function public.get_recent_dish_usage() to authenticated;
