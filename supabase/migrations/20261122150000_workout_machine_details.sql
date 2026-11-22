alter table public.workouts
  add column incline_pct numeric(5,2),
  add column stroke_rate_spm numeric(5,2),
  add constraint workouts_treadmill_incline_check
    check (incline_pct is null or (activity = 'treadmill' and incline_pct between -100 and 100)),
  add constraint workouts_rowing_stroke_rate_check
    check (stroke_rate_spm is null or (activity = 'rowing_machine' and stroke_rate_spm > 0 and stroke_rate_spm <= 100));

comment on column public.workouts.incline_pct is 'Optional treadmill grade in percent, including zero and decline.';
comment on column public.workouts.stroke_rate_spm is 'Optional indoor rowing cadence in strokes per minute.';
