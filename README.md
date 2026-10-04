# fitTrackr

Calorie and nutrition tracker PWA for logging meals, workouts, and weight. Data is stored in Supabase — sign in from any device.

Part of the **Trackrs ecosystem** alongside [Trackr](../trackr) (personal finance) and [pfTrackr](../portfolio-tracker) (investment portfolios). Shares the same Supabase project (`auth.users`) but uses its own health/nutrition tables — no financial data is touched.

## Features

- **Meal logging** — log meals by time slot (breakfast, lunch, dinner, snack, drinks); calorie and macro breakdown per meal and per day. Snacks appear where they were registered relative to other entries, while the usual breakfast → lunch → dinner order stays fixed ([ordering details](docs/meal-diary-order.md))
- **Dish-centric entry** — opening a meal slot shows saved dishes assigned to that slot; a dish can belong to breakfast, lunch, dinner and/or snack. Personalization ingredients remain separate from the saved recipe when the diary entry is reopened for editing or removal. New and one-off dishes are also supported; drinks stay in their own flow
- **Kitchen** — one area with saved dishes and personal ingredients. Recipes retain ingredient order, meal categories and optional custom icons. A category selector filters saved recipes and prepared batches together. The dish editor shows quantities and read-only nutrition values; prepared batches track remaining cooked portions. Cooking method and food-specific weight yields provide a cooked-weight estimate that can be replaced by a measured weight ([guide](docs/peso-piatti-preparati.md))
- **Personal ingredients** — save reusable foods by category through barcode scan, nutrition-label photo or manual/basic-food entry. Nutrition values, including fibre, sugars and salt for every basic food, are stored per 100 g/ml; corrections update linked dishes and diary entries. Ingredients do not have a stock counter
- **Nutrition-label photo import** — take or choose a package photo, extract product and per-100 nutrition data through an authenticated OpenAI-backed Edge Function, review every field, then save it among personal ingredients
- **Macros** — visual progress bars for protein, total carbohydrates, and total fat against daily targets; sugars and saturated fat are subsets of their respective totals, not extra grams to add
- **Calorie ring** — at-a-glance daily calorie budget vs. consumed
- **Gym training** — create reusable plans, reorder them with up/down controls (saved per account), search exercises in Italian or English, set fixed or ranged repetition goals, record weight and performed reps for each set in a focused, one-exercise-at-a-time view. Completed sessions show elapsed time and estimated calories, included in the daily burned overview ([guide](docs/allenamenti-palestra.md))
- **Other activities** — log Pesi, Camminata, Corsa, Ciclismo, Nuoto, Tapis roulant or Vogatore by duration with a MET-based calorie estimate; older activity types remain readable
- **Weight log** — record body weight over time with history view; calorie and macro targets use a 7-day rolling average and are recalculated only after a significant (at least 2%) change from the last calculation weight
- **Wellbeing** — dedicated daily/weekly healthy-habits dashboard, with a compact status summary on the Meals page: minimum goals fill toward their target, while maximum limits fill orange only when exceeded
- **BMR / TDEE** — personalized pipeline from BMR and activity-adjusted TDEE through calorie target, weight-based protein/fat targets, and residual carbohydrates; supports maintenance, muscle gain, weight loss and body recomposition, with prudent loss-rate and calorie limits
- **Onboarding** — 5-step wizard (physical stats → objective → lifestyle → resistance training → confirm) to set up goals; the same calculation inputs can later be edited from Settings
- **History** — 7/30-day calorie and workout trends
- **Installable PWA** — installable shell for Android, iOS, and desktop; data operations require connectivity. New versions are applied through an update prompt; failed page loads show recovery controls

Daily overview values use whole numbers; details use at most one decimal. Nutrition
calculations keep their stored precision. Total sugars count toward the habits
score, using the LARN total-sugars reference (15% of the calorie target / 4 kcal/g).

## Stack

