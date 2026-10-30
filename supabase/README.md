# Shared Supabase workflow

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
`525` (unauthorized IP). Brevo's IP protection was not changed by this setup;
the subsequent recovery request from hosted Auth was accepted and received.
Only actual sending-server addresses should be authorized if later requests
are blocked; the local check does not establish which IP hosted Auth uses.

This configures the shared email service. The login/reset frontend changes
remain a separate release; email receipt does not verify that a deployed
frontend shows the new password-reset screen.

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
