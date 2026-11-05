-- Keep recipes and other metadata intact while removing obsolete labels.
-- Do not infer that legumes, eggs or dairy recipes are vegan or yogurt.
alter table public.dishes drop constraint dishes_categories_check;
update public.dishes d set categories = array(
  select c from unnest(d.categories) with ordinality labels(c,n)
  where c = any(array['pasta','rice','vegetables','meat','fish','vegan_main','toast','yogurt','soup','dessert','beverages']::text[]) order by n
) where categories && array['pizza','legumes','eggs','dairy']::text[];
alter table public.dishes add constraint dishes_categories_check
  check (categories <@ array['pasta','rice','vegetables','meat','fish','vegan_main','toast','yogurt','soup','dessert','beverages']::text[] and array_position(categories,null) is null);

-- Older open clients may still send retired labels. Accept and discard those
-- known labels; reject unknown values. New clients see only the current set.
create or replace function public.create_dish_with_categories(
  p_user_id uuid,p_name text,p_items jsonb,p_meal_types text[],p_categories text[]
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_result jsonb; v_categories text[];
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if p_categories is null or not (p_categories <@ array['pasta','rice','vegetables','meat','fish','toast','pizza','legumes','eggs','dairy','soup','dessert','beverages','vegan_main','yogurt']::text[])
    or array_position(p_categories,null) is not null then
    raise exception 'Categorie del piatto non valide' using errcode = '22023';
  end if;
  v_categories := array(select c from unnest(p_categories) c where c = any(array['pasta','rice','vegetables','meat','fish','vegan_main','toast','yogurt','soup','dessert','beverages']::text[]));
  v_result := public.create_dish_with_categories(p_user_id,p_name,p_items,p_meal_types);
  update public.dishes set categories = v_categories where id = (v_result->>'id')::uuid and user_id = auth.uid();
  return v_result || jsonb_build_object('categories',v_categories);
end $$;
revoke all on function public.create_dish_with_categories(uuid,text,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.create_dish_with_categories(uuid,text,jsonb,text[],text[]) to authenticated;

-- Older open clients may still send retired labels. Accept and discard those
-- known labels; reject unknown values. New clients see only the current set.
create or replace function public.update_dish_with_categories(
  p_dish_id uuid,p_name text,p_items jsonb,p_meal_types text[],p_categories text[]
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_result jsonb; v_categories text[];
begin
  if auth.uid() is null then raise exception 'Accesso richiesto' using errcode = '42501'; end if;
  if p_categories is null or not (p_categories <@ array['pasta','rice','vegetables','meat','fish','toast','pizza','legumes','eggs','dairy','soup','dessert','beverages','vegan_main','yogurt']::text[])
    or array_position(p_categories,null) is not null then
    raise exception 'Categorie del piatto non valide' using errcode = '22023';
  end if;
  v_categories := array(select c from unnest(p_categories) c where c = any(array['pasta','rice','vegetables','meat','fish','vegan_main','toast','yogurt','soup','dessert','beverages']::text[]));
  v_result := public.update_dish_with_categories(p_dish_id,p_name,p_items,p_meal_types);
  update public.dishes set categories = v_categories where id = p_dish_id and user_id = auth.uid();
  return v_result || jsonb_build_object('categories',v_categories);
end $$;
revoke all on function public.update_dish_with_categories(uuid,text,jsonb,text[],text[]) from public,anon,authenticated;
grant execute on function public.update_dish_with_categories(uuid,text,jsonb,text[],text[]) to authenticated;