- React 19 + TypeScript + Vite + vite-plugin-pwa (Workbox service worker)
- Tailwind CSS (mobile-first, dark mode)
- Supabase (PostgreSQL + Auth — email/password + RLS)
- Italian interface
- `@zxing/browser` for client-side barcode scanning, including rotated/vertical 1D barcodes (loaded on demand)

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
│   ├── common/          # Modal, Toast, DaySelector, error recovery and PWA updates
│   ├── layout/          # Layout shell with bottom nav
│   ├── kitchen/         # Saved dishes and prepared batches
│   ├── meals/           # Meal cards/details, calorie/macros, ingredient search and dish composer
│   ├── onboarding/      # Physical, objective, lifestyle, resistance-training and confirmation steps
│   ├── pantry/          # Lazy scanner/photo tools, nutrition fields and product review
│   ├── settings/        # Profile inputs that affect calorie/macro calculations
│   └── workout/         # Gym plans/sessions and simple activity logging
├── contexts/
│   ├── AuthContext.tsx  # Supabase Auth, session management
│   ├── DataContext.tsx  # Profile, weight and goals; exposes the diary hook
│   └── SettingsContext.tsx
├── hooks/useDiary.ts    # Date-scoped meals/activities, mutation guards and weekly cache
├── pages/
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── MealsPage.tsx
│   ├── FitnessPage.tsx # Allenamenti + Peso tabs
│   ├── GymSessionPage.tsx # Focused full-screen gym session
│   ├── WellbeingPage.tsx
│   ├── WorkoutPage.tsx
│   ├── WeightPage.tsx
│   ├── HistoryPage.tsx
│   ├── KitchenPage.tsx  # Ingredienti + Piatti tabs
│   ├── PantryPage.tsx   # Personal ingredients tab in Cucina
│   └── SettingsPage.tsx
├── services/
│   ├── api.ts           # Meals, dishes, ingredients and weight API
│   ├── gymApi.ts        # Gym plans, sessions and sets
│   ├── goalRefresh.ts   # Shared weight reads and goal recalculation
│   ├── nutrition.ts     # Basic-foods and Open Food Facts search
│   ├── barcodeProducts.ts # Shared barcode catalog client and photo barcode detection
│   ├── nutritionLabel.ts # Photo preparation + nutrition-label Edge Function client
│   └── supabase.ts      # Supabase client
├── data/
│   ├── basicFoods.ts    # Curated ingredients (raw/dry weight unless named otherwise)
│   ├── basicFoodExtendedNutrition.ts # Indicative fibre, sugars and salt per 100 g/ml
│   ├── foodCategories.ts # Shared category labels and metadata
│   ├── gymExercises.ts  # Searchable exercise catalog
│   └── nutritionGuidelines.ts # Reference targets for healthy-habits indicators
├── utils/
│   ├── bmr.ts           # Full BMR → TDEE → calorie/macro target pipeline
│   ├── nutrition.ts     # Shared scaling and totals; preserves unknown nutrients
│   ├── dishes.ts        # Shared saved-dish conversion and totals
│   ├── pantryDraft.ts   # Ingredient validation and persistence conversion
│   ├── goalRecalculation.ts # 7-day average and 2% automatic-recalculation trigger
│   ├── gymSessionSummary.ts # Gym duration and estimated calories
│   ├── mealTimeline.ts  # Position snack entries by registration time in the daily diary
│   ├── preparedDishes.ts # Cooked-weight yields and prepared portion shortcuts
│   └── met.ts           # MET-based calorie burn for activities
└── types/index.ts
```

## Data model

Supabase tables used by fitTrackr (health data stays separate from the other
Trackrs applications; the barcode product catalog is shared):

| Table | Description |
|---|---|
| `user_health_profiles` | Physical stats, activity level, resistance training, objective, target weight and date |
| `user_goals` | Calorie and macro targets plus the body weight used by the latest calculation |
| `meals` | Meal records scoped by user and date |
| `meal_entries` | Named dishes or single ingredients actually eaten within a meal slot; prepared portions also store their cooked grams and batch ID |
| `meal_items` | Ingredients and drinks belonging to an eaten dish, with `g`/`ml` units, optional piece size/count, nutrition values and an optional saved ingredient link |
| `workouts` | Workout sessions (activity type, duration, MET, calories burned) |
| `gym_plans`, `gym_plan_exercises` | Reusable gym plans with ordered exercises, set counts, repetition goals and per-side flags |
| `gym_sessions`, `gym_sets` | Session snapshots and each set's weight, performed reps and completion state; later plan edits do not change history |
| `weight_logs` | Daily weight entries |
| `dishes` | Saved reusable recipes, their cooking choices and measured weight yield, plus separate snapshots of prepared batches |
| `dish_items` | Ingredients within a saved recipe or preparation snapshot, including order, g/ml unit and optional personal ingredient reference |
| `pantry_items` | Permanent personal ingredient catalog, with nutritional values per 100 g/ml; legacy stock columns remain temporarily for compatibility |
| `prepared_batches` | Independently prepared dishes, with estimated or manually entered total cooked grams and remaining cooked grams |
| `barcode_products` | Shared product catalog keyed by barcode; authenticated clients can read it and trusted Edge Functions populate it from Open Food Facts or from label values reviewed and explicitly confirmed by a user |

The personal ingredient catalog does not track stock or decrease quantities.
Scan a barcode or photograph a label while composing a dish, or edit a saved
ingredient in Cucina → Ingredienti. Preparing a dish creates a snapshot of its
ingredients; editing the saved recipe later leaves that batch intact. Its cooked
weight is estimated from the ingredient amounts and each ingredient's cooking
method, with an optional measured correction. A saved recipe remembers the
measured yield for later preparations with the same ingredients and proportions.
Dry legumes are weighed dry; canned legumes are weighed cooked and drained, with
separate basic-food entries and nutrition values. See the
[prepared-dish weight guide](docs/peso-piatti-preparati.md) for the calculation,
controls and limits of the estimate.
Eating a portion records cooked grams and decreases the remaining batch amount.
Deleting or editing that diary portion adjusts the remaining amount accordingly.
The quarter, half and three-quarter shortcuts refer to the original cooked total.
For a single food such as an apple, Pasti → Ingrediente singolo registers its
quantity directly in the diary without creating a recipe or prepared batch.
The diary entry offers a direct quantity edit, and saved ingredients keep their
nutrition link.

Fitness → Allenamenti starts with gym plans. Exercises can be searched by Italian
or English name or by equipment, with a custom exercise option. Plans support
fixed or ranged repetition goals, per-side work and sets with free repetitions.
Starting a plan creates a session with one row per planned set; previous performed
weight and reps are suggested.
The active session occupies a dedicated screen with one exercise at a time,
navigation arrows, a rest timer after each completed set, and finish/delete
actions available throughout. Completed sessions show total elapsed time,
including rests, and estimated calories based on completed exercises, loads and
body weight. Sessions can be resumed, completed, reviewed and compared by
exercise. The simple activity picker is kept for Pesi, Camminata, Corsa, Ciclismo, Nuoto,
Tapis roulant and Vogatore; older activity types remain readable in history.
Individual gym sets do not receive an estimated calorie value. See the
[gym training guide](docs/allenamenti-palestra.md) for the exact flow and sample plans.

Changing calories, protein, carbohydrates, fat, fibre, sugars or salt in a
personal ingredient updates linked saved-dish ingredients and previously logged meal
portions proportionally to their recorded grams. New meals use the corrected
values from the ingredient catalog or the updated saved dish. Dish editors in Cucina and
Pasti display nutrient values without direct inputs: changing an ingredient's
quantity recalculates its portion, while corrections for linked
ingredients are made in Ingredienti. Saving a linked ingredient derives its
nutrition from the current catalog values; existing linked portions are
reconciled to those values as part of the migration. Saved-dish editors and
their personalization flow require custom ingredients to be added in Ingredienti
first; manual nutrition entry remains available for one-off dishes.

In dish editing, each ingredient card shows P, C and G on the first nutrition
line and fibre, sugars and salt on the second. The amount is shown only in the
editable quantity control. Outside dish insertion, the UI uses the shorter
labels C, G and Zuccheri instead of "C tot.", "G tot." and "di cui zuccheri".

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
provides indicative fibre, sugars and salt values for every ingredient, and
selecting a basic food for the personal catalog preserves all three. A migration
filled missing values in previously saved basic-food ingredients and their
standalone dish/diary entries, while preserving existing standalone values.
Manual ingredient entry keeps omitted optional values as unknown, distinct from an
explicit zero. Across the UI, total carbohydrates already include sugars and
total fat already includes saturated fat (and unsaturated fat when shown).

### Alcoholic drinks

The diary beverage picker includes editable volume in ml and alcohol by volume
(% vol), plus 21 popular cocktail estimates. Aperol Spritz, Campari Spritz,
Negroni and Negroni Sbagliato are separate entries. Cocktail volumes exclude ice;
recipes, dilution and brands can change the estimates. Alcohol contributes energy
in addition to the macros; editing strength adjusts ethanol energy only.

Daily habits also show alcohol units: `ml × ABV / 100 × 0.789 / 12`.
[ISS defines 1 UA as 12 g of ethanol](https://www.epicentro.iss.it/passi/indicatori/alcol).
The profile reference is 2 UA for men aged 18–64, 1 UA for women and adults aged
65+, and zero for minors. These are orientation thresholds, not safe allowances
or consumption goals. Unknown custom strength or quantities in grams produce
an unavailable/partial total; older basic drinks use indicative catalog strength.
A recorded zero remains zero. The `alcohol_abv` field persists in pantry, recipe,
prepared snapshots and diary items, independently of quantity.

Migration `20261004140000_alcohol_strength.sql` extends the existing atomic RPCs
and source-nutrition triggers. Source corrections propagate to linked records;
a deliberately different logged strength is retained when the pantry is corrected.
Run `supabase/tests/alcohol_strength.sql` only in an isolated test database after
replaying the migrations. It checks saves, edits, portions, energy adjustments,
constraints, rollback and isolation between users in a rolled-back transaction.

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

1. **Catalogo ingredienti e piatti preparati.** I prodotti salvati restano
   disponibili senza contatore di scorte. Le preparazioni hanno un peso cotto
   stimato, porzioni registrate in grammi cotti e quantità residua; le
   preparazioni con quantità residua compaiono per prime in Piatti.
2. **Alimenti in pezzi.** Mela, banana, pera, arancia, pomodoro, carota,
   zucchina e uovo accettano piccola/media/grande con pesi indicativi. Il diario
   conserva pezzi e taglia; i nutrienti usano il peso stimato e restano
   disponibili anche i grammi.
3. **Buone abitudini in Pasti.** Il banner mostra una casella per ogni abitudine
   con icona e ✓, × o stato neutro, più il collegamento al dettaglio. Per gli
   obiettivi minimi la casella si riempie progressivamente fino al 100%, poi
   mostra la spunta. Per i limiti massimi resta verde con spunta entro soglia;
   oltre soglia mostra la × e si riempie di arancione in proporzione allo
   sforamento (20% oltre il limite = 20% di riempimento, fino al 100%).
   I valori sconosciuti restano neutri; i valori parziali mantengono lo stato
   neutro quando non bastano a stabilire se l'obiettivo è raggiunto.
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

## Verification and architecture notes

```bash
npm test -- --run
npm run build
npm run lint
```

GitHub Actions runs these checks on pushes and pull requests. The diary is loaded
centrally for the selected date; switching pages reuses it. Switching dates clears
the previous day, and late reads or writes cannot replace another day's data.
Successful ingredient/recipe corrections refresh the diary and weekly habits.
Meals retain one ingredient source (`entries[].items`); weekly reads share a short
cache that is invalidated after meal mutations. Prepared portions keep snapshot
nutrition and resolve their custom icon from the original saved dish when available.

The [updated simplification report](docs/rapporto-semplificazione-2026-09-29.md)
records completed changes, build measurements and database work still deferred.

### Persistent ingredient and gym plan order

Diary ingredients have an explicit `meal_items.position`, preserved by both meal
RPCs and used when hydrating entries. The migration restores recipe order for
historical linked items, which also stabilizes the icon derived from their first
ingredient. The original order of unlinked historical items was not stored;
those receive a best-effort order instead. Custom icons keep priority.

Gym plans have a per-user position. Reordering uses one authenticated RPC,
validates the complete set of owned plan IDs, and saves atomically. New plans
append to the end; editing a plan retains its place and exercise ordering.
An unsuccessful move restores the previous visible order. Plan refreshes cannot
overwrite an order being saved when the selected date changes.

`supabase/tests/ordering.sql` must run only in an isolated database migrated
through `20261004140000`. It creates historical fixtures, applies the two order
migrations inside a transaction, checks backfill, meal writes/updates, prepared
portions, plan changes, invalid requests and user isolation, then rolls back.
