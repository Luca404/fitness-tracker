-- user_health_profiles
create table public.user_health_profiles (
  user_id          uuid primary key references auth.users on delete cascade,
  age              int not null check (age between 10 and 120),
  sex              text not null check (sex in ('male', 'female')),
  height_cm        float not null check (height_cm between 100 and 250),
  weight_kg        float not null check (weight_kg between 20 and 400),
  activity_level   text not null check (activity_level in (
                     'sedentary', 'light', 'moderate', 'active', 'very_active')),
  does_resistance_training boolean not null default false,
  objective        text not null check (objective in (
                     'lose_weight', 'gain_muscle', 'maintain', 'recomposition')),
  target_weight_kg float check (target_weight_kg between 20 and 400),
  target_date      date,
  body_fat_pct     float check (body_fat_pct between 1 and 75),
  bmr_override     float check (bmr_override > 0),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.user_health_profiles enable row level security;
create policy "own profile" on public.user_health_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_goals
create table public.user_goals (
  user_id        uuid primary key references auth.users on delete cascade,
  calorie_target int not null check (calorie_target > 0),
  protein_g      float not null check (protein_g >= 0),
  carbs_g        float not null check (carbs_g >= 0),
  fat_g          float not null check (fat_g >= 0),
  calculation_weight_kg float check (calculation_weight_kg between 20 and 400),
  updated_at     timestamptz default now()
);
alter table public.user_goals enable row level security;
create policy "own goals" on public.user_goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meals
create table public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  meal_type  text not null check (meal_type in ('breakfast','lunch','dinner','snack','drinks')),
  name       text,
  created_at timestamptz default now(),
  constraint meals_user_date_type_key unique (user_id, date, meal_type)
);
alter table public.meals enable row level security;
create policy "own meals" on public.meals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meal_entries (the dishes actually eaten inside a meal slot)
create table public.meal_entries (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.meals on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);
alter table public.meal_entries enable row level security;
create policy "own meal_entries" on public.meal_entries
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  ));
create index on public.meal_entries (meal_id, created_at);

-- meal_items
create table public.meal_items (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.meals on delete cascade,
  entry_id    uuid not null references public.meal_entries on delete cascade,
  food_name   text not null,
  quantity_g  float not null check (quantity_g > 0),
  piece_count float check (piece_count is null or piece_count > 0),
  piece_size  text check (piece_size in ('small', 'medium', 'large')),
  constraint meal_items_piece_pair check ((piece_count is null) = (piece_size is null)),
  unit        text not null default 'g' check (unit in ('g', 'ml')),
  category    text not null default 'other' check (category in ('grain','bakery','legume','vegetable','fruit','nuts_seeds','meat','fish','dairy','egg','plant_protein','spread','fat','sauce','condiment','seasoning','sweet','snack','prepared','supplement','alcohol','beverage','other')),
  food_key    text,
  calories    float not null check (calories >= 0),
  protein_g   float not null check (protein_g >= 0),
  carbs_g     float not null check (carbs_g >= 0),
  fat_g       float not null check (fat_g >= 0),
  fiber_g     float check (fiber_g is null or fiber_g >= 0),
  sugars_g    float check (sugars_g is null or sugars_g >= 0),
  salt_g      float check (salt_g is null or salt_g >= 0),
  source      text not null default 'manual',
  off_food_id text,
  created_at  timestamptz default now()
);
alter table public.meal_items enable row level security;
create policy "own meal_items" on public.meal_items
  using (exists (
    select 1 from public.meal_entries e
    join public.meals m on m.id = e.meal_id
    where e.id = entry_id and e.meal_id = meal_id and m.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.meal_entries e
    join public.meals m on m.id = e.meal_id
    where e.id = entry_id and e.meal_id = meal_id and m.user_id = auth.uid()
  ));
create index on public.meal_items (entry_id, created_at);

-- workouts
create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  activity        text not null,
  duration_min    int not null check (duration_min > 0),
  calories_burned float not null check (calories_burned >= 0),
  notes           text,
  created_at      timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "own workouts" on public.workouts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.workouts (user_id, date);

