# Local development and database setup

This project uses the Supabase stack shared by the Trackrs applications. Keep
the repositories in this layout:

```text
Trackrs/
├── supabase/          # shared Supabase CLI project (project_id = "trackr")
└── fitness-tracker/
```

## Prerequisites

- Node.js 20 or newer
- npm
- Docker
- Supabase CLI (using `npx supabase` is sufficient)

## Install the frontend

From `fitness-tracker/`:

```bash
npm ci
```

Create `.env.local` with the values printed by `npx supabase status`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable/anon key>
```

Never commit `.env.local` or Supabase service-role keys.

## Start the shared Supabase stack

Run Supabase commands from the shared CLI project:

```bash
cd ../supabase
npx supabase start
npx supabase status
```

The expected local endpoints are API `54321`, PostgreSQL `54322`, Studio
`54323`, and Inbucket `54324`.

## Apply the fitTrackr migrations on a new computer

The canonical fitTrackr migrations live in
`fitness-tracker/supabase/migrations/`. Copy them into the shared CLI project
before resetting a brand-new local database:

```bash
cp ../fitness-tracker/supabase/migrations/*.sql supabase/migrations/
npx supabase db reset
```

`db reset` deletes local database data. Use it only for a new/disposable local
stack. The migration `20260913120000_add_saved_dishes_and_pantry.sql` also
bootstraps the original phase-1 fitness tables, so setup does not depend on
tables that happened to be created manually on an older machine.

For an existing local database that contains data, make a backup and apply only
pending migrations:

```bash
docker exec supabase_db_trackr pg_dump \
  -U postgres -d postgres -Fc \
  -f /tmp/trackr-before-fitness-migrations.dump
docker cp \
  supabase_db_trackr:/tmp/trackr-before-fitness-migrations.dump \
  /tmp/trackr-before-fitness-migrations.dump

cp ../fitness-tracker/supabase/migrations/*.sql supabase/migrations/
npx supabase migration up --local --include-all
```

Do not run `fitness-tracker/supabase/schema.sql` against an existing database.
It is a complete schema snapshot for inspection, while migrations are the
incremental and data-preserving update path.

After applying migrations, restart PostgREST's schema cache if newly created
tables or RPC functions are not immediately visible:

```bash
docker exec supabase_db_trackr psql -U postgres -d postgres \
  -c "notify pgrst, 'reload schema';"
```

## Verification

From `fitness-tracker/`:

```bash
npm audit
npm test -- --run
npm run lint
npm run build
```

As of 2026-09-15, the lockfile resolves with zero known npm vulnerabilities and
all 21 tests, lint, and the production build pass on Node 20.
