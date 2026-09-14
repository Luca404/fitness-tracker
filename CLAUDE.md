# CalTrackr — CLAUDE.md

Calorie and nutrition tracker PWA. React 18 + TypeScript + Vite + Supabase direct.

**Standalone project** — does not share the portfolio-tracker backend or the trackr/pfTrackr finance tables. Uses the same Supabase project (shared `auth.users`) but its own health/nutrition tables only.

## Stack

React 19 TS, Vite + vite-plugin-pwa, Tailwind CSS, Supabase (`@supabase/supabase-js`). Italian UI.

The mobile navigation contains Pasti, Cucina, Workout, Peso and Storico. Cucina groups the saved-dishes and pantry tabs.

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

## Supabase schema (fitness-only tables)

`user_health_profiles`, `user_goals`, `meals`, `meal_entries`, `meal_items`, `workouts`, `weight_logs`, `dishes`, `dish_items`, `pantry_items`. See `supabase/schema.sql` for DDL.

Apply `supabase/migrations/` before deploying a frontend that uses the transactional RPC functions.

## Docs

Implementation plans: `docs/superpowers/plans/` and `docs/superpowers/specs/`.
