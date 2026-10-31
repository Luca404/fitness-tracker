-- Existing profiles keep their normal entry route. Only profiles created after
-- this migration receive the guide automatically, after health onboarding.
begin;

alter table public.user_health_profiles
  add column tutorial_seen boolean not null default true;

alter table public.user_health_profiles
  alter column tutorial_seen set default false;

comment on column public.user_health_profiles.tutorial_seen is
  'Quick guide completed or skipped. Existing profiles are opted out; new profiles start false.';

-- Existing owner-scoped UPDATE/SELECT grants and RLS apply. No new RPC/grants.
commit;
