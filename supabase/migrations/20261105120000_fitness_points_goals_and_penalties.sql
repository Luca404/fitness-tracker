-- Version 4: two recorded food moments qualify a day. Missed daily
-- minimum goals deduct one point; weekly goals deduct three points when the period has enough recorded data.
-- Known excess: at least one point, then one per whole multiple of the limit.
-- With salt limit 5g: 5g -> +1; 6g -> -1; 10g -> -2; 16g -> -3.
alter table public.fitness_points_settings drop constraint fitness_points_settings_rules_version_check;
alter table public.fitness_points_settings add constraint fitness_points_settings_rules_version_check check (rules_version in (1,2,3,4));
alter table public.fitness_points_settings alter column rules_version set default 4;
update public.fitness_points_settings set rules_version = 4;

create or replace function public.fitness_points_days()
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
    coalesce(n.meal_count >= 2, false) as confirmed,
    n.vegetables, n.fruit, n.legumes, n.fish, n.fiber, n.sugars, n.salt, n.alcohol,
    n.fiber_complete, n.sugars_complete, n.salt_complete, n.alcohol_complete
  from calendar c left join nutrition n on n.day = c.day
), islands as (
  select d.*, count(*) filter (where not d.confirmed) over (order by d.day) as island from days d
), streaks as (
  select d.*, case when d.confirmed then count(*) filter (where d.confirmed)
    over (partition by d.island order by d.day)::integer else 0 end as streak from islands d
), habit_inputs as (
  select d.day, v.key, v.label, v.value, v.target, v.direction, v.complete, d.confirmed, d.day < d.today as closed
  from days d cross join lateral (values
    ('vegetables','Verdura',d.vegetables,400::numeric,'min',true),
    ('fruit','Frutta',d.fruit,360::numeric,'min',true),
    ('fiber','Fibre',d.fiber,25::numeric,'min',d.fiber_complete),
    ('sugars','Zuccheri totali',d.sugars,d.sugars_target,'max',d.sugars_complete),
    ('salt','Sale',d.salt,5::numeric,'max',d.salt_complete),
    ('alcohol','Alcol',d.alcohol,d.alcohol_target,'max',d.alcohol_complete)
  ) v(key,label,value,target,direction,complete)
), habit_awards as (
  select h.day, h.key, case when (h.direction = 'max' and h.value > h.target)
      or (h.closed and h.direction = 'min' and h.value < h.target and h.complete and h.confirmed)
      then 'penalty' else 'habit' end as kind,
    h.label, case
      when not h.closed then 0
      when h.value is null or h.value = 'NaN'::numeric or h.value >= 'Infinity'::numeric then 0
      when h.direction = 'min' and h.value >= h.target then 1
      when h.direction = 'min' and h.complete and h.confirmed then -1
      when h.direction = 'max' and h.value > h.target then -greatest(1,floor(h.value / greatest(h.target,1)))::integer
      when h.direction = 'max' and h.complete and h.confirmed then 1 else 0 end as points,
    jsonb_build_object('value',h.value,'target',h.target,'partial',not coalesce(h.complete,true),'unit',case when h.key = 'alcohol' then 'UA' else 'g' end,
      'status',case when not h.closed then 'pending'
        when h.value is null or h.value = 'NaN'::numeric or h.value >= 'Infinity'::numeric then 'incomplete'
        when h.direction = 'min' then case when h.value >= h.target then 'earned'
          when not coalesce(h.complete,false) then 'incomplete' when h.confirmed then 'missed' else 'insufficient' end
        when h.value > h.target then 'excess' when not coalesce(h.complete,false) then 'incomplete'
        when not h.confirmed then 'insufficient' else 'earned' end) as detail
  from habit_inputs h
), weekly_awards as (
  select d.day, v.key, case when d.day < d.today and v.value < v.target and w.recorded
      then 'penalty' else 'habit' end as kind, v.label,
    case when d.day >= d.today then 0 when v.value >= v.target then 3 when w.recorded then -3 else 0 end as points,
    jsonb_build_object('value',v.value,'target',v.target,'unit','g','weekly',true,
      'status',case when d.day >= d.today then 'pending' when v.value >= v.target then 'earned'
        when w.recorded then 'missed' else 'insufficient' end) as detail
  from days d cross join lateral (
    select coalesce(sum(n.legumes),0) as legumes, coalesce(sum(n.fish),0) as fish, bool_or(n.confirmed) as recorded
    from days n where n.day between d.day - 6 and d.day
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
    (least(12,round(m.running / 10)) - least(12,round((m.running - m.raw) / 10)))::integer as points,
    m.detail || jsonb_build_object('capped',m.running > 120) as detail from movement_running m
), all_awards as (
  select h.* from habit_awards h union all select w.* from weekly_awards w
  union all select m.* from movement_awards m
  union all select d.day,'diary','diary','Giornata registrata',case when d.confirmed then 2 else 0 end,
    jsonb_build_object('status',case when d.confirmed then 'earned' else 'target' end) from days d
  union all select s.day,'streak','streak','Bonus costanza',
    (case when s.streak = 3 then 2 else 0 end + case when s.streak > 0 and s.streak % 7 = 0 then 4 else 0 end
      + case when s.streak = 30 then 10 else 0 end),jsonb_build_object('status','earned') from streaks s
    where s.streak = 3 or (s.streak > 0 and s.streak % 7 = 0) or s.streak = 30
)
select s.day,s.meal_count,s.confirmed,s.streak,coalesce(sum(a.points),0)::integer,
  coalesce(jsonb_agg(jsonb_build_object('key',a.key,'kind',a.kind,'label',a.label,'points',a.points,'detail',a.detail)
    order by a.kind,a.key) filter (where a.key is not null),'[]'::jsonb),
  coalesce((select sum(m.raw) / 10 from movement m where m.day = s.day),0)
from streaks s left join all_awards a on a.day = s.day
group by s.day,s.meal_count,s.confirmed,s.streak
$$;

revoke all on function public.fitness_points_days() from public,anon,authenticated;
