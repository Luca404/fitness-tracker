-- Run only in a fresh isolated fixture database after workout_distance.sql.
-- Fixture table: workouts(activity text, duration_min int, calories_burned float).
begin;
do $$
begin
  if current_database() not like 'fittrackr_distance_test_%' then
    raise exception 'Use an isolated fittrackr_distance_test_* database';
  end if;
end $$;

insert into public.workouts(activity, duration_min, calories_burned)
values ('walking', 30, 140);
insert into public.workouts(activity, duration_min, calories_burned, distance_km)
values ('walking', 60, 304, 5.25);

do $$
declare
  invalid double precision;
begin
  if not exists (select 1 from public.workouts where distance_km is null) then
    raise exception 'Old duration-only writes must keep NULL distance';
  end if;
  if not exists (select 1 from public.workouts where distance_km = 5.25) then
    raise exception 'Decimal kilometres must round trip';
  end if;
  foreach invalid in array array[0::double precision, -1, 1001, 'NaN'::double precision,
    'Infinity'::double precision, '-Infinity'::double precision]
  loop
    begin
      insert into public.workouts(activity, duration_min, calories_burned, distance_km)
      values ('walking', 30, 140, invalid);
      raise exception 'Expected invalid distance % to fail', invalid;
    exception when check_violation then null;
    end;
  end loop;
end $$;
rollback;
