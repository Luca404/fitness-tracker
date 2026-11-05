-- Consecutive positions; ties on points are resolved alphabetically by username.
-- Rank, pagination and own position use the same total ordering.
create or replace function public.get_fitness_leaderboard(p_limit integer default 25,p_offset integer default 0)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if not exists(select 1 from public.user_health_profiles where user_id = auth.uid()) then
    raise exception 'Completa prima il profilo';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Pagina non valida' using errcode = '22023';
  end if;
  -- Include accounts that have completed onboarding but never opened points.
  -- Preserve existing start dates, reference targets and timezones.
  insert into public.fitness_points_settings(user_id,started_on,timezone,sugars_target,alcohol_target,reference_weight)
  select p.user_id,greatest(date '2026-11-04',(p.created_at at time zone 'Europe/Rome')::date),'Europe/Rome',
    coalesce(g.calorie_target,2000) * 0.15 / 4,
    case when p.age < 18 then 0 when p.sex = 'male' and p.age < 65 then 2 else 1 end,p.weight_kg
  from public.user_health_profiles p left join public.user_goals g on g.user_id = p.user_id
  where not exists(select 1 from public.fitness_points_settings s where s.user_id = p.user_id)
  on conflict(user_id) do nothing;

  with totals as materialized (
    select u.user_id,u.username,greatest(0,coalesce(s.total,0)) as total
    from public.fitness_usernames u
    cross join lateral (select sum(d.points) as total from public.fitness_points_days_for_user(u.user_id) d) s
  ), ranked as materialized (
    select username,total,row_number() over(order by total desc,username collate "C") as rank,user_id = auth.uid() as is_me from totals
  ), page as (
    select * from ranked order by total desc,username collate "C" limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'entries',coalesce((select jsonb_agg(to_jsonb(p) order by p.total desc,p.username collate "C") from page p),'[]'::jsonb),
    'me',(select to_jsonb(r) from ranked r where r.is_me),
    'total_users',(select count(*) from ranked),
    'has_more',p_offset::bigint + p_limit < (select count(*) from ranked)
  ) into v_result;
  return v_result;
end $$;
revoke all on function public.get_fitness_leaderboard(integer,integer) from public,anon,authenticated;
grant execute on function public.get_fitness_leaderboard(integer,integer) to authenticated;
