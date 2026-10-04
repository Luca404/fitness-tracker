# fitTrackr

An installable app for tracking meals, nutrition, workouts and weight, with an Italian interface and Supabase sync across devices.

Part of the **Trackrs ecosystem**, alongside [Trackr](https://github.com/Luca404/trackr) and [pfTrackr](https://github.com/Luca404/portfolio-tracker). The apps share authentication and a Supabase project; fitTrackr uses separate health tables and a shared barcode catalog.

## Features

- **Meals:** daily calories and macros, saved recipes, single foods, drinks and editable recipe additions.
- **Kitchen:** personal ingredients, recipe categories, custom icons and prepared batches with cooked-weight estimates and remaining portions.
- **Food import:** basic-food search, Open Food Facts, barcode scanning, nutrition-label photos and manual entry.
- **Fitness:** reusable gym plans with saved ordering, exercise search, set logging, rest timers and estimated session calories; duration-based logging for other activities.
- **Goals and weight:** personalized calorie and macro targets, a weight history and automatic recalculation from a seven-day average after a change of at least 2%.
- **Wellbeing:** daily and weekly habits, including total sugars and alcohol units; drinks support editable volume and alcohol strength.
- **History and PWA:** calorie/workout trends, installation on mobile or desktop, an update prompt and page-load recovery.

The Kitchen category buttons appear in one row above search. Select breakfast, lunch, dinner or snack to filter recipes and prepared batches; tap the active category again to clear it. With no selection, all categories are shown. Text search continues to filter recipes.

Diary ingredients retain their order, keeping automatic icons based on the first ingredient consistent. Custom icons take precedence. Gym plans can be reordered with up/down controls; new plans are added at the end.

Overview values use whole numbers; details use at most one decimal. Calculations retain stored precision. Completed gym sessions contribute to the daily burned total; exercise calories are not added back to the calorie budget.

## Stack

React 19, TypeScript 6, Vite 8, Tailwind CSS 3, React Router 7, Supabase Auth/PostgreSQL, Recharts, ZXing and Workbox. Node.js 22 is used for development and CI.

## Local setup

Use Node.js 22 and npm. Create `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

```bash
npm ci
npm run dev
```

The development server runs at `http://localhost:5173`. Supabase must have this repository's schema and email/password authentication configured.

### Database and Edge Functions

With the Supabase CLI authenticated:

```bash
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
supabase secrets set OPENAI_API_KEY=<server-side-key>
supabase functions deploy analyze-nutrition-label
supabase functions deploy resolve-barcode-product
supabase functions deploy confirm-barcode-product
```

The hosted database is shared. Review the dry-run and apply only this repository's pending migrations. **Never run `supabase db reset --linked`.**

The seven Trackr security versions `20261004165900`–`20261004170500` are already applied to the hosted project. FitTrackr records the actual meal-item correction and six finance ledger markers; do not replay them. [The database workflow](supabase/README.md) explains grants for future RPCs and the distinction between hosted and local databases. Local `.env.local` URLs at `127.0.0.1:54321` target a separate instance; the existing local instance has older fitness migrations and is not claimed to mirror the complete hosted schema.

Keep the OpenAI key in Edge Function secrets, never in a `VITE_` variable. The optional `OPENAI_VISION_MODEL` secret overrides the default `gpt-4.1-mini`.

## Development checks

```bash
npm test -- --run
npm run build
npm run lint
```

GitHub Actions runs all three checks on pushes and pull requests. Frontend tests use mock data and do not require the hosted database.

SQL tests require an isolated PostgreSQL database:

- `supabase/tests/alcohol_strength.sql`: run after replaying all migrations; checks alcohol persistence, energy calculations, portions and user isolation.
- `supabase/tests/ordering.sql`: run after migrations through `20261004140000` only. The test creates historical fixtures, applies both ordering migrations inside a transaction, verifies diary and plan ordering, then rolls back.

## Deployment

Vercel deploys pushes to `main`. Use root `./`, build command `npm run build` and output directory `dist`.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Production and Preview. Use a publishable key or legacy `anon` key; never expose a `service_role` key. Configure the production domain and preview redirects in Supabase Auth. `vercel.json` provides routing and cache headers.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/pages`, `src/components` | Screens and UI |
| `src/contexts`, `src/hooks` | Authentication, profile and date-scoped diary state |
| `src/services` | Supabase APIs, nutrition import and goal refresh |
| `src/data`, `src/utils`, `src/types` | Catalogs, calculations and shared types |
| `supabase` | Migrations, Edge Functions and SQL tests |
| `docs` | Feature guides and implementation notes |

Ingredient corrections update linked recipes and historical diary entries. Prepared batches preserve recipe snapshots, and diary portions adjust remaining cooked weight atomically. Missing optional nutrition values remain unknown rather than becoming zero.

## Documentation

Use [the documentation index](docs/README.md) for current guides, shared security status and historical plans. Detailed feature guides are in Italian:

- [Diary and ingredient ordering](docs/meal-diary-order.md)
- [Prepared dishes and cooked weight](docs/peso-piatti-preparati.md)
- [Gym training and sample plans](docs/allenamenti-palestra.md)
- [Simplification report and verification results](docs/rapporto-semplificazione-2026-09-29.md)

## Limitations

Data operations require connectivity. Food-catalog coverage is incomplete, barcode scanning can be slow on some phones, and cooked-weight, cocktail and exercise-calorie estimates are approximate.
