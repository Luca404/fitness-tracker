-- Phase 2/3 schema that originally shipped through schema.sql only.
-- Keep this migration safe for environments where the tables were already
-- created manually before the repository adopted a complete migration chain.

-- Phase 1 tables were originally created manually. Bootstrap them here so a
-- new machine can replay this repository's migration chain after starting the
-- shared Trackrs Supabase project. Every statement is safe when the table or
-- policy already exists.

create table if not exists public.user_health_profiles (
  user_id          uuid primary key references auth.users on delete cascade,
  age              int not null,
  sex              text not null check (sex in ('male', 'female')),
  height_cm        float not null,
  weight_kg        float not null,
  activity_level   text not null check (activity_level in (
                     'sedentary', 'light', 'moderate', 'active', 'very_active')),
  objective        text not null check (objective in (
                     'lose_weight', 'gain_muscle', 'maintain')),
  target_weight_kg float,
  target_date      date,
  body_fat_pct     float,
  bmr_override     float,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists public.user_goals (
  user_id        uuid primary key references auth.users on delete cascade,
  calorie_target int not null,
  protein_g      float not null,
  carbs_g        float not null,
  fat_g          float not null,
  updated_at     timestamptz default now()
);

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  meal_type  text not null check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drinks')
  ),
  name       text,
  created_at timestamptz default now()
);

create table if not exists public.meal_items (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.meals on delete cascade,
  food_name   text not null,
  quantity_g  float not null,
  calories    float not null,
  protein_g   float not null,
  carbs_g     float not null,
  fat_g       float not null,
  source      text not null default 'manual',
  off_food_id text,
  created_at  timestamptz default now()
);

create table if not exists public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  activity        text not null,
  duration_min    int not null,
  calories_burned float not null,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  weight_kg  float not null,
  notes      text,
  created_at timestamptz default now(),
  unique (user_id, date)
);

alter table public.user_health_profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.workouts enable row level security;
alter table public.weight_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_health_profiles'
      and policyname = 'own profile'
  ) then
    create policy "own profile" on public.user_health_profiles
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_goals'
      and policyname = 'own goals'
  ) then
    create policy "own goals" on public.user_goals
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'meals'
      and policyname = 'own meals'
  ) then
    create policy "own meals" on public.meals
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'meal_items'
      and policyname = 'own meal_items'
  ) then
    create policy "own meal_items" on public.meal_items
      using (exists (
        select 1 from public.meals m
        where m.id = meal_id and m.user_id = auth.uid()
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workouts'
      and policyname = 'own workouts'
  ) then
    create policy "own workouts" on public.workouts
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weight_logs'
      and policyname = 'own weight_logs'
  ) then
    create policy "own weight_logs" on public.weight_logs
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists meals_user_id_date_idx
  on public.meals (user_id, date);
create index if not exists workouts_user_id_date_idx
  on public.workouts (user_id, date);
create index if not exists weight_logs_user_id_date_idx
  on public.weight_logs (user_id, date);

alter table public.meals
  drop constraint if exists meals_meal_type_check;

alter table public.meals
  add constraint meals_meal_type_check check (
    meal_type in ('breakfast', 'lunch', 'dinner', 'snack', 'drinks')
  );

create table if not exists public.dishes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.dishes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dishes'
      and policyname = 'own dishes'
  ) then
    create policy "own dishes" on public.dishes
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists dishes_user_id_idx on public.dishes (user_id);

create table if not exists public.dish_items (
  id          uuid primary key default gen_random_uuid(),
  dish_id     uuid not null references public.dishes on delete cascade,
  food_name   text not null,
  quantity_g  float not null,
  calories    float not null,
  protein_g   float not null,
  carbs_g     float not null,
  fat_g       float not null,
  source      text not null default 'manual',
  off_food_id text,
  created_at  timestamptz default now()
);

alter table public.dish_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dish_items'
      and policyname = 'own dish_items'
  ) then
    create policy "own dish_items" on public.dish_items
      using (exists (
        select 1 from public.dishes d
        where d.id = dish_id and d.user_id = auth.uid()
      ));
  end if;
end
$$;

create table if not exists public.pantry_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  quantity      float not null,
  unit          text not null check (unit in ('g', 'ml', 'pz')),
  calories_100g float not null,
  protein_100g  float not null,
  carbs_100g    float not null,
  fat_100g      float not null,
  category      text,
  source        text not null default 'manual',
  off_food_id   text,
  created_at    timestamptz default now()
);

alter table public.pantry_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pantry_items'
      and policyname = 'own pantry_items'
  ) then
    create policy "own pantry_items" on public.pantry_items
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

create index if not exists pantry_items_user_id_idx on public.pantry_items (user_id);
