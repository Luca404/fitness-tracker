# fitTrackr

Calorie and nutrition tracker PWA for logging meals, workouts, and weight. Data is stored in Supabase — sign in from any device.

Part of the **Trackrs ecosystem** alongside [Trackr](../trackr) (personal finance) and [pfTrackr](../portfolio-tracker) (investment portfolios). Shares the same Supabase project (`auth.users`) but uses its own health/nutrition tables — no financial data is touched.

## Features

- **Meal logging** — log meals by time slot (breakfast, lunch, dinner, snacks); food search with nutritional data; calorie and macro breakdown per meal and per day
- **Macros** — visual progress bars for protein, carbs, and fat against daily targets
- **Calorie ring** — at-a-glance daily calorie budget vs. consumed
- **Workout tracking** — log activities with MET-based calorie burn calculation; weekly activity grid
- **Weight log** — record body weight over time with history view
- **BMR / TDEE** — computed from onboarding data (age, height, weight, sex, activity level, goal)
- **Onboarding** — 4-step wizard (physical stats → lifestyle → objective → confirm) to set up goals
- **History** — per-day review of past logs
- **Installable PWA** — works as a native app on Android, iOS, and desktop
- **i18n** — English, Italian, Spanish

## Stack

- React 18 + TypeScript + Vite + vite-plugin-pwa (Workbox service worker)
- Tailwind CSS (mobile-first, dark mode)
- Supabase (PostgreSQL + Auth — email/password + RLS)
- react-i18next (EN, IT, ES)

## Getting Started

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

```bash
npm install
npm run dev     # → http://localhost:5173
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── common/          # Modal, Toast, DaySelector
│   ├── layout/          # Layout shell with bottom nav
│   ├── meals/           # CalorieRing, MacroBars, FoodSearch, MealSection, MealItemRow
│   ├── onboarding/      # StepPhysical, StepLifestyle, StepObjective, StepConfirm
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
│   └── SettingsPage.tsx
├── services/
│   ├── api.ts           # All Supabase CRUD
│   ├── nutrition.ts     # Food search and nutritional data helpers
│   └── supabase.ts      # Supabase client
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
| `meal_items` | Food items within a meal (name, calories, protein, carbs, fat, quantity) |
| `workouts` | Workout sessions (activity type, duration, MET, calories burned) |
| `weight_logs` | Daily weight entries |

## Deployment

Deployed on **Vercel** — auto-deploys on push to `main`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in Vercel.
