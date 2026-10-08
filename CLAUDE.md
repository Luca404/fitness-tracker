# fitTrackr — CLAUDE.md

Calorie and nutrition tracker PWA. React 19 + TypeScript + Vite + Supabase direct.

Uses the shared hosted Supabase project `nitbisweytddtigoebeh` and shared `auth.users`; application reads/writes target health/nutrition tables and the barcode catalog. Finance tables and the portfolio backend belong to the other apps. Database roles, default grants and migration history are shared; follow `supabase/README.md`.

## Stack

React 19, TypeScript 6, Vite 8 + vite-plugin-pwa, Tailwind CSS 3, React Router 7, Supabase (`@supabase/supabase-js`), Recharts and ZXing. Italian UI. Use Node 22 and `npm ci`.

The mobile navigation contains Pasti, Cucina, Fitness, Benessere and Storico. Cucina groups the saved-dishes and pantry tabs; Fitness groups workout and weight tabs; an active gym session uses a dedicated full-screen route. Benessere contains the detailed healthy-habits dashboard.

## Occasional meals from photos

Pasti → Occasionale offers manual composition or **Da foto**. `MealPhotoCapture` uses the dedicated `analyze-meal-photo` Edge Function. `MealPhotoReview` shows totals first and editable ingredients in closed details, using cooked/ready-to-eat weights. The eaten percentage is applied once for direct diary registration; editing a logged photo meal starts from the consumed quantities and has no second percentage. Do not route photo estimates through preparation/cooking-weight conversion or link them to pantry items or recipes.

Estimated components use `FoodSource: ai_meal_photo`, distinct from label transcription's `ai_photo`. The existing text columns and diary RPCs support it without a migration. The diary badge is derived from the presence of at least one `ai_meal_photo` item. Optional unknown nutrients stay null. Individual assumptions and warnings are review-only; photos and descriptions are not persisted.

Reuse `src/services/photoUpload.ts` for photo compression and function error messages; labels and meal photos share these helpers. Client and server validate estimates through `supabase/functions/_shared/mealPhotoAnalysis.ts`. The server keeps the OpenAI key in secrets, uses `store: false`, and verifies the user through Supabase Auth even when gateway JWT verification is disabled. Model priority is `OPENAI_MEAL_PHOTO_MODEL` → `OPENAI_VISION_MODEL` → `gpt-4.1-mini`.

Released on 2026-10-08 with commit `8bf11f3`: Supabase deployment, Vercel Production and CI passed. See [the meal-photo guide](docs/pasti-da-foto.md) for setup, the dated verification record and untested real-photo accuracy.

## Habit recap

`GoodHabits` uses square tiles with only icons/status marks in the Pasti recap. `habitTileFill` fills both minimum and maximum targets using value/target, capped at 100%; exceeded maximums turn orange. Keep amounts, daily averages and limit multiples in the Benessere detail, without adding numeric text inside recap tiles. Legumes and fish use `habitWindow(selectedDate)` from the selected date minus six days through the selected date, preserving weekly targets and dividing the total by seven for the daily average. `getWeeklyMeals` accepts these rolling ranges; diary revisions invalidate its cache. Missing history stays unknown while daily rows remain available. See [the current habit guide](docs/buone-abitudini.md).

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

`correct_prepared_batch_weight` corrects a measured remainder atomically: total cooked weight becomes the sum of registered cooked portions and the new remainder. Historical weighed `cooked_portion_g` values stay unchanged; derived raw ingredient shares and their nutrition are recalculated for that batch. The RPC requires the previously read total/remainder, rejects stale or closed batches, and grants execution explicitly to `authenticated`. Migration `20261006120000` is already applied to the hosted database. See [prepared-dish weights](docs/peso-piatti-preparati.md).

## Docs

See `docs/README.md` for current feature guides, the implementation report and shared security record. Files under `docs/superpowers/` are dated historical plans; do not use their old scaffold, env names or SQL as current setup instructions.
