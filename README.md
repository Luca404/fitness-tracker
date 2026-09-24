# fitTrackr

Calorie and nutrition tracker PWA for logging meals, workouts, and weight. Data is stored in Supabase — sign in from any device.

Part of the **Trackrs ecosystem** alongside [Trackr](../trackr) (personal finance) and [pfTrackr](../portfolio-tracker) (investment portfolios). Shares the same Supabase project (`auth.users`) but uses its own health/nutrition tables — no financial data is touched.

## Features

- **Meal logging** — log meals by time slot (breakfast, lunch, dinner, snack, drinks); calorie and macro breakdown per meal and per day. Snacks appear where they were registered relative to other entries, while the usual breakfast → lunch → dinner order stays fixed ([ordering details](docs/meal-diary-order.md))
- **Dish-centric entry** — opening a meal slot shows saved dishes assigned to that slot; a dish can belong to breakfast, lunch, dinner and/or snack. Personalization ingredients remain separate from the saved recipe when the diary entry is reopened for editing or removal. New and one-off dishes are also supported; drinks stay in their own flow
- **Kitchen** — one area with saved dishes and pantry tabs for creating, inspecting and editing recipes and stock; saved ingredients retain their insertion order, and each dish has one or more meal categories and can have a custom icon
- **Pantry** — track groceries at home by culinary category (quantity + unit: g/ml/pieces), added via barcode scan, nutrition-label photo, or manual/basic-food entry; manual products can include saturated fat, sugars, salt and fibre per 100 g; barcode and nutrition data are reused through a shared read-only product catalog, while pantry stock remains private; pantry items surface first when searching ingredients and matching stock is consumed automatically when a dish is logged
- **Nutrition-label photo import** — take or choose a package photo, extract product and per-100 nutrition data through an authenticated OpenAI-backed Edge Function, review every field, then save it to the pantry
- **Macros** — visual progress bars for protein, total carbohydrates, and total fat against daily targets; sugars and saturated fat are subsets of their respective totals, not extra grams to add
- **Calorie ring** — at-a-glance daily calorie budget vs. consumed
- **Workout tracking** — choose from 20 activities and log sessions with MET-based calorie burn calculation
- **Weight log** — record body weight over time with history view; calorie and macro targets use a 7-day rolling average and are recalculated only after a significant (at least 2%) change from the last calculation weight
- **Wellbeing** — dedicated daily/weekly healthy-habits dashboard, with a compact status summary on the Meals page
- **BMR / TDEE** — personalized pipeline from BMR and activity-adjusted TDEE through calorie target, weight-based protein/fat targets, and residual carbohydrates; supports maintenance, muscle gain, weight loss and body recomposition, with prudent loss-rate and calorie limits
- **Onboarding** — 5-step wizard (physical stats → objective → lifestyle → resistance training → confirm) to set up goals; the same calculation inputs can later be edited from Settings
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
│   ├── onboarding/      # Physical, objective, lifestyle, resistance-training and confirmation steps
│   ├── pantry/          # BarcodeScanner, NutritionLabelPhoto
│   ├── settings/        # Profile inputs that affect calorie/macro calculations
│   └── workout/         # WorkoutDrawer, WorkoutRow, ActivityGrid
├── contexts/
│   ├── AuthContext.tsx  # Supabase Auth, session management
│   ├── DataContext.tsx  # Daily meals, workouts, weight logs, goals
│   └── SettingsContext.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── MealsPage.tsx
│   ├── FitnessPage.tsx # Allenamenti + Peso tabs
│   ├── WellbeingPage.tsx
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
│   ├── basicFoods.ts    # Curated ingredients (raw/dry weight unless named otherwise)
│   ├── basicFoodExtendedNutrition.ts # Indicative fibre, sugars and salt per 100 g/ml
│   ├── foodCategories.ts # Shared category labels and metadata
│   ├── suggestedDishes.ts # Reserved recipe templates
│   └── nutritionGuidelines.ts # Reference targets for healthy-habits indicators
├── utils/
│   ├── bmr.ts           # Full BMR → TDEE → calorie/macro target pipeline
│   ├── goalRecalculation.ts # 7-day average and 2% automatic-recalculation trigger
│   ├── mealTimeline.ts  # Position snack entries by registration time in the daily diary
│   └── met.ts           # MET-based calorie burn for activities
└── types/index.ts
```

## Data model

Supabase tables (health schema only, not shared with Trackr/pfTrackr):

| Table | Description |
|---|---|
| `user_health_profiles` | Physical stats, activity level, resistance training, objective, target weight and date |
| `user_goals` | Calorie and macro targets plus the body weight used by the latest calculation |
| `meals` | Meal records scoped by user and date |
| `meal_entries` | Named dishes actually eaten within a meal slot; `created_at` records when each entry was registered, and `dish_id` links saved dishes |
| `meal_items` | Ingredients and drinks belonging to an eaten dish, with `g`/`ml` units, optional piece size/count, nutrition values, pantry quantity actually consumed, an optional saved ingredient link and an `is_customization` marker for added ingredients |
| `workouts` | Workout sessions (activity type, duration, MET, calories burned) |
| `weight_logs` | Daily weight entries |
| `dishes` | Saved reusable dishes (name, one or more meal categories, optional custom icon, reference weight derived from items) |
| `dish_items` | Ingredients within a saved dish, including insertion position and the selected pantry-item reference when available |
| `pantry_items` | Groceries at home (quantity + unit, kcal/macros and optional fibre, sugars, saturated fat and salt per 100g/100ml, Open Food Facts payload and nutrition scores when available) |
| `barcode_products` | Shared product catalog keyed by barcode; authenticated clients can read it and trusted Edge Functions populate it from Open Food Facts or from label values reviewed and explicitly confirmed by a user |

Pantry synchronization is performed inside the same PostgreSQL transaction that
creates or updates a diary entry. Ingredients are matched to the exact selected
pantry row first, then by stable catalog/Open Food Facts identifiers and finally
by normalized name. Compatible units are consumed (`g` from `g`, `ml` from
`ml`, and a recorded piece count from `pz`); portions entered only in grams do
not deduct stock stored in pieces. Stock stops at zero, depleted items are hidden from ingredient search,
editing a diary entry recalculates its consumption, and deleting it restores the
quantity that entry had actually used.

Changing calories, protein, carbohydrates, fat, fibre, sugars or salt in a
pantry item updates linked saved-dish ingredients and previously logged meal
portions proportionally to their recorded grams. New meals use the corrected
values from the pantry or the updated saved dish. Dish editors in Cucina and
Pasti display nutrient values without direct inputs: changing an ingredient's
quantity recalculates its portion, while corrections for pantry-linked
ingredients are made in Dispensa. Saving a linked ingredient derives its
nutrition from the current pantry values; existing linked portions are
reconciled to those values as part of the migration. Saved-dish editors and
their personalization flow require custom ingredients to be added in Dispensa
first; manual nutrition entry remains available for one-off dishes.

Food categories include dedicated groups for baked goods, nuts and seeds,
spreads and preserves, savoury snacks, ready meals, supplements, and
`Proteine vegetali` for tofu, tempeh, seitan, veggie balls, plant-based burgers
and other meat alternatives. Open Food Facts
classification uses the product name/generic name together with normalized
category, food-group and PNNS fields; tags are treated as supporting signals
rather than the sole source of truth.

The local catalog also includes `nutritionGuidelines.ts`, a source-documented reference
dataset for salt, sugars, alcohol, ultra-processed foods, meat, vegetables, fruit,
legumes, fish and fibre. The Pasti page uses these references for the “Buone
abitudini” indicators. Fibre, sugars and salt are persisted as nullable values from
the pantry, Open Food Facts or manual entry; incomplete days are marked as partial
instead of treating missing nutrition data as zero. The local basic-food catalog
also provides indicative fibre, sugars and salt values for every ingredient.
Manual pantry entry keeps omitted optional values as unknown, distinct from an
explicit zero. Across the UI, total carbohydrates already include sugars and
total fat already includes saturated fat (and unsaturated fat when shown).

### Adaptive calorie and macro targets

The initial recommendation uses Mifflin-St Jeor BMR and the selected activity
multiplier. Maintenance uses the resulting TDEE, muscle gain adds 250 kcal/day,
and weight loss derives its deficit from the target weight and date while
limiting both the weekly loss rate and the fraction of TDEE removed. Body
recomposition uses a modest 10% TDEE deficit and does not require a target
weight or date; resistance training is strongly recommended and, when selected,
the protein target is 1.9 g/kg of reference weight. Protein and fat are assigned
from body weight and training context; carbohydrates receive the remaining
calories.

After onboarding, fitTrackr averages all available weight measurements from the
latest 7 calendar days. At least two measurements are required, so one isolated
weigh-in cannot change the targets. When that average differs by at least 2%
from `user_goals.calculation_weight_kg`, the complete calculation pipeline runs
again and persists the new targets and reference weight. The same check runs
when weight data is refreshed and when the profile is loaded. The manual
“Ricalcola da TDEE” action remains available and uses the rolling average when
there are enough samples.

Settings exposes the calculation inputs separately from the numeric target
overrides: age, sex, height, activity, resistance training, objective, target
weight/date and optional body-fat percentage can be edited together. Saving
those inputs immediately recalculates all targets. Logged workout calories stay
informational and are not added back to the daily budget, because the activity
multiplier is already part of TDEE.

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

### Completate

1. **Dispensa e consumo nei pasti.** La registrazione usa le scorte disponibili,
   salva la quantità effettivamente prelevata e la ripristina modificando o
   eliminando un pasto. Le voci esaurite vengono archiviate e tornano visibili
   se la quantità risale sopra zero.
2. **Alimenti in pezzi.** Mela, banana, pera, arancia, pomodoro, carota,
   zucchina e uovo accettano piccola/media/grande con pesi indicativi. Il diario
   conserva pezzi e taglia; nutrienti e dispensa in grammi usano il peso stimato,
   mentre la dispensa in `pz` usa il numero di pezzi. Restano disponibili i grammi.
3. **Buone abitudini in Pasti.** Il banner mostra una casella per ogni abitudine
   con icona e ✓, × o stato neutro, più il collegamento al dettaglio.
4. **Categorie dei piatti salvati.** Ogni piatto può appartenere a una o più
   categorie fra Colazione, Pranzo, Cena e Spuntino. Le categorie si scelgono
   quando si crea o modifica il piatto; in Pasti si vedono solo i piatti della
   categoria corrispondente al momento selezionato. I piatti già salvati
   restano disponibili in tutte le categorie finché non vengono ricategorizzati.
5. **Ingredienti aggiunti ai piatti salvati.** Gli ingredienti aggiunti mentre
   si registra un piatto salvato restano distinti dalla ricetta base nel diario.
   Riaprendo la registrazione, si vedono in una sezione separata e si possono
   modificare o rimuovere senza cambiare la ricetta salvata.

### Altre voci

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
- Review and refine the indicative fibre, salt and sugar values in the local
  basic-food catalog against primary food-composition sources as they become
  available.

## Known limitations

- Barcode scanning can take several seconds on some mobile browsers: camera
  detection happens client-side, while catalog/Open Food Facts resolution runs
  in an authenticated Edge Function.
- Open Food Facts coverage is incomplete, especially for regional products;
  missing products still require manual entry.
