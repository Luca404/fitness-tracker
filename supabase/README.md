# Shared Supabase workflow

## Refined dish types and chart presentation — 2026-11-05

`20261105220000_refine_dish_categories` was applied after a dry-run listing
only this migration and mirrored identically in Trackr (SHA-256 checked).
There are now 11 dish types: pizza/legumes/eggs/dairy are retired, while
vegan_main and yogurt are added. The backfill removes only retired labels;
recipes, ingredients, meal types and usage history are preserved. No dietary
classification is inferred. Old five-argument clients can still submit known
retired labels, which are discarded; unknown values fail validation. The
four-argument functions, invoker RLS and explicit authenticated grants remain.

`tests/refine_dish_categories.sql` passed with synthetic fixtures and rollback
in `fittrackr_dish_test_refine_20261105`, covering cleanup, preservation,
new/old clients, atomic errors, table constraints and ownership. The local
application database was not upgraded.

All 596 frontend tests passed, followed by 17 targeted editor/meal tests after
adding current-meal priority for multi-meal recipes; build and lint passed.
Browser fixtures at 320/390/768/1440 px verified adaptive, non-overlapping
Y labels across Weight/History/Gym Progress, dark tooltips, pointer/touch focus
without white borders and retained green keyboard focus/arrow navigation.
Category pills and all four meal priorities passed, as did the compact
wellbeing points table. No runtime errors or horizontal overflow were seen;
Recharts still emitted transient initial-size warnings before measurement.
Hosted frontend behavior was not verified in these local checks. See
[charts](../docs/grafici.md) and [recipe types](../docs/interfaccia-e-ricettario.md).

## Secondary dish categories and recent usage — 2026-11-05

`20261105210000_dish_secondary_categories_and_usage` was applied after a
dry-run listing only this migration and mirrored in Trackr. It adds optional
`dishes.categories` with a validated set of 13 secondary types, independent of
meal types. Existing recipes start uncategorized and stay visible. New
five-argument create/update overloads save categories atomically; old signatures
remain usable and old updates preserve the new column. Explicit authenticated
execution grants and existing invoker/RLS behavior are preserved.

`get_recent_dish_usage()` is an owner-scoped authenticated read, counting diary
entries from the last 30 dates through today in Europe/Rome, including prepared
portions via their source recipe. Future entries, other accounts and preparation
snapshots are excluded. Corrections/deletions recalculate usage; no client-written
counter or scheduled job is involved. Existing meal/entry ownership indexes are
reused. The older local application database was not upgraded.

`tests/dish_secondary_categories_and_usage.sql` passed with synthetic fixture
data and rollback in `fittrackr_dish_test_categories_20261105`, covering atomic
validation, old clients, ownership, the 30-day boundary, prepared sources and
deletions. All 589 frontend tests, build and lint passed. Mocked browser checks
at 320/390/768/1440 px covered recipe editing, combined search/type filters,
prepared recipes, usage order before/after logging and the loaded local font.
Points/Fitness/History/Weight/Settings also rendered at mobile size without
overflow or runtime errors. Recharts emitted two transient initial-size warnings
on the empty Weight fixture. Hosted frontend behavior is not verified here.
See [the UI and recipe guide](../docs/interfaccia-e-ricettario.md).

## Consecutive leaderboard positions — 2026-11-05

`20261105160000_fitness_leaderboard_positions` was applied after a dry-run
listing only this migration and mirrored in Trackr. It replaces tied ranks
with consecutive positions ordered by total descending, then username using
the same C collation as pagination. Own position follows the same ordering;
points formulas, account scope and explicit authenticated RPC grants are kept.

The isolated leaderboard SQL fixture passed, including three tied zero scores,
alphabetical order, renamed users, global positions across pages, own position
and existing security checks. Targeted frontend tests, build and lint passed.
Browser fixtures at 320/390/1440 px verified gold/silver/bronze, removed manual
refresh and explanatory copy, pagination, automatic refresh and error/retry.
Rules remain available in the collapsed section. No runtime errors or overflow
were observed; the simulated 503 read failure was expected. Local application
tables were not upgraded; the frontend deployment is not verified here.

Username settings now use a text field with `autocomplete="off"` rather than
credential autocomplete, with inline Save and only format limits as help.
Save, duplicate errors and inline layout passed browser fixtures at
320/390/768/1440 px; 20 focused frontend tests, build and lint passed.