-- weight_logs
create table public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  weight_kg  float not null check (weight_kg between 20 and 400),
  notes      text,
  created_at timestamptz default now(),
  unique (user_id, date)
);
alter table public.weight_logs enable row level security;
create policy "own weight_logs" on public.weight_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- dishes (reusable saved meals / "piatti")
create table public.dishes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  icon       text check (icon is null or (length(trim(icon)) between 1 and 16)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.dishes enable row level security;
create policy "own dishes" on public.dishes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.dishes (user_id);

-- Keep diary entries linked to the saved dish whose icon they display.
alter table public.meal_entries
  add column dish_id uuid references public.dishes on delete set null;
create index meal_entries_dish_id_idx on public.meal_entries (dish_id)
  where dish_id is not null;

-- dish_items
create table public.dish_items (
  id          uuid primary key default gen_random_uuid(),
  dish_id     uuid not null references public.dishes on delete cascade,
  position    integer not null check (position >= 0),
  food_name   text not null,
  quantity_g  float not null check (quantity_g > 0),
  piece_count float check (piece_count is null or piece_count > 0),
  piece_size  text check (piece_size in ('small', 'medium', 'large')),
  constraint dish_items_piece_pair check ((piece_count is null) = (piece_size is null)),
  category    text not null default 'other' check (category in ('grain','bakery','legume','vegetable','fruit','nuts_seeds','meat','fish','dairy','egg','plant_protein','spread','fat','sauce','condiment','seasoning','sweet','snack','prepared','supplement','alcohol','beverage','other')),
  food_key    text,
  calories    float not null check (calories >= 0),
  protein_g   float not null check (protein_g >= 0),
  carbs_g     float not null check (carbs_g >= 0),
  fat_g       float not null check (fat_g >= 0),
  fiber_g     float check (fiber_g is null or fiber_g >= 0),
  sugars_g    float check (sugars_g is null or sugars_g >= 0),
  salt_g      float check (salt_g is null or salt_g >= 0),
  source      text not null default 'manual',
  off_food_id text,
  created_at  timestamptz default now()
);
create unique index dish_items_dish_position_idx on public.dish_items (dish_id, position);

alter table public.meal_items
  add column dish_item_id uuid references public.dish_items on delete set null;
create index meal_items_dish_item_id_idx on public.meal_items (dish_item_id)
  where dish_item_id is not null;
alter table public.dish_items enable row level security;
create policy "own dish_items" on public.dish_items
  using (exists (
    select 1 from public.dishes d
    where d.id = dish_id and d.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.dishes d
    where d.id = dish_id and d.user_id = auth.uid()
  ));

-- pantry_items (groceries you have at home)
create table public.pantry_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  quantity      float not null check (quantity >= 0),
  unit          text not null check (unit in ('g', 'ml', 'pz')),
  calories_100g float not null check (calories_100g >= 0),
  protein_100g  float not null check (protein_100g >= 0),
  carbs_100g    float not null check (carbs_100g >= 0),
  fat_100g      float not null check (fat_100g >= 0),
  category      text not null default 'other' check (category in ('grain','bakery','legume','vegetable','fruit','nuts_seeds','meat','fish','dairy','egg','plant_protein','spread','fat','sauce','condiment','seasoning','sweet','snack','prepared','supplement','alcohol','beverage','other')),
  food_key      text,
  source        text not null default 'manual',
  off_food_id   text,
  barcode       text check (barcode is null or (barcode ~ '^[0-9]+$' and length(barcode) in (8, 12, 13, 14))),
  off_data      jsonb,
  fiber_100g    float,
  sugars_100g   float,
  saturated_fat_100g   float,
  unsaturated_fat_100g float,
  salt_100g     float,
  nutrition_score float,
  nutrition_grade text,
  nova_group    int,
  ecoscore_grade text,
  archived_at   timestamptz,
  created_at    timestamptz default now()
);
alter table public.pantry_items enable row level security;
create policy "own pantry_items" on public.pantry_items
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.pantry_items (user_id);
create index on public.pantry_items (user_id, barcode) where barcode is not null;

