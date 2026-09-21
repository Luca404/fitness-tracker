# fitTrackr

Calorie and nutrition tracker PWA for logging meals, workouts, and weight. Data is stored in Supabase — sign in from any device.

Part of the **Trackrs ecosystem** alongside [Trackr](../trackr) (personal finance) and [pfTrackr](../portfolio-tracker) (investment portfolios). Shares the same Supabase project (`auth.users`) but uses its own health/nutrition tables — no financial data is touched.

## Features

- **Meal logging** — log meals by time slot (breakfast, lunch, dinner, snack, alcoholic snack); calorie and macro breakdown per meal and per day
- **Dish-centric entry** — opening a meal slot shows one hub: pick a saved dish (scaled by total weight and optionally paired with a drink measured in ml), cook something new (composed from a curated basic-ingredients dataset + Open Food Facts, then saved for reuse), or log a one-off dish/item that isn't saved
- **Kitchen** — one area with saved dishes and pantry tabs; create, inspect and edit recipes, then get cookable suggestions ranked from the ingredients currently available
- **Pantry** — track groceries at home by culinary category (quantity + unit: g/ml/pieces), added via barcode scan, nutrition-label photo, or manual/basic-food entry; barcode and nutrition data are reused through a shared read-only product catalog, while pantry stock remains private; pantry items surface first when searching ingredients and matching stock is consumed automatically when a dish is logged
- **Nutrition-label photo import** — take or choose a package photo, extract product and per-100 nutrition data through an authenticated OpenAI-backed Edge Function, review every field, then save it to the pantry
- **Macros** — visual progress bars for protein, carbs, and fat against daily targets
- **Calorie ring** — at-a-glance daily calorie budget vs. consumed
- **Workout tracking** — choose from 20 activities and log sessions with MET-based calorie burn calculation
- **Weight log** — record body weight over time with history view
- **BMR / TDEE** — computed from onboarding data (age, height, weight, sex, activity level, goal)
- **Onboarding** — 4-step wizard (physical stats → lifestyle → objective → confirm) to set up goals
- **History** — 7/30-day calorie and workout trends
- **Installable PWA** — installable shell for Android, iOS, and desktop; data operations require connectivity

## Stack

- React 19 + TypeScript + Vite + vite-plugin-pwa (Workbox service worker)
- Tailwind CSS (mobile-first, dark mode)
- Supabase (PostgreSQL + Auth — email/password + RLS)
- Italian interface
- `@zxing/browser` for client-side barcode scanning (pantry), including rotated/vertical 1D barcodes

## Getting Started

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

```bash
npm install
supabase link --project-ref <project-ref>
supabase db push # apply migrations when using the Supabase CLI
npm run dev     # → http://localhost:5173
npm run build
```

