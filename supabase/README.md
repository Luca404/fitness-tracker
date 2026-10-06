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
