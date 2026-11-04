-- Points are a default fitness feature for existing and future users.
-- Preserve existing starts, targets, timezones and diary confirmations.
insert into public.fitness_points_settings(user_id,started_on,timezone,sugars_target,alcohol_target,reference_weight)
select p.user_id,greatest(date '2026-11-04',(p.created_at at time zone 'Europe/Rome')::date),'Europe/Rome',
  coalesce(g.calorie_target,2000) * 0.15 / 4,
  case when p.age < 18 then 0 when p.sex = 'male' and p.age < 65 then 2 else 1 end,p.weight_kg
from public.user_health_profiles p left join public.user_goals g on g.user_id = p.user_id
on conflict (user_id) do nothing;

-- Keep the original, stable calculation as an internal helper. Initializing a
-- new fitness account is now part of the public read, never a user action.
alter function public.get_fitness_points(date) rename to fitness_points_summary;
revoke all on function public.fitness_points_summary(date) from public, anon, authenticated;

create function public.get_fitness_points(p_date date default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  if not exists (select 1 from public.fitness_points_settings where user_id = auth.uid()) then
    insert into public.fitness_points_settings(user_id,started_on,timezone,sugars_target,alcohol_target,reference_weight)
    select p.user_id,greatest(date '2026-11-04',(p.created_at at time zone 'Europe/Rome')::date),'Europe/Rome',
      coalesce(g.calorie_target,2000) * 0.15 / 4,
      case when p.age < 18 then 0 when p.sex = 'male' and p.age < 65 then 2 else 1 end,p.weight_kg
    from public.user_health_profiles p left join public.user_goals g on g.user_id = p.user_id
    where p.user_id = auth.uid() on conflict (user_id) do nothing;
    if not exists (select 1 from public.fitness_points_settings where user_id = auth.uid()) then
      raise exception 'Completa prima il profilo';
    end if;
  end if;
  return public.fitness_points_summary(p_date);
end $$;
revoke all on function public.get_fitness_points(date) from public, anon, authenticated;
grant execute on function public.get_fitness_points(date) to authenticated;
-- enable_fitness_points remains compatible with older clients. Its existing
-- ON CONFLICT DO NOTHING cannot reset default settings or duplicate rewards.