## Fitness leaderboard and usernames — 2026-11-05

`20261105150000_fitness_leaderboard` was applied after a dry-run listing only
this migration and mirrored identically in Trackr (SHA-256 checked). It adds
owner-readable `fitness_usernames`, backfills existing fitness profiles, and
assigns unique `user` + nine random digits on health-profile creation during
onboarding. No shared Auth trigger or finance account is changed. Authenticated
rename RPC normalizes/validates names and rejects duplicates atomically.

The authenticated leaderboard exposes username, total, rank and self marker
only, with bounded pagination and a separate own position. Only completed
fitness profiles participate. The private explicit-account scorer is shared
with the existing own-account wrapper; rules v4, periods, targets and RLS on
source records are preserved. No client execution grant exists on helpers;
the new public RPC grants are explicit.

`tests/fitness_leaderboard.sql` and the existing v4 goal/penalty suite with the
new migration passed in `fittrackr_gamification_test_leaderboard_20261105`,
using synthetic fixtures and rollback. Frontend tests, build and lint passed;
mocked browser checks at 320/390/768/1440 px covered tab/date preservation,
pagination, own position, rename/duplicate and read failure/retry. There were
no runtime errors or horizontal overflows; simulated 409/503 network errors
were expected. The older local application database was not upgraded and the
frontend was not deployed. See [the feature guide](../docs/gamification.md).

## Two food moments and goal deductions — 2026-11-05

`20261105120000_fitness_points_goals_and_penalties` was applied after a dry-run
listing only this migration and mirrored identically in Trackr. Rules version
4 requires two valid food moments for a recorded day and its streak. A known
missed daily minimum deducts 1 point on a valid day. Legumes/fish earn +3 when
reached and deduct 3 when missed at the closed checkpoint of a period with at
least one valid day. Empty diaries/periods and insufficient nutrient data do
not create invented minimum-goal failures.

Known salt/sugar/alcohol excesses always deduct at least 1 point, then one per
whole multiple of their reference: `-max(1, floor(value / max(target, 1)))`.
This follows the requested examples: salt 6g/5g is -1, 10g/5g is -2 and 16g/5g
is -3. The previous rounded-to-zero deductions and cap of -3 are removed.
With zero alcohol target any known positive quantity costs at least 1 point.
Wellbeing still settles after the day/week ends; source edits recalculate the
history. Existing RLS, authenticated RPC grants and private helper grants are
preserved. The local older application database was not upgraded.

`fitness_points_goals_and_penalties.sql` passed in an isolated transaction
fixture, covering two-moment qualification, streaks, daily/weekly misses,
strict-limit boundaries, 5.001g/6g/10g/15g/16g/20g/40g salt, other references,
partial nutrients, zero alcohol target, period timing, source corrections,
score sums, empty periods and account isolation. Browser fixture checks passed
at 320/390/768/1440 px: two moments registered, 16g salt showing -3, missed
legumes/fish showing -3 each and reached weekly goals showing +3. No runtime
errors or horizontal overflow were observed. All 566 frontend tests, build and
lint passed, including the updated copy and missed-goal status.

## Smaller points and stable header — 2026-11-05

`20261104150000_scale_fitness_points` was applied after a dry-run listing only
this migration, and mirrored identically in Trackr. Rules version 3 divides
points by ten with integer rounding: diary 2, daily habits 1, weekly habits 3,
streak bonuses 2/4/10, and movement capped at 12 per day. Deductions are divided
by ten and rounded, including negative half ties away from zero. Movement is
rounded on its cumulative amount to preserve the split-session protection.
Daily and lifetime scores sum the rounded award rows, and history is
recalculated from sources in the same unit. Nutrient targets and streak lengths
are unchanged. Existing owner policies and RPC grants remain unchanged.

`fitness_points_scale.sql` passed in an isolated synthetic PostgreSQL fixture,
covering the reduced total over 35 days, bonus/penalty rounding, period timing,
source corrections, row/day consistency and the shared movement cap. Frontend
checks cover cached counters on navigation, date changes, background errors,
layout remounts and account switches. Browser checks at 320/390/768/1440 px
confirmed uncropped, vertically centered icons; no counter placeholders during
navigation/refresh; the day selector first; and no today shortcut. The expected
simulated failed read was the only console error. Hosted frontend deployment
was not verified in these local checks.

## Automatic fitness points and streaks — 2026-11-04

