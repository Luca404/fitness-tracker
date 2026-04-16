-- user_health_profiles
create table public.user_health_profiles (
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
alter table public.user_health_profiles enable row level security;
create policy "own profile" on public.user_health_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_goals
create table public.user_goals (
  user_id        uuid primary key references auth.users on delete cascade,
  calorie_target int not null,
  protein_g      float not null,
  carbs_g        float not null,
  fat_g          float not null,
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
  meal_type  text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name       text,
  created_at timestamptz default now()
);
alter table public.meals enable row level security;
create policy "own meals" on public.meals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.meals (user_id, date);

-- meal_items
create table public.meal_items (
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
alter table public.meal_items enable row level security;
create policy "own meal_items" on public.meal_items
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  ));

-- workouts
create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  activity        text not null,
  duration_min    int not null,
  calories_burned float not null,
  notes           text,
  created_at      timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "own workouts" on public.workouts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.workouts (user_id, date);
