-- Self-contained regression test for a fresh, disposable PostgreSQL database.
-- psql -X -v ON_ERROR_STOP=1 -d fittrackr_tutorial_test_* -f this_file.sql
\set ON_ERROR_STOP on

do $$
begin
  if current_database() not like 'fittrackr_tutorial_test_%' then
    raise exception 'Use a fresh isolated fittrackr_tutorial_test_* database';
  end if;
end $$;

-- Only the columns needed for the preference and a legacy profile update.
create table public.user_health_profiles (
  user_id uuid primary key,
  height_cm integer not null default 180
);
insert into public.user_health_profiles (user_id)
values ('00000000-0000-0000-0000-000000000001');

\ir ../migrations/20261031120000_quick_tutorial.sql

begin;
insert into public.user_health_profiles (user_id)
values ('00000000-0000-0000-0000-000000000002');

do $$
begin
  if not (select tutorial_seen from public.user_health_profiles
    where user_id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'Existing profiles must not receive the guide automatically';
  end if;
  if (select tutorial_seen from public.user_health_profiles
    where user_id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'New profiles must receive the guide';
  end if;
end $$;

-- The current health-onboarding RPC omits tutorial_seen on INSERT/ON CONFLICT.
-- Verify that a legacy-shaped profile upsert preserves the preference.
update public.user_health_profiles set tutorial_seen = true
where user_id = '00000000-0000-0000-0000-000000000002';
insert into public.user_health_profiles (user_id, height_cm)
values ('00000000-0000-0000-0000-000000000002', 185)
on conflict (user_id) do update set height_cm = excluded.height_cm;

do $$
begin
  if not (select tutorial_seen from public.user_health_profiles
    where user_id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'Editing a profile must preserve tutorial dismissal';
  end if;
  begin
    update public.user_health_profiles set tutorial_seen = null;
    raise exception 'NULL preferences must be rejected';
  exception when not_null_violation then null;
  end;
end $$;

-- Same owner-scoped policy used by health profiles. No new public RPC is needed.
create role fittrackr_tutorial_test_user nologin;
grant usage on schema public to fittrackr_tutorial_test_user;
grant select, update on public.user_health_profiles to fittrackr_tutorial_test_user;
alter table public.user_health_profiles enable row level security;
create policy "own profile" on public.user_health_profiles
  for all using (user_id = current_setting('request.jwt.claim.sub', true)::uuid)
  with check (user_id = current_setting('request.jwt.claim.sub', true)::uuid);

update public.user_health_profiles set tutorial_seen = false;
set local role fittrackr_tutorial_test_user;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';

do $$
declare
  affected integer;
begin
  update public.user_health_profiles set tutorial_seen = true
  where user_id = '00000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Users must be able to dismiss their guide'; end if;

  update public.user_health_profiles set tutorial_seen = true
  where user_id = '00000000-0000-0000-0000-000000000001';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Users must not dismiss another account guide'; end if;
end $$;

reset role;
rollback;
