# Shared Supabase workflow

Reviewed on 2026-10-04. FitTrackr and `../trackr/` link to hosted project `nitbisweytddtigoebeh`. Auth users, database roles/default grants and migration history are shared; FitTrackr application tables have user ownership policies. A frontend URL at `http://127.0.0.1:54321` uses a separate local database.

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

Frontend CI uses mocked data. SQL tests in `supabase/tests/` need an isolated PostgreSQL database with synthetic Auth/roles: `alcohol_strength.sql` runs after the full fitness schema; `ordering.sql` reconstructs historical fixtures and applies ordering migrations in its transaction, so use the migration cutoff specified in the project README. Do not run fixture tests against the hosted or application database. Trackr also runs shared-schema security/concurrency tests in its separate `trackr_security_tests` database.

The older local Trackr instance received the seven security changes without replaying all historical fitness upgrades. This does not claim that its fitness schema matches the hosted project. Back up local data before upgrading it; preserve the distinction between local schema compatibility and hosted migration status.

On 2026-10-08, Trackr applied shared infrastructure migration `20261008120000_render_backend_keepalive` to the hosted project. Its identical SQL is mirrored here to keep migration ledgers synchronized. The named Supabase cron calls Trackr's public Render `/health` every 10 minutes via `pg_net`; it does not query or change fitness/application data. Operational checks and pause/remove commands are documented in `../trackr/docs/render-keepalive.md` (relative to the application root). Do not drop the shared extensions when disabling this job.

## Meal-photo Edge Function — 2026-10-08

`analyze-meal-photo` was deployed to `nitbisweytddtigoebeh` from [commit 8bf11f3](https://github.com/Luca404/fitness-tracker/commit/8bf11f3bf37ff3ebde33a721105857afcc47f0b5) using `supabase functions deploy analyze-meal-photo --project-ref nitbisweytddtigoebeh --no-verify-jwt`. The function validates the bearer token through Supabase Auth before calling OpenAI; disabling the gateway JWT check does not allow anonymous analysis.

The existing `OPENAI_API_KEY` and `OPENAI_VISION_MODEL` secrets were present. `OPENAI_MEAL_PHOTO_MODEL` is an optional task-specific override. The deployed endpoint returned `OPTIONS 200` and `POST 401` with the application's invalid-session message for an unauthenticated request. These probes sent no photos and did not test a real authenticated OpenAI analysis.

No schema or grant changes were needed for this feature: `ai_meal_photo` is stored in the existing source text field and the existing diary RPCs handle registration and edits. This Edge Function release is separate from the shared keepalive migration above. See [the meal-photo guide](../docs/pasti-da-foto.md) for behavior, test results and release status.
