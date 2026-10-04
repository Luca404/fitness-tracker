# CalTrackr — CLAUDE.md

Calorie and nutrition tracker PWA. React 19 + TypeScript + Vite + Supabase direct.

**Standalone project** — does not share the portfolio-tracker backend or the trackr/pfTrackr finance tables. Uses the same Supabase project (shared `auth.users`) but its own health/nutrition tables only.

## Stack

React 19 TS, Vite + vite-plugin-pwa, Tailwind CSS, Supabase (`@supabase/supabase-js`). Italian UI.

The mobile navigation contains Pasti, Cucina, Fitness, Benessere and Storico. Cucina groups the saved-dishes and pantry tabs; Fitness groups workout and weight tabs; an active gym session uses a dedicated full-screen route. Benessere contains the detailed healthy-habits dashboard.

## Commands

```bash
npm run dev     # → http://localhost:5173
npm run build
npm run lint
```

## Env vars (`.env.local`)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Supabase schema (tables used by fitTrackr)

`user_health_profiles`, `user_goals`, `meals`, `meal_entries`, `meal_items`, `workouts`, `gym_plans`, `gym_plan_exercises`, `gym_sessions`, `gym_sets`, `weight_logs`, `dishes`, `dish_items`, `pantry_items`, `prepared_batches`, `barcode_products`. See `supabase/migrations/` for the current DDL.

Apply `supabase/migrations/` before deploying a frontend that uses the transactional RPC functions.

## Docs

Current feature guides: `docs/allenamenti-palestra.md` and `docs/peso-piatti-preparati.md`. Historical implementation plans: `docs/superpowers/plans/` and `docs/superpowers/specs/`.