The three fitness-only migrations were applied to the hosted project in order,
each after a dry-run listing only that migration, and mirrored identically in
`../trackr/supabase/migrations/`:

- `20261104120000_fitness_gamification`: settings, initial scoring, owner access
  and a meal-item lookup index.
- `20261104130000_fitness_points_by_default`: initialize existing fitness
  profiles and automatically initialize new profiles on the first points read.
- `20261104140000_automatic_fitness_points`: rules version 2; automatic diary
  qualification/streaks, immediate movement points, daily/weekly wellbeing
  settlement after the saved timezone's period ends, and no manual confirmation.

The initial opt-in and diary-confirmation proposal is superseded. Points are
on for every fitness account, with no activation or completion button. Three
valid food moments qualify a recorded day immediately. Wellbeing rewards and
excess deductions remain pending during the open day/checkpoint, then appear
on the next read without an award job or user action. Source edits/deletions
recalculate affected points and later streaks/checkpoints. See
[the rules and architecture](../docs/gamification.md).

Existing start dates, timezones and targets are preserved. Existing profiles
without points start on the 2026-11-04 rollout date; future profiles start on
their creation date, never before rollout. New defaults use Europe/Rome. The
onboarding goals exist before lazy initialization, so new-account targets use
those saved values. Other Trackrs accounts without health profiles are not
enrolled; finance tables and Auth configuration are unchanged.

Settings and historical confirmations retain owner SELECT policies; direct
client writes are denied. The scorer no longer reads historical confirmations,
and the old confirmation RPC has no authenticated execution grant. The public
read RPC has an explicit authenticated grant, scopes all sources to auth.uid()
and uses an empty search_path; scorer/summary helpers are inaccessible to
clients. The old activation RPC remains idempotent for compatibility and cannot
reset existing defaults. No score value is accepted from the browser.

The self-contained `fitness_gamification.sql`, `fitness_points_by_default.sql`
and `automatic_fitness_points.sql` checks passed with synthetic Auth/source
fixtures and transaction rollback in separate `fittrackr_gamification_test_*`
PostgreSQL 17 databases. They cover formulas, grants, account isolation,
missing/partial nutrients, edits/deletions, movement rounding/caps/overlap,
default initialization, automatic streaks and period settlement across UTC-12
and UTC+14. These fixture tests must never target application or hosted data.

Frontend validation passed **558 tests**, build and lint. Playwright used mocked
API responses at 320/390/768/1440 px to exercise header navigation, saving a run
and seeing immediate points, automatic wellbeing settlement on a simulated
new day, day selection and error/retry. No activation or confirmation RPC was
called. The deliberately simulated failed read was the only expected console
error; no runtime errors were observed. Hosted frontend deployment has not been
verified as part of these checks.

The local application database remains on its older schema without gym tables
and extended nutrients, so these migrations were not applied there. Do not
replay unrelated local migrations without reviewing the complete upgrade path
and backing up local data.

## Quick tutorial — 2026-10-31

`20261031120000_quick_tutorial` was applied to the hosted project after a
dry-run listing only that migration. It adds
`user_health_profiles.tutorial_seen`: existing profiles get `true`, while
new profiles default to `false`. Completing or skipping the frontend guide
updates the owner profile using existing SELECT/UPDATE grants and RLS; no
new RPC, Auth change or finance-table change is involved. Existing profile
upserts preserve the preference. The identical migration is mirrored in
`../trackr/supabase/migrations/`.

`tests/quick_tutorial.sql` passed in a disposable, network-disabled
PostgreSQL 17 container with a minimal fixture. It checks old/new profile
defaults, preservation across legacy-shaped upserts, NOT NULL and owner
isolation. Frontend validation passed 529 tests, build and lint. The local
application database was not upgraded and the frontend was not deployed.
See [the tutorial guide](../docs/tutorial.md).

## Brevo SMTP — 2026-10-30

Brevo was configured on hosted project `nitbisweytddtigoebeh` through the
Management API using the authenticated CLI session. The relay is
`smtp-relay.brevo.com:587` (STARTTLS), with sender name **Trackrs**. The shared
Auth email limit was raised from 2 to the documented custom-SMTP default of
30 messages per hour. The verified sender, SMTP login and SMTP key were read
from the private, Git-ignored `.env.smtp.local` file (permissions 600); no
credentials were added to frontend variables or tracked configuration.