-- barcode_products (shared catalog, independent from personal pantry stock)
create table public.barcode_products (
  barcode               text primary key check (barcode ~ '^[0-9]+$' and length(barcode) in (8, 12, 13, 14)),
  name                  text not null check (length(trim(name)) > 0),
  brand                 text,
  package_quantity      text,
  quantity_value        double precision check (quantity_value is null or quantity_value > 0),
  quantity_unit         text check (quantity_unit is null or quantity_unit in ('g', 'ml', 'pz')),
  package_piece_count   integer check (package_piece_count is null or package_piece_count > 0),
  package_net_quantity_value double precision check (package_net_quantity_value is null or package_net_quantity_value > 0),
  package_net_quantity_unit text check (package_net_quantity_unit is null or package_net_quantity_unit in ('g', 'ml')),
  serving_size          text,
  ingredients           text,
  allergens             text,
  calories_100g         double precision not null check (calories_100g >= 0),
  protein_100g          double precision not null check (protein_100g >= 0),
  carbs_100g            double precision not null check (carbs_100g >= 0),
  fat_100g              double precision not null check (fat_100g >= 0),
  fiber_100g            double precision check (fiber_100g is null or fiber_100g >= 0),
  sugars_100g           double precision check (sugars_100g is null or sugars_100g >= 0),
  saturated_fat_100g    double precision check (saturated_fat_100g is null or saturated_fat_100g >= 0),
  unsaturated_fat_100g  double precision check (unsaturated_fat_100g is null or unsaturated_fat_100g >= 0),
  salt_100g             double precision check (salt_100g is null or salt_100g >= 0),
  category              text not null default 'other' check (category in (
                          'grain','bakery','legume','vegetable','fruit','nuts_seeds',
                          'meat','fish','dairy','egg','plant_protein','spread','fat',
                          'sauce','condiment','seasoning','sweet','snack','prepared',
                          'supplement','alcohol','beverage','other')),
  source                text not null check (source in ('openfoodfacts', 'ai_photo')),
  off_food_id           text,
  confidence            text check (confidence is null or confidence in ('high', 'medium', 'low')),
  metadata              jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.barcode_products enable row level security;
create policy "authenticated users read barcode_products" on public.barcode_products
  for select using (auth.uid() is not null);

comment on table public.barcode_products is
  'Shared read-only product cache populated by trusted Edge Functions from Open Food Facts or OpenAI';

alter table public.meal_items
  add column pantry_item_id uuid references public.pantry_items(id) on delete set null,
  add column pantry_quantity_used float not null default 0 check (pantry_quantity_used >= 0);
alter table public.dish_items
  add column pantry_item_id uuid references public.pantry_items(id) on delete set null;
create index on public.meal_items (pantry_item_id) where pantry_item_id is not null;
create index on public.dish_items (pantry_item_id) where pantry_item_id is not null;

-- Atomic application operations. SECURITY INVOKER keeps RLS active, while the
-- explicit auth checks make ownership requirements clear at the function edge.

create or replace function public.complete_health_onboarding(p_profile jsonb, p_goals jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (p_profile->>'user_id')::uuid;
begin
  if auth.uid() is null or auth.uid() <> v_user_id or (p_goals->>'user_id')::uuid <> v_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.user_health_profiles (
    user_id, age, sex, height_cm, weight_kg, activity_level, does_resistance_training, objective,
    target_weight_kg, target_date, body_fat_pct, bmr_override, updated_at
  ) values (
    v_user_id, (p_profile->>'age')::int, p_profile->>'sex',
    (p_profile->>'height_cm')::float, (p_profile->>'weight_kg')::float,
    p_profile->>'activity_level', coalesce((p_profile->>'does_resistance_training')::boolean, false),
    p_profile->>'objective',
    nullif(p_profile->>'target_weight_kg', '')::float,
    nullif(p_profile->>'target_date', '')::date,
    nullif(p_profile->>'body_fat_pct', '')::float,
    nullif(p_profile->>'bmr_override', '')::float, now()
  )
  on conflict (user_id) do update set
    age = excluded.age,
    sex = excluded.sex,
    height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg,
    activity_level = excluded.activity_level,
    does_resistance_training = excluded.does_resistance_training,
    objective = excluded.objective,
    target_weight_kg = excluded.target_weight_kg,
    target_date = excluded.target_date,
    body_fat_pct = excluded.body_fat_pct,
    bmr_override = excluded.bmr_override,
    updated_at = now();

  insert into public.user_goals (
    user_id, calorie_target, protein_g, carbs_g, fat_g, calculation_weight_kg, updated_at
  )
  values (
    v_user_id, (p_goals->>'calorie_target')::int, (p_goals->>'protein_g')::float,
    (p_goals->>'carbs_g')::float, (p_goals->>'fat_g')::float,
    coalesce((p_goals->>'calculation_weight_kg')::float, (p_profile->>'weight_kg')::float), now()
  )
  on conflict (user_id) do update set
    calorie_target = excluded.calorie_target,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g,
    calculation_weight_kg = excluded.calculation_weight_kg,
    updated_at = now();
end;
$$;

create or replace function public.add_meal_entry(
  p_user_id uuid,
  p_date date,
  p_meal_type text,
  p_name text,
  p_items jsonb,
  p_dish_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_meal public.meals%rowtype;
  v_entry public.meal_entries%rowtype;
  v_item public.meal_items%rowtype;
  v_pantry public.pantry_items%rowtype;
  v_used float;
  v_items jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;
  if p_dish_id is not null and not exists (
    select 1 from public.dishes d where d.id = p_dish_id and d.user_id = p_user_id
  ) then
    raise exception 'dish not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(dish_item_id uuid)
    where x.dish_item_id is not null and not exists (
      select 1 from public.dish_items di
      where di.id = x.dish_item_id and di.dish_id = p_dish_id
    )
  ) then
    raise exception 'dish ingredient not found' using errcode = 'P0002';
  end if;

  insert into public.meals (user_id, date, meal_type, name)
  values (p_user_id, p_date, p_meal_type, null)
  on conflict (user_id, date, meal_type) do update set name = public.meals.name
  returning * into v_meal;

  insert into public.meal_entries (meal_id, name, dish_id)
  values (v_meal.id, trim(p_name), p_dish_id)
  returning * into v_entry;

  insert into public.meal_items (
    meal_id, entry_id, dish_item_id, food_name, quantity_g, piece_count, piece_size, unit, category, food_key,
    pantry_item_id, calories, protein_g, carbs_g, fat_g, fiber_g, sugars_g,
    salt_g, source, off_food_id
  )
  select
    v_meal.id, v_entry.id, x.dish_item_id, x.food_name, x.quantity_g, x.piece_count, x.piece_size, coalesce(x.unit, 'g'),
    coalesce(x.category, 'other'), x.food_key, x.pantry_item_id, x.calories,
    x.protein_g, x.carbs_g, x.fat_g, x.fiber_g, x.sugars_g, x.salt_g,
    coalesce(x.source, 'manual'), x.off_food_id
  from jsonb_to_recordset(p_items) as x(
    dish_item_id uuid, food_name text, quantity_g float, piece_count float, piece_size text, unit text, category text, food_key text,
    pantry_item_id uuid, calories float, protein_g float, carbs_g float,
    fat_g float, fiber_g float, sugars_g float, salt_g float, source text,
    off_food_id text
  );

  for v_item in
    select * from public.meal_items where entry_id = v_entry.id order by created_at, id
  loop
    select p.* into v_pantry
    from public.pantry_items p
    where p.user_id = p_user_id and p.quantity > 0
      and (p.unit = v_item.unit or (p.unit = 'pz' and v_item.piece_count is not null))
      and (
        (v_item.pantry_item_id is not null and p.id = v_item.pantry_item_id)
        or (v_item.pantry_item_id is null and (
          (v_item.food_key is not null and p.food_key is not null and p.food_key = v_item.food_key)
          or ((v_item.food_key is null or p.food_key is null) and (
            (v_item.off_food_id is not null and p.off_food_id = v_item.off_food_id)
            or lower(regexp_replace(trim(p.name), '[^[:alnum:]]+', ' ', 'g')) =
               lower(regexp_replace(trim(v_item.food_name), '[^[:alnum:]]+', ' ', 'g'))
          ))
        ))
      )
    order by case when p.id = v_item.pantry_item_id then 0
                  when p.food_key = v_item.food_key then 1
                  when p.off_food_id = v_item.off_food_id then 2 else 3 end,
             p.created_at, p.id
    limit 1 for update;

    if found then
      v_used := least(case when v_pantry.unit = 'pz' then v_item.piece_count else v_item.quantity_g end, v_pantry.quantity);
      update public.pantry_items set quantity = quantity - v_used where id = v_pantry.id;
      update public.meal_items
      set pantry_item_id = v_pantry.id, pantry_quantity_used = v_used
      where id = v_item.id;
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(mi) order by mi.created_at, mi.id), '[]'::jsonb)
  into v_items from public.meal_items mi where mi.entry_id = v_entry.id;

  return jsonb_build_object(
    'meal', to_jsonb(v_meal),
    'entry', to_jsonb(v_entry) || jsonb_build_object('items', v_items)
  );
