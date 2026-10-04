# fitTrackr — CLAUDE.md

Calorie and nutrition tracker PWA. React 19 + TypeScript + Vite + Supabase direct.

Uses the shared hosted Supabase project `nitbisweytddtigoebeh` and shared `auth.users`; application reads/writes target health/nutrition tables and the barcode catalog. Finance tables and the portfolio backend belong to the other apps. Database roles, default grants and migration history are shared; follow `supabase/README.md`.

## Stack

React 19, TypeScript 6, Vite 8 + vite-plugin-pwa, Tailwind CSS 3, React Router 7, Supabase (`@supabase/supabase-js`), Recharts and ZXing. Italian UI. Use Node 22 and `npm ci`.

The mobile navigation contains Pasti, Cucina, Fitness, Benessere and Storico. Cucina groups the saved-dishes and pantry tabs; Fitness groups workout and weight tabs; an active gym session uses a dedicated full-screen route. Benessere contains the detailed healthy-habits dashboard.

## Commands

```bash
npm run dev     # → http://localhost:5173
npm run build
npm run lint
npm test -- --run
```

## Env vars (`.env.local`)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Supabase schema (tables used by fitTrackr)

`user_health_profiles`, `user_goals`, `meals`, `meal_entries`, `meal_items`, `workouts`, `gym_plans`, `gym_plan_exercises`, `gym_sessions`, `gym_sets`, `weight_logs`, `dishes`, `dish_items`, `pantry_items`, `prepared_batches`, `barcode_products`. See `supabase/migrations/` for the current DDL.

Inspect `supabase migration list --linked` and `supabase db push --linked --dry-run` before applying pending migrations. The security versions through `20261004170500` are already applied remotely; six finance files are ledger markers, not a finance schema bootstrap. Never reset the linked database.

`meal_items` RLS binds both entry and meal to the same owner; the composite FK `(entry_id, meal_id)` references `meal_entries(id, meal_id)`. New postgres-owned public RPCs must explicitly grant `EXECUTE` to the intended roles because future default grants were revoked. Existing fitness CRUD/RPC grants remain.

The ingredient catalog retains quantities for package/nutrition metadata, not consumable stock. Historical pantry SQL and earlier plans do not describe current stock UX. Prepared batches retain snapshots and update portions atomically.

## Docs

See `docs/README.md` for current feature guides, the implementation report and shared security record. Files under `docs/superpowers/` are dated historical plans; do not use their old scaffold, env names or SQL as current setup instructions.
