-- Fitness-only, opt-in points v1. Scores are derived from persisted sources;
-- clients can neither insert awards nor submit a points value.
create table public.fitness_points_settings (
  user_id uuid primary key references auth.users on delete cascade,
  started_on date not null,
  timezone text not null,
  rules_version integer not null default 1 check (rules_version = 1),
  sugars_target numeric not null check (sugars_target > 0),
  alcohol_target numeric not null check (alcohol_target >= 0),
  reference_weight numeric not null check (reference_weight between 20 and 400),
  created_at timestamptz not null default now()
);
create table public.fitness_points_confirmations (
  user_id uuid not null references public.fitness_points_settings on delete cascade,
  date date not null,
  fingerprint text not null,
  confirmed_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.fitness_points_settings enable row level security;
alter table public.fitness_points_confirmations enable row level security;
create policy fitness_points_settings_owner on public.fitness_points_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy fitness_points_confirmations_owner on public.fitness_points_confirmations
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.fitness_points_settings, public.fitness_points_confirmations from public, anon, authenticated;
grant select on public.fitness_points_settings, public.fitness_points_confirmations to authenticated;
create index fitness_points_meal_items_meal_idx on public.meal_items(meal_id);

-- Same reference MET and speed bands as src/utils/met.ts (game inputs, not
-- a new exercise recommendation). Keep these in sync when adding activities.
create function public.fitness_points_met(p_activity text, p_minutes numeric, p_km numeric)
returns numeric language sql immutable set search_path = '' as $$
  with reference(activity, met) as (values
    ('running',9.8),('walking',3.5),('cycling',7.5),('swimming',8.0),
    ('weights',5.0),('treadmill',5.8),('rowing_machine',5.0),('hiit',10.0),
    ('yoga',2.5),('pilates',3.0),('elliptical',5.0),('rowing',7.0),
    ('skiing',6.0),('tennis',7.3),('football',7.0),('basketball',6.5),
    ('climbing',8.0),('dancing',5.0),('boxing',9.0),('stretching',2.3),
    ('hiking',6.0),('spinning',8.5)
  ), bands(activity, speed, met) as (values
    ('walking',0,2.3),('walking',3.2,2.8),('walking',4,3),('walking',4.5,3.8),
    ('walking',5.6,4.8),('walking',6.4,5.5),('walking',7.2,7),('walking',8,8.5),
    ('running',0,3.3),('running',6.4,6.5),('running',6.9,7.8),('running',8,8.5),
    ('running',8.9,9),('running',9.7,9.3),('running',10.8,10.5),('running',11.3,11),
    ('running',12.1,11.8),('running',12.9,12),('running',13.8,12.5),('running',14.5,13),
    ('running',15,14.8),('running',17.7,16.8),('running',19.3,18.5),('running',20.9,19.8),('running',22.5,23),
    ('cycling',0,4),('cycling',16.1,6.8),('cycling',19.3,8),('cycling',22.5,10),('cycling',25.7,12),('cycling',32.2,16.8),
    ('treadmill',0,2.1),('treadmill',1.6,2.3),('treadmill',1.9,2.8),('treadmill',3.2,3),
    ('treadmill',4,3.5),('treadmill',4.8,3.8),('treadmill',5.6,4.8),('treadmill',6.4,5.8),('treadmill',7.2,6.8),('treadmill',8,8.3)
  ) select case when p_minutes <= 0 or p_minutes > 1440 or p_minutes = 'NaN'::numeric then 0
    when p_km is not null and (p_km <= 0 or p_km > 1000 or p_km = 'NaN'::numeric) then 0
    when p_km is not null and p_km * 60 / p_minutes > case p_activity when 'walking' then 12 when 'cycling' then 80 else 30 end
      and p_activity in ('walking','running','cycling','treadmill') then 0
    else coalesce((select b.met from bands b where p_km is not null
      and b.activity = case when p_activity = 'treadmill' and p_km * 60 / p_minutes >= 9.7 then 'running' else p_activity end
      and b.speed <= p_km * 60 / p_minutes order by speed desc limit 1),
      (select r.met from reference r where r.activity = p_activity), 0) end
$$;

-- Internal function: explicit caller scoping also holds under SECURITY DEFINER.
create function public.fitness_points_days()
returns table(date date, meal_count integer, confirmed boolean, streak integer, points integer, awards jsonb, movement_raw numeric)
language sql stable security definer set search_path = '' as $$
with settings as (
  select s.*, (now() at time zone s.timezone)::date as today
  from public.fitness_points_settings s where s.user_id = auth.uid()
), calendar as (
  select s.*, s.started_on + n as day from settings s,
  lateral generate_series(0, s.today - s.started_on) n
), items as (
  select m.date as day, m.meal_type, mi.*
  from public.meals m join public.meal_items mi on mi.meal_id = m.id
  join settings s on s.user_id = m.user_id and m.date between s.started_on and s.today
), nutrition as (
  select i.day,
    count(distinct i.meal_type) filter (where i.meal_type <> 'drinks'
      and i.category not in ('alcohol','beverage','condiment','seasoning','supplement','fat','sauce')
      and i.quantity_g > 0 and i.quantity_g < 'Infinity'::float8 and coalesce(i.alcohol_abv,0) = 0)::integer as meal_count,
    md5(jsonb_agg(to_jsonb(i) order by i.id)::text) as fingerprint,
    coalesce(sum(i.quantity_g) filter (where i.unit = 'g' and i.category = 'vegetable'),0)::numeric as vegetables,
    coalesce(sum(i.quantity_g) filter (where i.unit = 'g' and i.category = 'fruit'),0)::numeric as fruit,
    coalesce(sum(i.quantity_g) filter (where i.unit = 'g' and i.category = 'legume'),0)::numeric as legumes,
    coalesce(sum(i.quantity_g) filter (where i.unit = 'g' and i.category = 'fish'),0)::numeric as fish,
    sum(i.fiber_g)::numeric as fiber, sum(i.sugars_g)::numeric as sugars, sum(i.salt_g)::numeric as salt,
    bool_and(i.fiber_g is not null and i.fiber_g >= 0 and i.fiber_g < 'Infinity'::float8) as fiber_complete,
    bool_and(i.sugars_g is not null and i.sugars_g >= 0 and i.sugars_g < 'Infinity'::float8) as sugars_complete,
    bool_and(i.salt_g is not null and i.salt_g >= 0 and i.salt_g < 'Infinity'::float8) as salt_complete,
    coalesce(sum(i.quantity_g * i.alcohol_abv / 100 * 0.789 / 12) filter (where i.unit = 'ml'
      and i.alcohol_abv between 0 and 100),0)::numeric as alcohol,
    bool_and(case when i.category = 'alcohol' or i.alcohol_abv > 0
      then coalesce(i.alcohol_abv = 0 or (i.alcohol_abv between 0 and 100 and i.unit = 'ml'),false) else true end) as alcohol_complete
  from items i group by i.day
), days as (
  select c.*, coalesce(n.meal_count,0) as meal_count,
    coalesce(n.meal_count >= 3 and f.fingerprint = n.fingerprint, false) as confirmed,
    n.vegetables, n.fruit, n.legumes, n.fish, n.fiber, n.sugars, n.salt, n.alcohol,
    n.fiber_complete, n.sugars_complete, n.salt_complete, n.alcohol_complete
  from calendar c left join nutrition n on n.day = c.day
  left join public.fitness_points_confirmations f on f.user_id = c.user_id and f.date = c.day
), islands as (
  select d.*, count(*) filter (where not d.confirmed) over (order by d.day) as island from days d
), streaks as (
  select d.*, case when d.confirmed then count(*) filter (where d.confirmed)
    over (partition by d.island order by d.day)::integer else 0 end as streak from islands d
), habit_inputs as (
  select d.day, v.key, v.label, v.value, v.target, v.direction, v.complete, d.confirmed
  from days d cross join lateral (values
    ('vegetables','Verdura',d.vegetables,400::numeric,'min',true),
    ('fruit','Frutta',d.fruit,360::numeric,'min',true),
    ('fiber','Fibre',d.fiber,25::numeric,'min',d.fiber_complete),
    ('sugars','Zuccheri totali',d.sugars,d.sugars_target,'max',d.sugars_complete),
    ('salt','Sale',d.salt,5::numeric,'max',d.salt_complete),
    ('alcohol','Alcol',d.alcohol,d.alcohol_target,'max',d.alcohol_complete)
  ) v(key,label,value,target,direction,complete)
), habit_awards as (
  select h.day, h.key, case when h.direction = 'max' and h.value > h.target then 'penalty' else 'habit' end as kind,
    h.label, case
      when h.value is null or h.value = 'NaN'::numeric or h.value >= 'Infinity'::numeric then 0
      when h.direction = 'min' and h.value >= h.target then 10
      when h.direction = 'max' and h.value > h.target then -least(30,ceil(10 * (h.value - h.target) / greatest(h.target,1)))::integer
      when h.direction = 'max' and h.complete and h.confirmed then 10 else 0 end as points,
    jsonb_build_object('value',h.value,'target',h.target,'partial',not coalesce(h.complete,true),'unit',case when h.key = 'alcohol' then 'UA' else 'g' end,
      'status',case when h.value is null or h.value = 'NaN'::numeric or h.value >= 'Infinity'::numeric then 'incomplete'
        when h.direction = 'min' then case when h.value >= h.target then 'earned' when not coalesce(h.complete,false) then 'incomplete' else 'target' end
        when h.value > h.target then 'excess' when not coalesce(h.complete,false) then 'incomplete'
        when not h.confirmed then 'confirmation' else 'earned' end) as detail
  from habit_inputs h
), weekly_awards as (
  select d.day, v.key, 'habit'::text as kind, v.label,
    case when v.value >= v.target then 30 else 0 end as points,
    jsonb_build_object('value',v.value,'target',v.target,'unit','g','weekly',true,
      'status',case when v.value >= v.target then 'earned' else 'target' end) as detail
  from days d cross join lateral (
    select coalesce(sum(n.legumes),0) as legumes, coalesce(sum(n.fish),0) as fish
    from nutrition n where n.day between d.day - 6 and d.day
  ) w cross join lateral (values ('legumes','Legumi · 7 giorni',w.legumes,450),('fish','Pesce · 7 giorni',w.fish,300)) v(key,label,value,target)
  where (d.day - d.started_on + 1) % 7 = 0
), activity_inputs as (
  select w.*, public.fitness_points_met(w.activity,w.duration_min::numeric,w.distance_km::numeric) as met
  from public.workouts w join settings s on s.user_id = w.user_id and w.date between s.started_on and s.today
), gym_inputs as (
  select g.*, s.reference_weight,
    greatest(0,extract(epoch from (g.completed_at - greatest(g.started_at,coalesce(
      max(g.completed_at) over (partition by g.date order by g.started_at,g.id rows between unbounded preceding and 1 preceding),g.started_at)))) / 60)::numeric as minutes,
    (select avg(case when lower(gs.equipment) in ('corpo libero','sbarra') then 3
      when lower(coalesce(gs.exercise_key,gs.exercise_name)) ~ 'squat|deadlift|stacco' then 5 else 3.5 end
      + least(0.75,greatest(0,coalesce(gs.weight_kg,0)) * case when gs.per_side or lower(gs.equipment) = 'manubri' then 2 else 1 end / s.reference_weight * 0.6))
      from public.gym_sets gs where gs.session_id = g.id and gs.done and gs.reps > 0) as met
  from public.gym_sessions g join settings s on s.user_id = g.user_id and g.date between s.started_on and s.today
  where g.completed_at > g.started_at and g.completed_at <= now()
    and g.completed_at - g.started_at <= interval '4 hours'
    and exists (select 1 from public.gym_sets gs where gs.session_id = g.id and gs.done and gs.reps > 0)
), movement as (
  select a.date as day, a.id::text as key, 'activity'::text as kind, a.activity as label,
    least(a.duration_min,120) * a.met / 10 + coalesce(least(a.distance_km::numeric,100),0)
      * case a.activity when 'running' then 2 when 'cycling' then 0.5 when 'walking' then 1 when 'treadmill' then 1.5 else 0 end as raw,
    jsonb_build_object('minutes',a.duration_min,'km',a.distance_km,'met',a.met,'status','earned') as detail
  from activity_inputs a where a.met > 0
  union all
  select g.date, g.id::text, 'gym', g.plan_name,
    0.4 * least(g.minutes,120) + 0.03 * least(round(g.met * g.reference_weight * least(g.minutes,120) / 60),1200),
    jsonb_build_object('minutes',round(g.minutes,1),'kcal',round(g.met * g.reference_weight * g.minutes / 60),'status','earned')
  from gym_inputs g where g.minutes > 0 and g.met > 0
), movement_running as (
  select m.*, sum(m.raw) over (partition by m.day order by m.kind,m.key) as running from movement m
), movement_awards as (
  select m.day,m.key,m.kind,m.label,
    (least(120,round(m.running)) - least(120,round(m.running - m.raw)))::integer as points,
    m.detail || jsonb_build_object('capped',m.running > 120) as detail from movement_running m
), all_awards as (
  select h.* from habit_awards h union all select w.* from weekly_awards w
  union all select m.* from movement_awards m
  union all select d.day,'diary','diary','Giornata registrata',case when d.confirmed then 20 else 0 end,
    jsonb_build_object('status',case when d.confirmed then 'earned' else 'confirmation' end) from days d
  union all select s.day,'streak','streak','Bonus costanza',
    (case when s.streak = 3 then 15 else 0 end + case when s.streak > 0 and s.streak % 7 = 0 then 40 else 0 end
      + case when s.streak = 30 then 100 else 0 end),jsonb_build_object('status','earned') from streaks s
    where s.streak = 3 or (s.streak > 0 and s.streak % 7 = 0) or s.streak = 30
)
select s.day,s.meal_count,s.confirmed,s.streak,coalesce(sum(a.points),0)::integer,
  coalesce(jsonb_agg(jsonb_build_object('key',a.key,'kind',a.kind,'label',a.label,'points',a.points,'detail',a.detail)
    order by a.kind,a.key) filter (where a.key is not null),'[]'::jsonb),
  coalesce((select sum(m.raw) from movement m where m.day = s.day),0)
from streaks s left join all_awards a on a.day = s.day
group by s.day,s.meal_count,s.confirmed,s.streak
$$;

create function public.enable_fitness_points(p_timezone text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Fuso orario non valido';
  end if;
  insert into public.fitness_points_settings(user_id,started_on,timezone,sugars_target,alcohol_target,reference_weight)
  select p.user_id,(now() at time zone p_timezone)::date,p_timezone,
    coalesce(g.calorie_target,2000) * 0.15 / 4,
    case when p.age < 18 then 0 when p.sex = 'male' and p.age < 65 then 2 else 1 end,p.weight_kg
  from public.user_health_profiles p left join public.user_goals g on g.user_id = p.user_id
  where p.user_id = auth.uid() on conflict (user_id) do nothing;
  if not found and not exists (select 1 from public.fitness_points_settings where user_id = auth.uid()) then
    raise exception 'Completa prima il profilo';
  end if;
end $$;

create function public.confirm_fitness_points_day(p_date date, p_includes_drinks boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_day record; v_fingerprint text;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if p_includes_drinks is distinct from true then raise exception 'Conferma anche le bevande'; end if;
  select * into v_day from public.fitness_points_days() where date = p_date;
  if v_day.date is null then raise exception 'Data fuori dal periodo punti'; end if;
  if v_day.meal_count < 3 then raise exception 'Registra almeno tre momenti alimentari'; end if;
  -- Exact source snapshot, compared on every read. Concurrent changes invalidate
  -- the confirmation automatically; no per-item triggers or duplicate ledger.
  select md5(jsonb_agg(to_jsonb(i) order by i.id)::text) into v_fingerprint from (
    select m.date as day,m.meal_type,mi.* from public.meals m join public.meal_items mi on mi.meal_id = m.id
    where m.user_id = auth.uid() and m.date = p_date
  ) i;
  insert into public.fitness_points_confirmations(user_id,date,fingerprint)
  values (auth.uid(),p_date,v_fingerprint)
  on conflict (user_id,date) do update set fingerprint = excluded.fingerprint, confirmed_at = now();
end $$;

create function public.get_fitness_points(p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_settings public.fitness_points_settings; v_today date; v_date date; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  select * into v_settings from public.fitness_points_settings where user_id = auth.uid();
  if not found then return jsonb_build_object('enabled',false); end if;
  v_today := (now() at time zone v_settings.timezone)::date;
  v_date := coalesce(p_date,v_today);
  with days as materialized (select * from public.fitness_points_days())
  select jsonb_build_object('enabled',true,'started_on',v_settings.started_on,'timezone',v_settings.timezone,
    'rules_version',v_settings.rules_version,'today',v_today,'selected_date',v_date,
    'sugars_target',v_settings.sugars_target,'alcohol_target',v_settings.alcohol_target,
    'total',greatest(0,coalesce((select sum(points) from days),0)),
    'net_total',coalesce((select sum(points) from days),0),
    'streak',coalesce((select streak from days where date in (v_today,v_today - 1) and confirmed order by date desc limit 1),0),
    'best_streak',coalesce((select max(streak) from days),0),
    'registered_days',(select count(*) from days where confirmed),
    'day',(select to_jsonb(d) from days d where d.date = v_date),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.date desc) from (
      select * from days where date <= least(v_date,v_today) order by date desc limit 30
    ) h),'[]'::jsonb),
    'has_older',v_settings.started_on < least(v_date,v_today) - 29) into v_result;
  return v_result;
end $$;

-- No implicit PUBLIC/anonymous execution, including internal helper functions.
revoke all on function public.fitness_points_met(text,numeric,numeric), public.fitness_points_days(),
  public.enable_fitness_points(text),public.confirm_fitness_points_day(date,boolean),public.get_fitness_points(date)
  from public, anon, authenticated;
grant execute on function public.enable_fitness_points(text),public.confirm_fitness_points_day(date,boolean),
  public.get_fitness_points(date) to authenticated;