end;
$$;

create or replace function public.update_meal_entry(p_entry_id uuid, p_name text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_entry public.meal_entries%rowtype;
  v_user_id uuid;
  v_item public.meal_items%rowtype;
  v_pantry public.pantry_items%rowtype;
  v_used float;
  v_items jsonb;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name is required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;

  update public.meal_entries e
  set name = trim(p_name)
  from public.meals m
  where e.id = p_entry_id and m.id = e.meal_id and m.user_id = auth.uid()
  returning e.* into v_entry;
  if not found then
    raise exception 'meal entry not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as x(dish_item_id uuid)
    where x.dish_item_id is not null and not exists (
      select 1 from public.dish_items di
      where di.id = x.dish_item_id and di.dish_id = v_entry.dish_id
    )
  ) then
    raise exception 'dish ingredient not found' using errcode = 'P0002';
  end if;

  select user_id into v_user_id from public.meals where id = v_entry.meal_id;

  update public.pantry_items p
  set quantity = p.quantity + restored.quantity
  from (
    select pantry_item_id, sum(pantry_quantity_used) as quantity
    from public.meal_items
    where entry_id = p_entry_id and pantry_item_id is not null
    group by pantry_item_id
  ) restored
  where p.id = restored.pantry_item_id and p.user_id = v_user_id;

  delete from public.meal_items where entry_id = p_entry_id;

  insert into public.meal_items (
    meal_id, entry_id, dish_item_id, food_name, quantity_g, piece_count, piece_size, unit, category, food_key,
    pantry_item_id, calories, protein_g, carbs_g, fat_g, fiber_g, sugars_g,
    salt_g, source, off_food_id
  )
  select
    v_entry.meal_id, v_entry.id, x.dish_item_id, x.food_name, x.quantity_g, x.piece_count, x.piece_size, coalesce(x.unit, 'g'),
    coalesce(x.category, 'other'), x.food_key, x.pantry_item_id, x.calories,
    x.protein_g, x.carbs_g, x.fat_g, x.fiber_g, x.sugars_g, x.salt_g,
    coalesce(x.source, 'manual'), x.off_food_id
  from jsonb_to_recordset(p_items) as x(
    dish_item_id uuid, food_name text, quantity_g float, piece_count float, piece_size text, unit text, category text, food_key text,
    pantry_item_id uuid, calories float, protein_g float, carbs_g float,
    fat_g float, fiber_g float, sugars_g float, salt_g float, source text,
    off_food_id text
  );

  for v_item in
    select * from public.meal_items where entry_id = v_entry.id order by created_at, id
  loop
    select p.* into v_pantry
    from public.pantry_items p
    where p.user_id = v_user_id and p.quantity > 0
      and (p.unit = v_item.unit or (p.unit = 'pz' and v_item.piece_count is not null))
      and (
        (v_item.pantry_item_id is not null and p.id = v_item.pantry_item_id)
        or (v_item.pantry_item_id is null and (
          (v_item.food_key is not null and p.food_key is not null and p.food_key = v_item.food_key)
          or ((v_item.food_key is null or p.food_key is null) and (
            (v_item.off_food_id is not null and p.off_food_id = v_item.off_food_id)
            or lower(regexp_replace(trim(p.name), '[^[:alnum:]]+', ' ', 'g')) =
               lower(regexp_replace(trim(v_item.food_name), '[^[:alnum:]]+', ' ', 'g'))
          ))
        ))
      )
    order by case when p.id = v_item.pantry_item_id then 0
                  when p.food_key = v_item.food_key then 1
                  when p.off_food_id = v_item.off_food_id then 2 else 3 end,
             p.created_at, p.id
    limit 1 for update;

    if found then
      v_used := least(case when v_pantry.unit = 'pz' then v_item.piece_count else v_item.quantity_g end, v_pantry.quantity);
      update public.pantry_items set quantity = quantity - v_used where id = v_pantry.id;
      update public.meal_items
      set pantry_item_id = v_pantry.id, pantry_quantity_used = v_used
      where id = v_item.id;
    end if;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(mi) order by mi.created_at, mi.id), '[]'::jsonb)
  into v_items from public.meal_items mi where mi.entry_id = v_entry.id;

  return to_jsonb(v_entry) || jsonb_build_object('items', v_items);