SMTP fields and the rate limit were read back. The shared Site URL, redirect
allowlist, email confirmation, Google provider and Send Email hook were
preserved. One recovery email was requested for the recipient explicitly
authorized in the conversation: the endpoint returned 200, a read-only check
confirmed the existing account's recovery-send timestamp, and the recipient
confirmed receipt. The reset link was not used to change a password in this
verification. No application user or migration was created.

A preliminary SMTP authentication check from the local computer returned
`525` (unauthorized IP). The subsequent security notification's reported IP
matched the local computer's public IPv4. The assistant did not change Brevo's
IP protection during setup. The owner subsequently reported removing the IP
restriction in Brevo and confirmed that sending works with that configuration.

The owner then pushed frontend commit `b9fda2d` (**sistemata pagina login**) and
reported successful tests of the published version. Email receipt was confirmed
during the setup; deployed frontend validation is owner-reported. Google remains
disabled pending OAuth provider credentials.

## Authentication redirects — 2026-10-30

The hosted Auth configuration was inspected from the terminal using the saved
Supabase CLI session. Email confirmation was already enabled; Google had no
configured credentials and was disabled. Custom SMTP was absent, with the
default two-emails-per-hour limit. A subsequent check also found the Send Email
hook disabled and confirmed that production uses this same project. Supabase
documents restrictions on the default sender, but the owner reports successful
signup emails to non-team users. No delivery test was performed; inspect an
authorized recovery send before treating external SMTP as an observed requirement.

Only `uri_allow_list` was patched to add
`https://fitness-tracker-delta-kohl.vercel.app/` and
`https://fitness-tracker-delta-kohl.vercel.app/reset-password`. The existing
`https://trackr-dusky.vercel.app/**` redirect and shared Trackr Site URL were
preserved. The result was read back and verified; SMTP, Google and email
confirmation settings were unchanged. No database migration was needed.
See [the authentication guide](../docs/autenticazione.md).

## Database workflow

Reviewed on 2026-10-14. FitTrackr and `../trackr/` link to hosted project `nitbisweytddtigoebeh`. Auth users, database roles/default grants and migration history are shared; FitTrackr application tables have user ownership policies. A frontend URL at `http://127.0.0.1:54321` uses a separate local database.

Before changing the hosted schema:

```bash
supabase migration list --linked
supabase db push --linked --dry-run
# Apply only reviewed pending migrations for this repository:
supabase db push --linked
```

Use globally unique versions and synchronize both repositories after shared changes. Do not edit/replay applied migrations, and never run `supabase db reset --linked`. The seven versions through `20261004170500` are already applied remotely; both repositories reported no pending migrations. See [the shared security record](README-trackr-security-sync.md).