After linking the project, configure the photo-import Edge Function with a
server-side OpenAI secret. Never add this key to a `VITE_` variable or to
frontend code:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy analyze-nutrition-label
supabase functions deploy resolve-barcode-product
supabase functions deploy confirm-barcode-product
```

The optional `OPENAI_VISION_MODEL` secret overrides the default `gpt-4.1-mini`.
For local function development, put these server secrets in an ignored `.env.local`
file and pass it to `supabase functions serve`.

The hosted database is shared with the other Trackrs applications. Never use
`supabase db reset --linked` against it. Review `supabase db push --dry-run`
first and apply only the migrations in this repository. The initial
fitTrackr schema migration creates only the health/nutrition tables; it does
not modify Trackr's finance tables or functions.

## Project Structure

```
src/
├── components/
│   ├── common/          # Modal, Toast, DaySelector
│   ├── layout/          # Layout shell with bottom nav
│   ├── kitchen/         # Saved dishes, details and pantry-driven recommendations
│   ├── meals/           # Meal cards/details, calorie/macros, ingredient search and dish composer
│   ├── onboarding/      # StepPhysical, StepLifestyle, StepObjective, StepConfirm
│   ├── pantry/          # BarcodeScanner, NutritionLabelPhoto
│   └── workout/         # WorkoutDrawer, WorkoutRow, ActivityGrid
├── contexts/
│   ├── AuthContext.tsx  # Supabase Auth, session management
│   ├── DataContext.tsx  # Daily meals, workouts, weight logs, goals
│   └── SettingsContext.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── MealsPage.tsx
│   ├── WorkoutPage.tsx
│   ├── WeightPage.tsx
│   ├── HistoryPage.tsx
│   ├── KitchenPage.tsx  # Piatti + Dispensa tabs
│   ├── PantryPage.tsx   # Pantry tab and legacy standalone view
│   └── SettingsPage.tsx
├── services/
│   ├── api.ts           # All Supabase CRUD
│   ├── nutrition.ts     # Basic-foods search, Open Food Facts search + barcode lookup
│   ├── barcodeProducts.ts # Shared barcode catalog client and photo barcode detection
│   ├── nutritionLabel.ts # Photo preparation + nutrition-label Edge Function client
│   └── supabase.ts      # Supabase client
├── data/
│   ├── basicFoods.ts    # Curated ingredients (kcal/macros per 100g + culinary category)
│   ├── foodCategories.ts # Shared category labels and metadata
│   ├── suggestedDishes.ts # Recipe templates used for pantry suggestions
│   └── nutritionGuidelines.ts # Reference targets for the future habits dashboard
├── utils/
│   ├── bmr.ts           # BMR / TDEE calculation (Mifflin-St Jeor)
│   └── met.ts           # MET-based calorie burn for activities
└── types/index.ts
```

## Data model

Supabase tables (health schema only, not shared with Trackr/pfTrackr):

| Table | Description |
|---|---|
| `user_health_profiles` | Physical stats (height, weight, age, sex) |
| `user_goals` | TDEE, calorie target, macro targets, activity level, objective |
| `meals` | Meal records scoped by user and date |
| `meal_entries` | Named dishes actually eaten within a meal slot |
| `meal_items` | Ingredients and drinks belonging to an eaten dish, with `g`/`ml` units, nutrition values and the pantry quantity actually consumed |
| `workouts` | Workout sessions (activity type, duration, MET, calories burned) |
| `weight_logs` | Daily weight entries |
| `dishes` | Saved reusable dishes (name, reference weight derived from items) |
| `dish_items` | Ingredients within a saved dish, including the selected pantry-item reference when available |
| `pantry_items` | Groceries at home (quantity + unit, kcal/macros per 100g/100ml, Open Food Facts payload and nutrition scores when available) |
| `barcode_products` | Shared product catalog keyed by barcode; authenticated clients can read it and trusted Edge Functions populate it from Open Food Facts or from label values reviewed and explicitly confirmed by a user |

Pantry synchronization is performed inside the same PostgreSQL transaction that
creates or updates a diary entry. Ingredients are matched to the exact selected
pantry row first, then by stable catalog/Open Food Facts identifiers and finally
by normalized name. Only compatible units are consumed (`g` from `g`, `ml` from
`ml`); recipe quantities cannot automatically convert pantry items stored as
pieces. Stock stops at zero, depleted items are hidden from ingredient search,
editing a diary entry recalculates its consumption, and deleting it restores the
quantity that entry had actually used.

Food categories include dedicated groups for baked goods, nuts and seeds,
spreads and preserves, savoury snacks, ready meals, supplements, and
`Proteine vegetali` for tofu, tempeh, seitan, veggie balls, plant-based burgers
and other meat alternatives. Open Food Facts
classification uses the product name/generic name together with normalized
category, food-group and PNNS fields; tags are treated as supporting signals
rather than the sole source of truth.

The local catalog also includes `nutritionGuidelines.ts`, a source-documented reference
dataset for salt, sugars, alcohol, ultra-processed foods, meat, vegetables, fruit,
legumes, fish and fibre. The Pasti page uses the reliably measurable categories for
the “Buone abitudini” daily and weekly indicators; nutrients not persisted on diary
items are intentionally not estimated.

## Deployment

Deployed on **Vercel** — auto-deploys on push to `main`. The production
project uses the Vite defaults: root directory `./`, build command
`npm run build`, and output directory `dist`.

Set these environment variables in Vercel for Preview and Production:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Use a Supabase publishable key (or the legacy `anon` key while migrating),
never a `service_role`/secret key. Configure the production Vercel domain as
the Supabase Auth Site URL and add the required preview URL patterns.
`vercel.json` provides the history fallback required by React Router.

## Roadmap

- The first nutrition-label photo milestone is implemented: client-side
  preview/compression → server-side MIME/size/auth checks → OpenAI Responses API
  with image input and a strict schema → editable confirmation → pantry save.
  The OpenAI key remains an Edge Function secret and the image is not persisted.
- Barcode products are checked against the shared catalog before Open Food Facts
  or OpenAI. Catalog writes run only in trusted Edge Functions; Open Food Facts
  data takes precedence over an AI transcription.
- Improve photo import with optional multi-photo capture for packages whose front,
  ingredients and nutrition table do not fit in one readable frame.
- Treat calorie estimation from a photo of a plated meal as a separate, later
  feature: unlike label transcription, it requires uncertain ingredient and
  portion estimates plus explicit confidence/assumption handling.
- Add a local OCR/parser fallback later if it provides a measurable latency or
  cost benefit.
- Extend “Buone abitudini” when diary items persist fibre, salt and sugar data.

## Known limitations

- Barcode scanning can take several seconds on some mobile browsers: camera
  detection happens client-side, while catalog/Open Food Facts resolution runs
  in an authenticated Edge Function.
- Open Food Facts coverage is incomplete, especially for regional products;
  missing products still require manual entry.