end;
$$;

create or replace function public.delete_meal_entry(p_entry_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_meal_id uuid;
  v_user_id uuid;
begin
  select e.meal_id, m.user_id into v_meal_id, v_user_id
  from public.meal_entries e
  join public.meals m on m.id = e.meal_id
  where e.id = p_entry_id and m.user_id = auth.uid();
  if not found then
    raise exception 'meal entry not found' using errcode = 'P0002';
  end if;

  update public.pantry_items p
  set quantity = p.quantity + restored.quantity
  from (
    select pantry_item_id, sum(pantry_quantity_used) as quantity
    from public.meal_items
    where entry_id = p_entry_id and pantry_item_id is not null
    group by pantry_item_id
  ) restored
  where p.id = restored.pantry_item_id and p.user_id = v_user_id;

  delete from public.meal_entries where id = p_entry_id;

  delete from public.meals m
  where m.id = v_meal_id
    and m.user_id = v_user_id
    and not exists (select 1 from public.meal_entries e where e.meal_id = m.id);
end;
$$;

create or replace function public.create_dish_with_items(p_user_id uuid, p_name text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_dish public.dishes%rowtype;
  v_items jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;

  insert into public.dishes (user_id, name) values (p_user_id, trim(p_name)) returning * into v_dish;

  with inserted as (
    insert into public.dish_items (
      dish_id, position, food_name, quantity_g, piece_count, piece_size, category, food_key, pantry_item_id,
      calories, protein_g, carbs_g, fat_g, fiber_g, sugars_g, salt_g, source,
      off_food_id
    )
    select
      v_dish.id, (element.ordinal - 1)::integer, x.food_name, x.quantity_g, x.piece_count, x.piece_size, coalesce(x.category, 'other'), x.food_key, x.pantry_item_id, x.calories, x.protein_g,
      x.carbs_g, x.fat_g, x.fiber_g, x.sugars_g, x.salt_g,
      coalesce(x.source, 'manual'), x.off_food_id
    from jsonb_array_elements(p_items) with ordinality as element(value, ordinal)
    cross join lateral jsonb_to_record(element.value) as x(
      food_name text, quantity_g float, piece_count float, piece_size text, category text, food_key text, pantry_item_id uuid, calories float, protein_g float,
      carbs_g float, fat_g float, fiber_g float, sugars_g float, salt_g float,
      source text, off_food_id text
    )
    returning *
  )
  select coalesce(jsonb_agg(to_jsonb(inserted) order by inserted.position), '[]'::jsonb) into v_items from inserted;

  return to_jsonb(v_dish) || jsonb_build_object('items', v_items);
end;
$$;

create or replace function public.update_dish_with_items(p_dish_id uuid, p_name text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_dish public.dishes%rowtype;
  v_element record;
  v_item_id uuid;
  v_offset integer;
  v_items jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as element(value)
    where element.value->>'id' is not null
    group by element.value->>'id' having count(*) > 1
  ) then
    raise exception 'duplicate dish ingredient' using errcode = '22023';
  end if;

  update public.dishes
  set name = trim(p_name), updated_at = now()
  where id = p_dish_id and user_id = auth.uid()
  returning * into v_dish;
  if not found then
    raise exception 'dish not found' using errcode = 'P0002';
  end if;

  -- Move old positions beyond the new range, preserving IDs for retained items.
  select coalesce(max(position), -1) + jsonb_array_length(p_items) + 1
  into v_offset from public.dish_items where dish_id = p_dish_id;
  update public.dish_items set position = position + v_offset where dish_id = p_dish_id;

  for v_element in
    select value, ordinality from jsonb_array_elements(p_items) with ordinality
  loop
    v_item_id := nullif(v_element.value->>'id', '')::uuid;
    if v_item_id is not null then
      update public.dish_items di set
        position = (v_element.ordinality - 1)::integer,
        food_name = x.food_name, quantity_g = x.quantity_g,
        piece_count = x.piece_count, piece_size = x.piece_size,
        category = coalesce(x.category, 'other'), food_key = x.food_key,
        pantry_item_id = x.pantry_item_id, calories = x.calories,
        protein_g = x.protein_g, carbs_g = x.carbs_g, fat_g = x.fat_g,
        fiber_g = x.fiber_g, sugars_g = x.sugars_g, salt_g = x.salt_g,
        source = coalesce(x.source, 'manual'), off_food_id = x.off_food_id
      from jsonb_to_record(v_element.value) as x(
        food_name text, quantity_g float, piece_count float, piece_size text, category text, food_key text,
        pantry_item_id uuid, calories float, protein_g float, carbs_g float,
        fat_g float, fiber_g float, sugars_g float, salt_g float,
        source text, off_food_id text
      )
      where di.id = v_item_id and di.dish_id = p_dish_id and di.position >= v_offset;
      if not found then
        raise exception 'dish ingredient not found' using errcode = 'P0002';
      end if;
    else
      insert into public.dish_items (
        dish_id, position, food_name, quantity_g, piece_count, piece_size, category, food_key, pantry_item_id,
        calories, protein_g, carbs_g, fat_g, fiber_g, sugars_g, salt_g, source, off_food_id
      )
      select p_dish_id, (v_element.ordinality - 1)::integer, x.food_name, x.quantity_g,
        x.piece_count, x.piece_size, coalesce(x.category, 'other'), x.food_key, x.pantry_item_id, x.calories,
        x.protein_g, x.carbs_g, x.fat_g, x.fiber_g, x.sugars_g, x.salt_g,
        coalesce(x.source, 'manual'), x.off_food_id
      from jsonb_to_record(v_element.value) as x(
        food_name text, quantity_g float, piece_count float, piece_size text, category text, food_key text,
        pantry_item_id uuid, calories float, protein_g float, carbs_g float,
        fat_g float, fiber_g float, sugars_g float, salt_g float,
        source text, off_food_id text
      );
    end if;
  end loop;

  delete from public.dish_items where dish_id = p_dish_id and position >= v_offset;

  -- Recalculate logged portions from the current per-gram values. Quantities,
  -- added extras, pantry usage and unrelated diary entries stay intact.
  update public.meal_items mi set
    calories = round((di.calories * mi.quantity_g / di.quantity_g)::numeric),
    protein_g = round((di.protein_g * mi.quantity_g / di.quantity_g)::numeric, 1),
    carbs_g = round((di.carbs_g * mi.quantity_g / di.quantity_g)::numeric, 1),
    fat_g = round((di.fat_g * mi.quantity_g / di.quantity_g)::numeric, 1),
    fiber_g = round((di.fiber_g * mi.quantity_g / di.quantity_g)::numeric, 2),
    sugars_g = round((di.sugars_g * mi.quantity_g / di.quantity_g)::numeric, 2),
    salt_g = round((di.salt_g * mi.quantity_g / di.quantity_g)::numeric, 2)
  from public.dish_items di, public.meal_entries e
  where mi.dish_item_id = di.id and mi.entry_id = e.id
    and e.dish_id = p_dish_id and di.dish_id = p_dish_id;

  select coalesce(jsonb_agg(to_jsonb(di) order by di.position), '[]'::jsonb)
  into v_items from public.dish_items di where di.dish_id = p_dish_id;

  return to_jsonb(v_dish) || jsonb_build_object('items', v_items);
end;
$$;

revoke execute on function public.complete_health_onboarding(jsonb, jsonb) from public, anon;
revoke execute on function public.add_meal_entry(uuid, date, text, text, jsonb, uuid) from public, anon;
revoke execute on function public.update_meal_entry(uuid, text, jsonb) from public, anon;
revoke execute on function public.delete_meal_entry(uuid) from public, anon;
revoke execute on function public.create_dish_with_items(uuid, text, jsonb) from public, anon;
revoke execute on function public.update_dish_with_items(uuid, text, jsonb) from public, anon;
grant execute on function public.complete_health_onboarding(jsonb, jsonb) to authenticated;
grant execute on function public.add_meal_entry(uuid, date, text, text, jsonb, uuid) to authenticated;
grant execute on function public.update_meal_entry(uuid, text, jsonb) to authenticated;
grant execute on function public.delete_meal_entry(uuid) to authenticated;
grant execute on function public.create_dish_with_items(uuid, text, jsonb) to authenticated;
grant execute on function public.update_dish_with_items(uuid, text, jsonb) to authenticated;

-- Pantry nutrition is authoritative for linked recipe and diary ingredients.
-- Bring existing rows up to date. Keep optional nutrients already known in a
-- recipe or diary entry when the pantry has no value for them yet.
update public.dish_items di set
  calories = round((p.calories_100g * di.quantity_g / 100)::numeric),
  protein_g = round((p.protein_100g * di.quantity_g / 100)::numeric, 1),
  carbs_g = round((p.carbs_100g * di.quantity_g / 100)::numeric, 1),
  fat_g = round((p.fat_100g * di.quantity_g / 100)::numeric, 1),
  fiber_g = case when p.fiber_100g is null then di.fiber_g
    else round((p.fiber_100g * di.quantity_g / 100)::numeric, 2) end,
  sugars_g = case when p.sugars_100g is null then di.sugars_g
    else round((p.sugars_100g * di.quantity_g / 100)::numeric, 2) end,
  salt_g = case when p.salt_100g is null then di.salt_g
    else round((p.salt_100g * di.quantity_g / 100)::numeric, 2) end
from public.pantry_items p
where di.pantry_item_id = p.id;

update public.meal_items mi set
  calories = round((p.calories_100g * mi.quantity_g / 100)::numeric),
  protein_g = round((p.protein_100g * mi.quantity_g / 100)::numeric, 1),
  carbs_g = round((p.carbs_100g * mi.quantity_g / 100)::numeric, 1),
  fat_g = round((p.fat_100g * mi.quantity_g / 100)::numeric, 1),
  fiber_g = case when p.fiber_100g is null then mi.fiber_g
    else round((p.fiber_100g * mi.quantity_g / 100)::numeric, 2) end,
  sugars_g = case when p.sugars_100g is null then mi.sugars_g
    else round((p.sugars_100g * mi.quantity_g / 100)::numeric, 2) end,
  salt_g = case when p.salt_100g is null then mi.salt_g
    else round((p.salt_100g * mi.quantity_g / 100)::numeric, 2) end
from public.pantry_items p
where p.id = coalesce(
  (select di.pantry_item_id from public.dish_items di where di.id = mi.dish_item_id),
  mi.pantry_item_id
);

create or replace function public.sync_pantry_nutrition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.dish_items di set
    calories = case when new.calories_100g is distinct from old.calories_100g
      then round((new.calories_100g * di.quantity_g / 100)::numeric) else di.calories end,
    protein_g = case when new.protein_100g is distinct from old.protein_100g
      then round((new.protein_100g * di.quantity_g / 100)::numeric, 1) else di.protein_g end,
    carbs_g = case when new.carbs_100g is distinct from old.carbs_100g
      then round((new.carbs_100g * di.quantity_g / 100)::numeric, 1) else di.carbs_g end,
    fat_g = case when new.fat_100g is distinct from old.fat_100g
      then round((new.fat_100g * di.quantity_g / 100)::numeric, 1) else di.fat_g end,
    fiber_g = case when new.fiber_100g is distinct from old.fiber_100g
      then round((new.fiber_100g * di.quantity_g / 100)::numeric, 2) else di.fiber_g end,
    sugars_g = case when new.sugars_100g is distinct from old.sugars_100g
      then round((new.sugars_100g * di.quantity_g / 100)::numeric, 2) else di.sugars_g end,
    salt_g = case when new.salt_100g is distinct from old.salt_100g
      then round((new.salt_100g * di.quantity_g / 100)::numeric, 2) else di.salt_g end
  where di.pantry_item_id = new.id;

  update public.meal_items mi set
    calories = case when new.calories_100g is distinct from old.calories_100g
      then round((new.calories_100g * mi.quantity_g / 100)::numeric) else mi.calories end,
    protein_g = case when new.protein_100g is distinct from old.protein_100g
      then round((new.protein_100g * mi.quantity_g / 100)::numeric, 1) else mi.protein_g end,
    carbs_g = case when new.carbs_100g is distinct from old.carbs_100g
      then round((new.carbs_100g * mi.quantity_g / 100)::numeric, 1) else mi.carbs_g end,
    fat_g = case when new.fat_100g is distinct from old.fat_100g
      then round((new.fat_100g * mi.quantity_g / 100)::numeric, 1) else mi.fat_g end,
    fiber_g = case when new.fiber_100g is distinct from old.fiber_100g
      then round((new.fiber_100g * mi.quantity_g / 100)::numeric, 2) else mi.fiber_g end,
    sugars_g = case when new.sugars_100g is distinct from old.sugars_100g
      then round((new.sugars_100g * mi.quantity_g / 100)::numeric, 2) else mi.sugars_g end,
    salt_g = case when new.salt_100g is distinct from old.salt_100g
      then round((new.salt_100g * mi.quantity_g / 100)::numeric, 2) else mi.salt_g end
  where exists (
    select 1 from public.dish_items di
    where di.id = mi.dish_item_id and di.pantry_item_id = new.id
  ) or (
    mi.pantry_item_id = new.id and not exists (
      select 1 from public.dish_items di
      where di.id = mi.dish_item_id and di.pantry_item_id is not null
    )
  );

  return new;
end;
$$;

create trigger sync_pantry_nutrition_after_update
after update of calories_100g, protein_100g, carbs_100g, fat_100g,
  fiber_100g, sugars_100g, salt_100g on public.pantry_items
for each row
when (
  old.calories_100g is distinct from new.calories_100g or
  old.protein_100g is distinct from new.protein_100g or
  old.carbs_100g is distinct from new.carbs_100g or
  old.fat_100g is distinct from new.fat_100g or
  old.fiber_100g is distinct from new.fiber_100g or
  old.sugars_100g is distinct from new.sugars_100g or
  old.salt_100g is distinct from new.salt_100g
)
execute function public.sync_pantry_nutrition();

create or replace function public.set_pantry_archive_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.quantity <= 0 then
    new.archived_at := coalesce(old.archived_at, now());
  else
    new.archived_at := null;
  end if;
  return new;
end;
$$;

create trigger set_pantry_archive_state_before_update
before update of quantity on public.pantry_items
for each row execute function public.set_pantry_archive_state();