Six finance migration files are already-applied ledger markers. They keep version history aligned; they do not rebuild finance tables on a new database. The canonical finance SQL is in [Trackr's migrations](https://github.com/Luca404/trackr/tree/main/supabase/migrations). For a fresh shared installation, reconcile the full migration sources before using markers. The FitTrackr meal-item migration contains the actual SQL and validates the `(entry_id, meal_id)` relationship.

On 2026-10-06, `20261006120000_correct_prepared_batch_weight` was applied to the hosted database after a dry-run listing only that migration. It adds the authenticated remainder-correction RPC and recalculates historical ingredient shares without changing weighed cooked portions. The migration is also mirrored in `../trackr/supabase/migrations/`. Its SQL regression test ran against an isolated database with synthetic Auth, leaving application data untouched. The older local application database still lacks the prepared-batch schema; this migration alone does not upgrade it.

New tables must enable RLS with ownership policies. New postgres-owned public RPCs must explicitly grant `EXECUTE` to authenticated/service roles as needed: default execution for PUBLIC/anon/authenticated is revoked. New anonymous table reads require explicit grants. Existing fitness CRUD/RPC grants are preserved. Keep administrative keys in server/Edge Function secrets.

## Gym exercise catalog and bench angles — 2026-10-15

`20261015120000_gym_exercise_catalog_and_bench` was applied to hosted Supabase on 2026-10-15 after a dry-run listing only this migration. It is mirrored in Trackr and tested in an isolated PostgreSQL database. The older local application database was not upgraded. It creates an account-owned custom exercise catalog, backfills saved plans/session history and adds nullable integer bench angles to plan exercises and session snapshots. Existing unspecified angles remain NULL; the existing save/start RPCs keep their signatures and explicit authenticated grants. Catalog writes happen atomically with plan saves; plan deletion preserves catalog entries. New catalog SELECT/INSERT grants are explicit and subject to RLS.

The self-contained `tests/gym_exercise_catalog_and_bench.sql` refuses database names outside `fittrackr_gym_test_*`; use a fresh empty database and let the test build and roll back its synthetic Auth and gym fixture. It verifies backfill/deduplication, atomic failures, snapshots, previous-load matching by equipment/angle, old clients, user isolation and anonymous denial.

Frontend CI uses mocked data. SQL tests in `supabase/tests/` need an isolated PostgreSQL database with synthetic Auth/roles: `alcohol_strength.sql` runs after the full fitness schema; `ordering.sql` reconstructs historical fixtures and applies ordering migrations in its transaction, so use the migration cutoff specified in the project README. Do not run fixture tests against the hosted or application database. Trackr also runs shared-schema security/concurrency tests in its separate `trackr_security_tests` database.

The older local Trackr instance received the seven security changes without replaying all historical fitness upgrades. This does not claim that its fitness schema matches the hosted project. Back up local data before upgrading it; preserve the distinction between local schema compatibility and hosted migration status.

On 2026-10-08, Trackr applied shared infrastructure migration `20261008120000_render_backend_keepalive` to the hosted project. Its identical SQL is mirrored here to keep migration ledgers synchronized. The named Supabase cron calls Trackr's public Render `/health` every 10 minutes via `pg_net`; it does not query or change fitness/application data. Operational checks and pause/remove commands are documented in `../trackr/docs/render-keepalive.md` (relative to the application root). Do not drop the shared extensions when disabling this job.

## Meal-photo Edge Function — 2026-10-08

`analyze-meal-photo` was deployed to `nitbisweytddtigoebeh` from [commit 8bf11f3](https://github.com/Luca404/fitness-tracker/commit/8bf11f3bf37ff3ebde33a721105857afcc47f0b5) using `supabase functions deploy analyze-meal-photo --project-ref nitbisweytddtigoebeh --no-verify-jwt`. The function validates the bearer token through Supabase Auth before calling OpenAI; disabling the gateway JWT check does not allow anonymous analysis.

The existing `OPENAI_API_KEY` and `OPENAI_VISION_MODEL` secrets were present. `OPENAI_MEAL_PHOTO_MODEL` is an optional task-specific override. The deployed endpoint returned `OPTIONS 200` and `POST 401` with the application's invalid-session message for an unauthenticated request. These probes sent no photos and did not test a real authenticated OpenAI analysis.

No schema or grant changes were needed for this feature: `ai_meal_photo` is stored in the existing source text field and the existing diary RPCs handle registration and edits. This Edge Function release is separate from the shared keepalive migration above. See [the meal-photo guide](../docs/pasti-da-foto.md) for behavior, test results and release status.

## Meal-photo extended nutrients — 2026-10-28

The updated `analyze-meal-photo` function was deployed to
`nitbisweytddtigoebeh` before the frontend push. It now requests and validates
per-component fibre, total sugars and salt alongside calories/macros. The
existing nutrition columns and diary RPCs persist these estimates; no schema
migration or new grants are needed. Deploying the function first keeps the
previous frontend compatible while preparing the new response fields.

The linked migration list showed every version aligned, and
`supabase db push --linked --dry-run` returned **Remote database is up to date**.
The endpoint returned `OPTIONS 200` and `POST 401` with the expected invalid-session
message for an anonymous request. No photos or authenticated OpenAI requests
were sent in this probe. Local validation passed 339 tests, frontend build/lint
and a TypeScript check of the meal-photo function with minimal Deno declarations.

## Workout distance — 2026-10-14

`20261014120000_workout_distance` was applied to the hosted project after a dry-run listing only this migration. It adds nullable `workouts.distance_km` with a positive/maximum-1000 constraint; NULL preserves existing rows and duration-only clients. No RPC, grant or ownership policy changes are required. The SQL is mirrored in Trackr.

The same single migration was applied to the local application database in a transaction with its ledger entry, after a private full backup. Unrelated historical fitness upgrades were not replayed. The SQL regression test ran in an isolated `fittrackr_distance_test_*` database with a minimal synthetic workouts table and verified NULL, decimals, bounds, NaN and infinity. See [the activity/history guide](../docs/attivita-e-storico.md).
