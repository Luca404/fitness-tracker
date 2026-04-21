# calTrackr Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build calTrackr — a mobile-first PWA for calorie/macro tracking and manual workout logging, backed by Supabase.

**Architecture:** React 18 + TypeScript + Vite + Tailwind. DataContext holds all in-memory state and mediates between pages and Supabase via api.ts. Pure utility functions (bmr.ts, met.ts) are tested independently. Four-tab bottom nav: Meals / Workout / History / Settings.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Supabase JS v2, React Router v6, vite-plugin-pwa, Recharts (charts), date-fns (date math)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | All shared TS types/interfaces |
| `src/utils/bmr.ts` | BMR, TDEE, deficit, goal suggestion (pure) |
| `src/utils/met.ts` | MET constants, calorie burn calc (pure) |
| `src/services/supabase.ts` | Supabase client singleton |
| `src/services/api.ts` | All CRUD operations (typed) |
| `src/services/nutrition.ts` | Open Food Facts wrapper |
| `src/contexts/AuthContext.tsx` | Auth state + login/logout |
| `src/contexts/DataContext.tsx` | In-memory cache, fetch, mutate |
| `src/contexts/SettingsContext.tsx` | Date selection shared state |
| `src/components/layout/Layout.tsx` | Shell + 4-tab bottom nav |
| `src/components/common/Modal.tsx` | Reusable modal wrapper |
| `src/components/common/Toast.tsx` | Toast notification |
| `src/components/common/SkeletonLoader.tsx` | Loading skeleton |
| `src/components/onboarding/StepPhysical.tsx` | Step 1: age/sex/height/weight |
| `src/components/onboarding/StepObjective.tsx` | Step 2: goal + target weight/date |
| `src/components/onboarding/StepLifestyle.tsx` | Step 3: activity level |
| `src/components/onboarding/StepConfirm.tsx` | Step 4: BMR/TDEE review + edit |
| `src/components/meals/CalorieRing.tsx` | SVG ring progress |
| `src/components/meals/MacroBars.tsx` | Horizontal macro bars |
| `src/components/meals/MealSection.tsx` | One meal_type group |
| `src/components/meals/MealItemRow.tsx` | Single food item row |
| `src/components/meals/FoodSearch.tsx` | OFF search + manual fallback |
| `src/components/workout/ActivityGrid.tsx` | 4-col grid of 20 activities |
| `src/components/workout/WorkoutDrawer.tsx` | Bottom drawer: duration + preview |
| `src/components/workout/WorkoutRow.tsx` | Single workout log row |
| `src/pages/OnboardingPage.tsx` | 4-step wizard orchestrator |
| `src/pages/MealsPage.tsx` | Ring + macros + burned + meal list |
| `src/pages/WorkoutPage.tsx` | Grid + drawer + workout list |
| `src/pages/HistoryPage.tsx` | Charts 7/30d |
| `src/pages/SettingsPage.tsx` | Profile + goals + logout |
| `src/pages/LoginPage.tsx` | Email/password login |
| `src/App.tsx` | Router + context providers |

---

## Task 1: Project Scaffold

**Files:**
- Create: `fitness-tracker/` (all scaffold files)

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /home/lika44/Documenti/Python
npm create vite@latest caltrackr -- --template react-ts
cd caltrackr
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom date-fns recharts
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

- [ ] **Step 3: Configure tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 4: Replace src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Configure vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'calTrackr',
        short_name: 'calTrackr',
        theme_color: '#10b981',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 6: Create .env.local**

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server running on localhost:5173

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold calTrackr Vite+React+TS+Tailwind+PWA"
```

---

## Task 2: Supabase SQL Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Create schema file**

```sql
-- user_health_profiles
create table public.user_health_profiles (
  user_id          uuid primary key references auth.users on delete cascade,
  age              int not null,
  sex              text not null check (sex in ('male', 'female')),
  height_cm        float not null,
  weight_kg        float not null,
  activity_level   text not null check (activity_level in (
                     'sedentary', 'light', 'moderate', 'active', 'very_active')),
  objective        text not null check (objective in (
                     'lose_weight', 'gain_muscle', 'maintain')),
  target_weight_kg float,
  target_date      date,
  body_fat_pct     float,
  bmr_override     float,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.user_health_profiles enable row level security;
create policy "own profile" on public.user_health_profiles
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_goals
create table public.user_goals (
  user_id        uuid primary key references auth.users on delete cascade,
  calorie_target int not null,
  protein_g      float not null,
  carbs_g        float not null,
  fat_g          float not null,
  updated_at     timestamptz default now()
);
alter table public.user_goals enable row level security;
create policy "own goals" on public.user_goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meals
create table public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  meal_type  text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name       text,
  created_at timestamptz default now()
);
alter table public.meals enable row level security;
create policy "own meals" on public.meals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.meals (user_id, date);

-- meal_items
create table public.meal_items (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.meals on delete cascade,
  food_name   text not null,
  quantity_g  float not null,
  calories    float not null,
  protein_g   float not null,
  carbs_g     float not null,
  fat_g       float not null,
  source      text not null default 'manual',
  off_food_id text,
  created_at  timestamptz default now()
);
alter table public.meal_items enable row level security;
create policy "own meal_items" on public.meal_items
  using (exists (
    select 1 from public.meals m
    where m.id = meal_id and m.user_id = auth.uid()
  ));

-- workouts
create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  activity        text not null,
  duration_min    int not null,
  calories_burned float not null,
  notes           text,
  created_at      timestamptz default now()
);
alter table public.workouts enable row level security;
create policy "own workouts" on public.workouts
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.workouts (user_id, date);
```

- [ ] **Step 2: Run schema in Supabase SQL editor**

Paste into Supabase dashboard → SQL Editor → Run.
Expected: all 5 tables created with RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase schema (profiles, goals, meals, workouts)"
```

---

## Task 3: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types**

```ts
// src/types/index.ts

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Objective = 'lose_weight' | 'gain_muscle' | 'maintain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'manual' | 'openfoodfacts' | 'ai_photo' | 'barcode'

export interface UserHealthProfile {
  user_id: string
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  objective: Objective
  target_weight_kg: number | null
  target_date: string | null   // ISO date string YYYY-MM-DD
  body_fat_pct: number | null
  bmr_override: number | null
  created_at: string
  updated_at: string
}

export interface UserGoals {
  user_id: string
  calorie_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  updated_at: string
}

export interface Meal {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  meal_type: MealType
  name: string | null
  created_at: string
  items: MealItem[]  // hydrated client-side
}

export interface MealItem {
  id: string
  meal_id: string
  food_name: string
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: FoodSource
  off_food_id: string | null
  created_at: string
}

export interface Workout {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  activity: string   // key in MET_ACTIVITIES
  duration_min: number
  calories_burned: number
  notes: string | null
  created_at: string
}

export interface DaySummary {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  calories_burned: number
}

export interface OFFProduct {
  code: string
  product_name: string
  brands: string
  nutriments: {
    'energy-kcal_100g': number
    proteins_100g: number
    carbohydrates_100g: number
    fat_100g: number
  }
}

export interface SuggestedGoals {
  calorie_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript types"
```

---

## Task 4: Utils — bmr.ts

**Files:**
- Create: `src/utils/bmr.ts`
- Create: `src/utils/bmr.test.ts`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

Add to `vite.config.ts` under `defineConfig`:
```ts
test: { environment: 'jsdom' }
```

Add to `package.json` scripts:
```json
"test": "vitest run"
```

- [ ] **Step 2: Write failing tests**

```ts
// src/utils/bmr.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  suggestGoals,
} from './bmr'
import type { UserHealthProfile } from '../types'

const baseProfile: UserHealthProfile = {
  user_id: 'x',
  age: 30,
  sex: 'male',
  height_cm: 175,
  weight_kg: 80,
  activity_level: 'moderate',
  objective: 'maintain',
  target_weight_kg: null,
  target_date: null,
  body_fat_pct: null,
  bmr_override: null,
  created_at: '',
  updated_at: '',
}

describe('calculateBMR', () => {
  it('calculates male BMR via Mifflin-St Jeor', () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    expect(calculateBMR(baseProfile)).toBeCloseTo(1748.75, 1)
  })

  it('calculates female BMR', () => {
    const f = { ...baseProfile, sex: 'female' as const }
    // 1748.75 - 5 - 161 = 1582.75
    expect(calculateBMR(f)).toBeCloseTo(1582.75, 1)
  })

  it('uses bmr_override when set', () => {
    expect(calculateBMR({ ...baseProfile, bmr_override: 2000 })).toBe(2000)
  })
})

describe('calculateTDEE', () => {
  it('applies moderate multiplier 1.55', () => {
    expect(calculateTDEE(1748.75, 'moderate')).toBeCloseTo(2710.56, 0)
  })
})

describe('calculateDeficit', () => {
  it('returns 0 for maintain', () => {
    expect(calculateDeficit(baseProfile)).toBe(0)
  })

  it('returns +250 for gain_muscle', () => {
    expect(calculateDeficit({ ...baseProfile, objective: 'gain_muscle' })).toBe(250)
  })

  it('calculates deficit for lose_weight', () => {
    const profile: UserHealthProfile = {
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 85,
      target_weight_kg: 80,
      // 70 days from now
      target_date: new Date(Date.now() + 70 * 86400000).toISOString().split('T')[0],
    }
    // 5kg * 7700 / 70 days = 550 kcal/day deficit
    const deficit = calculateDeficit(profile)
    expect(deficit).toBeCloseTo(-550, 0)
  })

  it('caps deficit at -1000', () => {
    const profile: UserHealthProfile = {
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 100,
      target_weight_kg: 70,
      target_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }
    expect(calculateDeficit(profile)).toBe(-1000)
  })
})

describe('suggestGoals', () => {
  it('splits macros 30/40/30 from calorie target', () => {
    const goals = suggestGoals(2000, 0)
    expect(goals.calorie_target).toBe(2000)
    // protein: 30% of 2000 = 600 kcal / 4 = 150g
    expect(goals.protein_g).toBeCloseTo(150, 0)
    // carbs: 40% of 2000 = 800 kcal / 4 = 200g
    expect(goals.carbs_g).toBeCloseTo(200, 0)
    // fat: 30% of 2000 = 600 kcal / 9 = 66.7g
    expect(goals.fat_g).toBeCloseTo(66.7, 0)
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
npm test
```
Expected: FAIL — module not found

- [ ] **Step 4: Implement bmr.ts**

```ts
// src/utils/bmr.ts
import type { UserHealthProfile, ActivityLevel, SuggestedGoals } from '../types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateBMR(profile: UserHealthProfile): number {
  if (profile.bmr_override !== null) return profile.bmr_override
  const { weight_kg, height_cm, age, sex } = profile
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel]
}

export function calculateDeficit(profile: UserHealthProfile): number {
  if (profile.objective === 'maintain') return 0
  if (profile.objective === 'gain_muscle') return 250

  // lose_weight
  if (!profile.target_weight_kg || !profile.target_date) return 0
  const deltaKg = profile.weight_kg - profile.target_weight_kg
  const daysTotal = Math.max(
    1,
    Math.round(
      (new Date(profile.target_date).getTime() - Date.now()) / 86400000
    )
  )
  const dailyDeficit = (deltaKg * 7700) / daysTotal
  return -Math.min(dailyDeficit, 1000)
}

export function suggestGoals(tdee: number, deficit: number): SuggestedGoals {
  const calorie_target = Math.round(tdee + deficit)
  return {
    calorie_target,
    protein_g: Math.round((calorie_target * 0.30) / 4),
    carbs_g: Math.round((calorie_target * 0.40) / 4),
    fat_g: Math.round((calorie_target * 0.30) / 9),
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test
```
Expected: all 7 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/utils/bmr.ts src/utils/bmr.test.ts
git commit -m "feat: BMR/TDEE/deficit/goal utils with tests"
```

---

## Task 5: Utils — met.ts

**Files:**
- Create: `src/utils/met.ts`
- Create: `src/utils/met.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/utils/met.test.ts
import { describe, it, expect } from 'vitest'
import { MET_ACTIVITIES, calculateCaloriesBurned } from './met'

describe('MET_ACTIVITIES', () => {
  it('has 20 activities', () => {
    expect(Object.keys(MET_ACTIVITIES)).toHaveLength(20)
  })

  it('each activity has label, met, icon', () => {
    for (const key of Object.keys(MET_ACTIVITIES)) {
      const a = MET_ACTIVITIES[key]
      expect(a.label).toBeTruthy()
      expect(a.met).toBeGreaterThan(0)
      expect(a.icon).toBeTruthy()
    }
  })
})

describe('calculateCaloriesBurned', () => {
  it('calculates running 30min at 80kg', () => {
    // MET=9.8, 80kg, 0.5h → 9.8 * 80 * 0.5 = 392
    expect(calculateCaloriesBurned('running', 30, 80)).toBeCloseTo(392, 0)
  })

  it('returns 0 for unknown activity', () => {
    expect(calculateCaloriesBurned('unknown_activity', 30, 80)).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test
```

- [ ] **Step 3: Implement met.ts**

```ts
// src/utils/met.ts

export interface ActivityInfo {
  label: string
  met: number
  icon: string  // emoji
}

export const MET_ACTIVITIES: Record<string, ActivityInfo> = {
  running:     { label: 'Corsa',         met: 9.8,  icon: '🏃' },
  walking:     { label: 'Camminata',     met: 3.5,  icon: '🚶' },
  cycling:     { label: 'Ciclismo',      met: 7.5,  icon: '🚴' },
  swimming:    { label: 'Nuoto',         met: 8.0,  icon: '🏊' },
  weights:     { label: 'Pesi',          met: 5.0,  icon: '🏋️' },
  hiit:        { label: 'HIIT',          met: 10.0, icon: '⚡' },
  yoga:        { label: 'Yoga',          met: 2.5,  icon: '🧘' },
  pilates:     { label: 'Pilates',       met: 3.0,  icon: '🤸' },
  elliptical:  { label: 'Ellittica',     met: 5.0,  icon: '🔄' },
  rowing:      { label: 'Canottaggio',   met: 7.0,  icon: '🚣' },
  skiing:      { label: 'Sci',           met: 6.0,  icon: '⛷️' },
  tennis:      { label: 'Tennis',        met: 7.3,  icon: '🎾' },
  football:    { label: 'Calcio',        met: 7.0,  icon: '⚽' },
  basketball:  { label: 'Basket',        met: 6.5,  icon: '🏀' },
  climbing:    { label: 'Arrampicata',   met: 8.0,  icon: '🧗' },
  dancing:     { label: 'Danza',         met: 5.0,  icon: '💃' },
  boxing:      { label: 'Boxe',          met: 9.0,  icon: '🥊' },
  stretching:  { label: 'Stretching',    met: 2.3,  icon: '🙆' },
  hiking:      { label: 'Escursionismo', met: 6.0,  icon: '🥾' },
  spinning:    { label: 'Spinning',      met: 8.5,  icon: '🚴' },
}

export function calculateCaloriesBurned(
  activityKey: string,
  durationMin: number,
  weightKg: number
): number {
  const activity = MET_ACTIVITIES[activityKey]
  if (!activity) return 0
  return Math.round(activity.met * weightKg * (durationMin / 60))
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/met.ts src/utils/met.test.ts
git commit -m "feat: MET activity constants and calorie burn calc with tests"
```

---

## Task 6: Supabase Client + Auth Context

**Files:**
- Create: `src/services/supabase.ts`
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Create Supabase client**

```ts
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Create AuthContext**

```tsx
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Create LoginPage**

```tsx
// src/pages/LoginPage.tsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fn = mode === 'login' ? signIn : signUp
    const { error } = await fn(email, password)
    setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-emerald-400 text-center mb-8">calTrackr</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-emerald-500 outline-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-500 text-white font-semibold disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>
        <button
          onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          className="mt-4 w-full text-center text-gray-400 text-sm"
        >
          {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/supabase.ts src/contexts/AuthContext.tsx src/pages/LoginPage.tsx
git commit -m "feat: Supabase client, AuthContext, LoginPage"
```

---

## Task 7: API Service

**Files:**
- Create: `src/services/api.ts`

- [ ] **Step 1: Implement api.ts**

```ts
// src/services/api.ts
import { supabase } from './supabase'
import type {
  UserHealthProfile, UserGoals, Meal, MealItem, Workout
} from '../types'

// --- Health Profile ---

export async function getHealthProfile(): Promise<UserHealthProfile | null> {
  const { data, error } = await supabase
    .from('user_health_profiles')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertHealthProfile(
  profile: Omit<UserHealthProfile, 'created_at' | 'updated_at'>
): Promise<void> {
  const { error } = await supabase
    .from('user_health_profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
  if (error) throw error
}

// --- Goals ---

export async function getUserGoals(): Promise<UserGoals | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertUserGoals(
  goals: Omit<UserGoals, 'updated_at'>
): Promise<void> {
  const { error } = await supabase
    .from('user_goals')
    .upsert({ ...goals, updated_at: new Date().toISOString() })
  if (error) throw error
}

// --- Meals ---

export async function getMealsForDate(date: string): Promise<Meal[]> {
  const { data: meals, error: mError } = await supabase
    .from('meals')
    .select('*')
    .eq('date', date)
    .order('created_at')
  if (mError) throw mError
  if (!meals || meals.length === 0) return []

  const mealIds = meals.map(m => m.id)
  const { data: items, error: iError } = await supabase
    .from('meal_items')
    .select('*')
    .in('meal_id', mealIds)
  if (iError) throw iError

  return meals.map(m => ({
    ...m,
    items: (items ?? []).filter(i => i.meal_id === m.id),
  })) as Meal[]
}

export async function addMeal(
  meal: Omit<Meal, 'id' | 'created_at' | 'items'>
): Promise<Meal> {
  const { data, error } = await supabase
    .from('meals')
    .insert(meal)
    .select()
    .single()
  if (error) throw error
  return { ...data, items: [] } as Meal
}

export async function addMealItem(
  item: Omit<MealItem, 'id' | 'created_at'>
): Promise<MealItem> {
  const { data, error } = await supabase
    .from('meal_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data as MealItem
}

export async function deleteMealItem(id: string): Promise<void> {
  const { error } = await supabase.from('meal_items').delete().eq('id', id)
  if (error) throw error
}

// --- Workouts ---

export async function getWorkoutsForDate(date: string): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('date', date)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Workout[]
}

export async function getWorkoutsForRange(
  from: string,
  to: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw error
  return (data ?? []) as Workout[]
}

export async function addWorkout(
  workout: Omit<Workout, 'id' | 'created_at'>
): Promise<Workout> {
  const { data, error } = await supabase
    .from('workouts')
    .insert(workout)
    .select()
    .single()
  if (error) throw error
  return data as Workout
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase.from('workouts').delete().eq('id', id)
  if (error) throw error
}

// --- History ---

export async function getMealsForRange(from: string, to: string): Promise<Meal[]> {
  const { data: meals, error: mError } = await supabase
    .from('meals')
    .select('*')
    .gte('date', from)
    .lte('date', to)
  if (mError) throw mError
  if (!meals || meals.length === 0) return []

  const mealIds = meals.map(m => m.id)
  const { data: items, error: iError } = await supabase
    .from('meal_items')
    .select('*')
    .in('meal_id', mealIds)
  if (iError) throw iError

  return meals.map(m => ({
    ...m,
    items: (items ?? []).filter(i => i.meal_id === m.id),
  })) as Meal[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: api.ts CRUD for profiles, goals, meals, workouts"
```

---

## Task 8: nutrition.ts (Open Food Facts)

**Files:**
- Create: `src/services/nutrition.ts`

- [ ] **Step 1: Implement**

```ts
// src/services/nutrition.ts
import type { OFFProduct } from '../types'

const BASE = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function searchFood(query: string): Promise<OFFProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    fields: 'product_name,brands,nutriments,code',
    page_size: '20',
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  return (json.products ?? []).filter(
    (p: OFFProduct) =>
      p.product_name &&
      p.nutriments?.['energy-kcal_100g'] > 0
  ) as OFFProduct[]
}

export function calcNutrition(
  product: OFFProduct,
  quantityG: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = quantityG / 100
  return {
    calories: Math.round((product.nutriments['energy-kcal_100g'] ?? 0) * factor),
    protein_g: Math.round((product.nutriments.proteins_100g ?? 0) * factor * 10) / 10,
    carbs_g: Math.round((product.nutriments.carbohydrates_100g ?? 0) * factor * 10) / 10,
    fat_g: Math.round((product.nutriments.fat_100g ?? 0) * factor * 10) / 10,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/nutrition.ts
git commit -m "feat: Open Food Facts search + nutrition calc"
```

---

## Task 9: DataContext + SettingsContext

**Files:**
- Create: `src/contexts/DataContext.tsx`
- Create: `src/contexts/SettingsContext.tsx`

- [ ] **Step 1: Create SettingsContext (shared date state)**

```tsx
// src/contexts/SettingsContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react'
import { format } from 'date-fns'

interface SettingsContextType {
  selectedDate: string        // YYYY-MM-DD
  setSelectedDate: (d: string) => void
  today: string
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)

  return (
    <SettingsContext.Provider value={{ selectedDate, setSelectedDate, today }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
```

- [ ] **Step 2: Create DataContext**

```tsx
// src/contexts/DataContext.tsx
import {
  createContext, useContext, useState, useCallback, ReactNode
} from 'react'
import type {
  UserHealthProfile, UserGoals, Meal, MealItem, Workout, DaySummary
} from '../types'
import * as api from '../services/api'

interface DataContextType {
  profile: UserHealthProfile | null
  goals: UserGoals | null
  meals: Meal[]           // for selectedDate
  workouts: Workout[]     // for selectedDate
  loading: boolean
  toast: string | null
  fetchForDate: (date: string) => Promise<void>
  fetchProfile: () => Promise<void>
  saveProfile: (p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>) => Promise<void>
  saveGoals: (g: Omit<UserGoals, 'updated_at'>) => Promise<void>
  addMealItem: (mealType: string, item: Omit<MealItem, 'id' | 'created_at'>, date: string, userId: string) => Promise<void>
  removeMealItem: (mealItemId: string, mealId: string) => Promise<void>
  addWorkout: (w: Omit<Workout, 'id' | 'created_at'>) => Promise<void>
  removeWorkout: (id: string) => Promise<void>
  getDaySummary: () => DaySummary
  showToast: (msg: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserHealthProfile | null>(null)
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProfile = useCallback(async () => {
    const p = await api.getHealthProfile()
    setProfile(p)
    const g = await api.getUserGoals()
    setGoals(g)
  }, [])

  const fetchForDate = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [m, w] = await Promise.all([
        api.getMealsForDate(date),
        api.getWorkoutsForDate(date),
      ])
      setMeals(m)
      setWorkouts(w)
    } catch (e) {
      showToast('Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveProfile = useCallback(async (
    p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>
  ) => {
    await api.upsertHealthProfile(p)
    setProfile({ ...p, created_at: '', updated_at: new Date().toISOString() })
  }, [])

  const saveGoals = useCallback(async (g: Omit<UserGoals, 'updated_at'>) => {
    await api.upsertUserGoals(g)
    setGoals({ ...g, updated_at: new Date().toISOString() })
  }, [])

  const addMealItem = useCallback(async (
    mealType: string,
    item: Omit<MealItem, 'id' | 'created_at'>,
    date: string,
    userId: string
  ) => {
    // Find or create meal for this meal_type + date
    let meal = meals.find(m => m.meal_type === mealType && m.date === date)
    if (!meal) {
      meal = await api.addMeal({ user_id: userId, date, meal_type: mealType as any, name: null })
      setMeals(prev => [...prev, meal!])
    }
    const newItem = await api.addMealItem({ ...item, meal_id: meal.id })
    setMeals(prev => prev.map(m =>
      m.id === meal!.id ? { ...m, items: [...m.items, newItem] } : m
    ))
  }, [meals])

  const removeMealItem = useCallback(async (mealItemId: string, mealId: string) => {
    await api.deleteMealItem(mealItemId)
    setMeals(prev => prev.map(m =>
      m.id === mealId
        ? { ...m, items: m.items.filter(i => i.id !== mealItemId) }
        : m
    ))
  }, [])

  const addWorkout = useCallback(async (w: Omit<Workout, 'id' | 'created_at'>) => {
    const newW = await api.addWorkout(w)
    setWorkouts(prev => [...prev, newW])
  }, [])

  const removeWorkout = useCallback(async (id: string) => {
    await api.deleteWorkout(id)
    setWorkouts(prev => prev.filter(w => w.id !== id))
  }, [])

  function getDaySummary(): DaySummary {
    const allItems = meals.flatMap(m => m.items)
    return {
      calories: allItems.reduce((s, i) => s + i.calories, 0),
      protein_g: allItems.reduce((s, i) => s + i.protein_g, 0),
      carbs_g: allItems.reduce((s, i) => s + i.carbs_g, 0),
      fat_g: allItems.reduce((s, i) => s + i.fat_g, 0),
      calories_burned: workouts.reduce((s, w) => s + w.calories_burned, 0),
    }
  }

  return (
    <DataContext.Provider value={{
      profile, goals, meals, workouts, loading, toast,
      fetchForDate, fetchProfile, saveProfile, saveGoals,
      addMealItem, removeMealItem, addWorkout, removeWorkout,
      getDaySummary, showToast,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be inside DataProvider')
  return ctx
}
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/DataContext.tsx src/contexts/SettingsContext.tsx
git commit -m "feat: DataContext and SettingsContext"
```

---

## Task 10: Layout + Common Components

**Files:**
- Create: `src/components/layout/Layout.tsx`
- Create: `src/components/common/Toast.tsx`
- Create: `src/components/common/Modal.tsx`

- [ ] **Step 1: Create Layout with bottom nav**

```tsx
// src/components/layout/Layout.tsx
import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import Toast from '../common/Toast'

const NAV = [
  { to: '/meals',   label: 'Meals',   icon: '🍽️' },
  { to: '/workout', label: 'Workout', icon: '💪' },
  { to: '/history', label: 'History', icon: '📈' },
  { to: '/settings',label: 'Settings',icon: '⚙️' },
]

export default function Layout() {
  const { toast } = useData()

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-800 border-t border-gray-700">
        <div className="flex">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {toast && <Toast message={toast} />}
    </div>
  )
}
```

- [ ] **Step 2: Create Toast**

```tsx
// src/components/common/Toast.tsx
export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-700 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50">
      {message}
    </div>
  )
}
```

- [ ] **Step 3: Create Modal**

```tsx
// src/components/common/Modal.tsx
import { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-800 rounded-t-2xl p-6 z-10">
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: Layout with bottom nav, Toast, Modal"
```

---

## Task 11: Onboarding — Steps 1-2

**Files:**
- Create: `src/components/onboarding/StepPhysical.tsx`
- Create: `src/components/onboarding/StepObjective.tsx`

- [ ] **Step 1: StepPhysical**

```tsx
// src/components/onboarding/StepPhysical.tsx
import type { Sex } from '../../types'

interface PhysicalData {
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  body_fat_pct: number | null
}

interface Props {
  data: PhysicalData
  onChange: (d: PhysicalData) => void
  onNext: () => void
}

export default function StepPhysical({ data, onChange, onNext }: Props) {
  function set<K extends keyof PhysicalData>(key: K, value: PhysicalData[K]) {
    onChange({ ...data, [key]: value })
  }

  const valid = data.age > 0 && data.height_cm > 0 && data.weight_kg > 0

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Dati fisici</h2>

      <div className="flex gap-3">
        {(['male', 'female'] as Sex[]).map(s => (
          <button
            key={s}
            onClick={() => set('sex', s)}
            className={`flex-1 py-3 rounded-lg border-2 font-medium transition-colors ${
              data.sex === s ? 'border-emerald-500 text-emerald-400' : 'border-gray-600 text-gray-400'
            }`}
          >
            {s === 'male' ? '♂ Maschio' : '♀ Femmina'}
          </button>
        ))}
      </div>

      {[
        { label: 'Età (anni)', key: 'age' as const, min: 10, max: 100 },
        { label: 'Altezza (cm)', key: 'height_cm' as const, min: 100, max: 250 },
        { label: 'Peso (kg)', key: 'weight_kg' as const, min: 30, max: 300 },
      ].map(({ label, key, min, max }) => (
        <div key={key}>
          <label className="text-sm text-gray-400 mb-1 block">{label}</label>
          <input
            type="number"
            min={min}
            max={max}
            value={data[key] || ''}
            onChange={e => set(key, parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      ))}

      <div>
        <label className="text-sm text-gray-400 mb-1 block">% Grasso corporeo (opzionale)</label>
        <input
          type="number"
          min={3}
          max={60}
          value={data.body_fat_pct ?? ''}
          onChange={e => set('body_fat_pct', e.target.value ? parseFloat(e.target.value) : null)}
          className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full py-4 rounded-xl bg-emerald-500 font-semibold text-lg disabled:opacity-40"
      >
        Continua →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: StepObjective**

```tsx
// src/components/onboarding/StepObjective.tsx
import { useMemo } from 'react'
import type { Objective } from '../../types'
import { differenceInDays, format, addMonths } from 'date-fns'

interface ObjectiveData {
  objective: Objective
  target_weight_kg: number | null
  target_date: string | null
}

interface Props {
  data: ObjectiveData
  currentWeightKg: number
  onChange: (d: ObjectiveData) => void
  onNext: () => void
  onBack: () => void
}

const OBJECTIVES: { key: Objective; label: string; desc: string; icon: string }[] = [
  { key: 'lose_weight', label: 'Perdi peso',   desc: 'Deficit calorico personalizzato', icon: '📉' },
  { key: 'gain_muscle', label: 'Metti massa',  desc: '+250 kcal/giorno sul TDEE',       icon: '💪' },
  { key: 'maintain',    label: 'Mantieni',     desc: 'Calorie = TDEE calcolato',        icon: '⚖️' },
]

export default function StepObjective({ data, currentWeightKg, onChange, onNext, onBack }: Props) {
  function set<K extends keyof ObjectiveData>(key: K, val: ObjectiveData[K]) {
    onChange({ ...data, [key]: val })
  }

  const rateKgPerWeek = useMemo(() => {
    if (data.objective !== 'lose_weight' || !data.target_weight_kg || !data.target_date) return null
    const days = differenceInDays(new Date(data.target_date), new Date())
    if (days <= 0) return null
    const weeks = days / 7
    const deltaKg = currentWeightKg - data.target_weight_kg
    return (deltaKg / weeks).toFixed(2)
  }, [data, currentWeightKg])

  const isAggressive = rateKgPerWeek !== null && parseFloat(rateKgPerWeek) > 1

  const valid =
    data.objective === 'maintain' ||
    data.objective === 'gain_muscle' ||
    (data.objective === 'lose_weight' && !!data.target_weight_kg && !!data.target_date)

  const defaultTargetDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Qual è il tuo obiettivo?</h2>

      <div className="space-y-3">
        {OBJECTIVES.map(({ key, label, desc, icon }) => (
          <button
            key={key}
            onClick={() => onChange({
              objective: key,
              target_weight_kg: key === 'maintain' ? null : data.target_weight_kg,
              target_date: key === 'lose_weight' ? (data.target_date ?? defaultTargetDate) : null,
            })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
              data.objective === key
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span className="text-2xl mr-3">{icon}</span>
            <span className="font-semibold">{label}</span>
            <p className="text-sm text-gray-400 mt-1 ml-9">{desc}</p>
          </button>
        ))}
      </div>

      {(data.objective === 'lose_weight' || data.objective === 'gain_muscle') && (
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Peso target (kg){data.objective === 'gain_muscle' ? ' — opzionale' : ''}
          </label>
          <input
            type="number"
            min={30}
            max={300}
            value={data.target_weight_kg ?? ''}
            onChange={e => set('target_weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      )}

      {data.objective === 'lose_weight' && (
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Entro quando?</label>
          <input
            type="date"
            value={data.target_date ?? defaultTargetDate}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => set('target_date', e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
          {rateKgPerWeek && (
            <p className={`text-sm mt-2 ${isAggressive ? 'text-orange-400' : 'text-emerald-400'}`}>
              {isAggressive && '⚠️ '}Ritmo stimato: {rateKgPerWeek} kg/settimana
              {isAggressive && ' — considera un obiettivo più graduale'}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold disabled:opacity-40"
        >
          Continua →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/onboarding/StepPhysical.tsx src/components/onboarding/StepObjective.tsx
git commit -m "feat: onboarding StepPhysical and StepObjective"
```

---

## Task 12: Onboarding — Steps 3-4 + Page

**Files:**
- Create: `src/components/onboarding/StepLifestyle.tsx`
- Create: `src/components/onboarding/StepConfirm.tsx`
- Create: `src/pages/OnboardingPage.tsx`

- [ ] **Step 1: StepLifestyle**

```tsx
// src/components/onboarding/StepLifestyle.tsx
import type { ActivityLevel } from '../../types'

const LEVELS: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: 'sedentary',  label: 'Sedentario',     desc: 'Lavoro da scrivania, poco o nessun esercizio' },
  { key: 'light',      label: 'Leggero',         desc: '1-3 allenamenti a settimana' },
  { key: 'moderate',   label: 'Moderato',        desc: '3-5 allenamenti a settimana' },
  { key: 'active',     label: 'Attivo',          desc: '6-7 allenamenti a settimana' },
  { key: 'very_active',label: 'Molto attivo',    desc: 'Lavoro fisico + allenamenti giornalieri' },
]

interface Props {
  value: ActivityLevel
  onChange: (v: ActivityLevel) => void
  onNext: () => void
  onBack: () => void
}

export default function StepLifestyle({ value, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Stile di vita</h2>
      <div className="space-y-2">
        {LEVELS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
              value === key
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span className="font-semibold">{label}</span>
            <p className="text-sm text-gray-400 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button onClick={onNext} className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold">
          Continua →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: StepConfirm**

```tsx
// src/components/onboarding/StepConfirm.tsx
import { useState } from 'react'
import type { UserHealthProfile, SuggestedGoals } from '../../types'
import { calculateBMR, calculateTDEE, calculateDeficit, suggestGoals } from '../../utils/bmr'

interface Props {
  profile: Omit<UserHealthProfile, 'user_id' | 'created_at' | 'updated_at'>
  onConfirm: (goals: SuggestedGoals) => void
  onBack: () => void
}

export default function StepConfirm({ profile, onConfirm, onBack }: Props) {
  const bmr = calculateBMR({ ...profile, user_id: '', created_at: '', updated_at: '' })
  const tdee = calculateTDEE(bmr, profile.activity_level)
  const deficit = calculateDeficit({ ...profile, user_id: '', created_at: '', updated_at: '' })
  const suggested = suggestGoals(tdee, deficit)

  const [calories, setCalories] = useState(suggested.calorie_target)
  const [protein, setProtein] = useState(suggested.protein_g)
  const [carbs, setCarbs] = useState(suggested.carbs_g)
  const [fat, setFat] = useState(suggested.fat_g)

  const isAggressive = deficit < -900

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Riepilogo</h2>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">BMR</span><span>{Math.round(bmr)} kcal</span></div>
        <div className="flex justify-between"><span className="text-gray-400">TDEE</span><span>{Math.round(tdee)} kcal</span></div>
        <div className="flex justify-between">
          <span className="text-gray-400">Aggiustamento</span>
          <span className={deficit < 0 ? 'text-orange-400' : 'text-emerald-400'}>
            {deficit > 0 ? '+' : ''}{Math.round(deficit)} kcal
          </span>
        </div>
      </div>

      {isAggressive && (
        <p className="text-orange-400 text-sm bg-orange-400/10 rounded-lg p-3">
          ⚠️ Il ritmo è aggressivo (&gt;1000 kcal/giorno di deficit). Il target è stato limitato a -1000 kcal/giorno.
        </p>
      )}

      <h3 className="font-semibold">Goal calorici (modificabili)</h3>

      {[
        { label: 'Calorie (kcal)', val: calories, set: setCalories },
        { label: 'Proteine (g)', val: protein, set: setProtein },
        { label: 'Carboidrati (g)', val: carbs, set: setCarbs },
        { label: 'Grassi (g)', val: fat, set: setFat },
      ].map(({ label, val, set }) => (
        <div key={label}>
          <label className="text-sm text-gray-400 mb-1 block">{label}</label>
          <input
            type="number"
            value={val}
            onChange={e => set(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={() => onConfirm({ calorie_target: calories, protein_g: protein, carbs_g: carbs, fat_g: fat })}
          className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold text-lg"
        >
          Inizia! 🚀
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: OnboardingPage**

```tsx
// src/pages/OnboardingPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import StepPhysical from '../components/onboarding/StepPhysical'
import StepObjective from '../components/onboarding/StepObjective'
import StepLifestyle from '../components/onboarding/StepLifestyle'
import StepConfirm from '../components/onboarding/StepConfirm'
import type { Sex, ActivityLevel, Objective, SuggestedGoals } from '../types'

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const { user } = useAuth()
  const { saveProfile, saveGoals, showToast } = useData()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const [physical, setPhysical] = useState({
    age: 0, sex: 'male' as Sex, height_cm: 0, weight_kg: 0, body_fat_pct: null as number | null,
  })
  const [objective, setObjective] = useState({
    objective: 'maintain' as Objective,
    target_weight_kg: null as number | null,
    target_date: null as string | null,
  })
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')

  async function handleConfirm(goals: SuggestedGoals) {
    if (!user) return
    try {
      await saveProfile({
        user_id: user.id,
        ...physical,
        activity_level: activityLevel,
        ...objective,
        bmr_override: null,
      })
      await saveGoals({ user_id: user.id, ...goals })
      navigate('/meals')
    } catch {
      showToast('Errore salvataggio profilo')
    }
  }

  const profileForConfirm = {
    ...physical,
    activity_level: activityLevel,
    ...objective,
    bmr_override: null,
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <StepPhysical
            data={physical}
            onChange={setPhysical}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepObjective
            data={objective}
            currentWeightKg={physical.weight_kg}
            onChange={setObjective}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepLifestyle
            value={activityLevel}
            onChange={setActivityLevel}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepConfirm
            profile={profileForConfirm}
            onConfirm={handleConfirm}
            onBack={() => setStep(3)}
          />
        )}

        <button
          onClick={() => navigate('/meals')}
          className="mt-6 w-full text-center text-gray-500 text-sm"
        >
          Salta per ora
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/onboarding/ src/pages/OnboardingPage.tsx
git commit -m "feat: onboarding 4-step wizard (physical, objective, lifestyle, confirm)"
```

---

## Task 13: MealsPage Components

**Files:**
- Create: `src/components/meals/CalorieRing.tsx`
- Create: `src/components/meals/MacroBars.tsx`
- Create: `src/components/meals/MealItemRow.tsx`
- Create: `src/components/meals/MealSection.tsx`
- Create: `src/components/meals/FoodSearch.tsx`

- [ ] **Step 1: CalorieRing**

```tsx
// src/components/meals/CalorieRing.tsx

interface Props {
  consumed: number
  target: number
}

export default function CalorieRing({ consumed, target }: Props) {
  const r = 60
  const circumference = 2 * Math.PI * r
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0
  const strokeDashoffset = circumference * (1 - pct)
  const over = consumed > target

  return (
    <div className="flex flex-col items-center">
      <svg width={148} height={148} className="-rotate-90">
        <circle cx={74} cy={74} r={r} fill="none" stroke="#374151" strokeWidth={12} />
        <circle
          cx={74} cy={74} r={r} fill="none"
          stroke={over ? '#f97316' : '#10b981'}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="-mt-[90px] flex flex-col items-center">
        <span className="text-3xl font-bold">{Math.round(consumed)}</span>
        <span className="text-gray-400 text-sm">/ {target} kcal</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MacroBars**

```tsx
// src/components/meals/MacroBars.tsx

interface MacroBarProps {
  label: string
  value: number
  target: number
  color: string
}

function MacroBar({ label, value, target, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span>{Math.round(value)}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

interface Props {
  protein: number
  carbs: number
  fat: number
  targets: { protein_g: number; carbs_g: number; fat_g: number }
}

export default function MacroBars({ protein, carbs, fat, targets }: Props) {
  return (
    <div className="space-y-3">
      <MacroBar label="Proteine" value={protein} target={targets.protein_g} color="#10b981" />
      <MacroBar label="Carboidrati" value={carbs} target={targets.carbs_g} color="#3b82f6" />
      <MacroBar label="Grassi" value={fat} target={targets.fat_g} color="#f59e0b" />
    </div>
  )
}
```

- [ ] **Step 3: MealItemRow**

```tsx
// src/components/meals/MealItemRow.tsx
import type { MealItem } from '../../types'

interface Props {
  item: MealItem
  onDelete: () => void
}

export default function MealItemRow({ item, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.food_name}</p>
        <p className="text-xs text-gray-500">{item.quantity_g}g · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g</p>
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm text-emerald-400 font-medium">{Math.round(item.calories)} kcal</span>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors text-lg">
          ✕
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: MealSection**

```tsx
// src/components/meals/MealSection.tsx
import type { Meal } from '../../types'
import MealItemRow from './MealItemRow'

const LABELS: Record<string, string> = {
  breakfast: '☀️ Colazione',
  lunch:     '🍽️ Pranzo',
  dinner:    '🌙 Cena',
  snack:     '🍎 Spuntino',
}

interface Props {
  meal: Meal
  onDeleteItem: (itemId: string) => void
  onAddItem: (mealType: string) => void
}

export default function MealSection({ meal, onDeleteItem, onAddItem }: Props) {
  const total = meal.items.reduce((s, i) => s + i.calories, 0)

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-300">{LABELS[meal.meal_type] ?? meal.meal_type}</h3>
        <span className="text-sm text-gray-500">{Math.round(total)} kcal</span>
      </div>
      {meal.items.map(item => (
        <MealItemRow key={item.id} item={item} onDelete={() => onDeleteItem(item.id)} />
      ))}
      <button
        onClick={() => onAddItem(meal.meal_type)}
        className="text-sm text-emerald-400 mt-2 flex items-center gap-1"
      >
        + Aggiungi alimento
      </button>
    </div>
  )
}
```

- [ ] **Step 5: FoodSearch**

```tsx
// src/components/meals/FoodSearch.tsx
import { useState } from 'react'
import { searchFood, calcNutrition } from '../../services/nutrition'
import type { OFFProduct, MealType } from '../../types'

interface Props {
  mealType: MealType
  onAdd: (item: {
    food_name: string; quantity_g: number; calories: number
    protein_g: number; carbs_g: number; fat_g: number
    source: 'openfoodfacts' | 'manual'; off_food_id: string | null
  }) => void
  onClose: () => void
}

export default function FoodSearch({ mealType, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OFFProduct[]>([])
  const [selected, setSelected] = useState<OFFProduct | null>(null)
  const [qty, setQty] = useState(100)
  const [loading, setLoading] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  // Manual mode fields
  const [manualName, setManualName] = useState('')
  const [manualCal, setManualCal] = useState(0)
  const [manualProt, setManualProt] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    try {
      const r = await searchFood(query)
      setResults(r)
    } catch {
      setOfflineMode(true)
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (offlineMode) {
      onAdd({
        food_name: manualName, quantity_g: qty,
        calories: manualCal, protein_g: manualProt,
        carbs_g: manualCarbs, fat_g: manualFat,
        source: 'manual', off_food_id: null,
      })
      return
    }
    if (!selected) return
    const nutrition = calcNutrition(selected, qty)
    onAdd({
      food_name: selected.product_name,
      quantity_g: qty,
      ...nutrition,
      source: 'openfoodfacts',
      off_food_id: selected.code,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Aggiungi alimento</h2>
        <button onClick={onClose} className="text-gray-400 text-xl">✕</button>
      </div>

      {!offlineMode ? (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Cerca alimento..."
              className="flex-1 px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-emerald-500"
            />
            <button onClick={handleSearch} disabled={loading}
              className="px-4 py-2 bg-emerald-500 rounded-lg disabled:opacity-50">
              {loading ? '...' : '🔍'}
            </button>
          </div>

          {results.length > 0 && !selected && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.map(p => (
                <button key={p.code} onClick={() => setSelected(p)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">
                  <span className="font-medium">{p.product_name}</span>
                  {p.brands && <span className="text-gray-400 ml-2">· {p.brands}</span>}
                  <span className="text-gray-500 ml-2">
                    {Math.round(p.nutriments['energy-kcal_100g'])} kcal/100g
                  </span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{selected.product_name}</span>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">Cambia</button>
              </div>
              <div>
                <label className="text-sm text-gray-400">Quantità (g)</label>
                <input type="number" min={1} value={qty}
                  onChange={e => setQty(parseInt(e.target.value) || 100)}
                  className="w-full mt-1 px-3 py-2 rounded bg-gray-600 border border-gray-500 outline-none" />
              </div>
              {(() => {
                const n = calcNutrition(selected, qty)
                return (
                  <p className="text-sm text-emerald-400">
                    {n.calories} kcal · P {n.protein_g}g · C {n.carbs_g}g · G {n.fat_g}g
                  </p>
                )
              })()}
              <button onClick={handleAdd}
                className="w-full py-3 bg-emerald-500 rounded-lg font-semibold">
                Aggiungi
              </button>
            </div>
          )}

          <button onClick={() => setOfflineMode(true)}
            className="text-sm text-gray-500 text-center w-full">
            Inserimento manuale
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-orange-400">Open Food Facts non disponibile. Inserimento manuale.</p>
          {[
            { label: 'Nome alimento', val: manualName, set: setManualName, type: 'text' },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-sm text-gray-400">{label}</label>
              <input value={val} onChange={e => set(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            </div>
          ))}
          {[
            { label: 'Quantità (g)', val: qty, set: setQty },
            { label: 'Calorie (kcal)', val: manualCal, set: setManualCal },
            { label: 'Proteine (g)', val: manualProt, set: setManualProt },
            { label: 'Carboidrati (g)', val: manualCarbs, set: setManualCarbs },
            { label: 'Grassi (g)', val: manualFat, set: setManualFat },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-sm text-gray-400">{label}</label>
              <input type="number" value={val || ''} onChange={e => set(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded bg-gray-700 border border-gray-600 outline-none" />
            </div>
          ))}
          <button onClick={handleAdd} disabled={!manualName}
            className="w-full py-3 bg-emerald-500 rounded-lg font-semibold disabled:opacity-40">
            Aggiungi
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/meals/
git commit -m "feat: meal components (CalorieRing, MacroBars, MealSection, FoodSearch)"
```

---

## Task 14: MealsPage

**Files:**
- Create: `src/pages/MealsPage.tsx`

- [ ] **Step 1: Implement MealsPage**

```tsx
// src/pages/MealsPage.tsx
import { useEffect, useState } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import CalorieRing from '../components/meals/CalorieRing'
import MacroBars from '../components/meals/MacroBars'
import MealSection from '../components/meals/MealSection'
import FoodSearch from '../components/meals/FoodSearch'
import Modal from '../components/common/Modal'
import type { MealType } from '../types'

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function MealsPage() {
  const { user } = useAuth()
  const { meals, workouts, goals, loading, fetchForDate, addMealItem, removeMealItem, getDaySummary } = useData()
  const { selectedDate, setSelectedDate } = useSettings()

  const [foodSearchOpen, setFoodSearchOpen] = useState(false)
  const [activeMealType, setActiveMealType] = useState<MealType>('lunch')

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const summary = getDaySummary()
  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)

  const sortedMeals = [...meals].sort(
    (a, b) => MEAL_ORDER.indexOf(a.meal_type as MealType) - MEAL_ORDER.indexOf(b.meal_type as MealType)
  )

  function openFoodSearch(mealType: string) {
    setActiveMealType(mealType as MealType)
    setFoodSearchOpen(true)
  }

  const dateLabel = format(parseISO(selectedDate), 'EEEE d MMMM', { locale: it })

  return (
    <div className="p-4 space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
        >
          ‹
        </button>
        <span className="capitalize text-sm font-medium text-gray-300">{dateLabel}</span>
        <button
          onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
        >
          ›
        </button>
      </div>

      {/* Calorie ring */}
      <div className="flex justify-center">
        <CalorieRing consumed={summary.calories} target={goals?.calorie_target ?? 2000} />
      </div>

      {/* Macro bars */}
      {goals && (
        <MacroBars
          protein={summary.protein_g}
          carbs={summary.carbs_g}
          fat={summary.fat_g}
          targets={{ protein_g: goals.protein_g, carbs_g: goals.carbs_g, fat_g: goals.fat_g }}
        />
      )}

      {/* Calories burned */}
      {totalBurned > 0 && (
        <div className="flex justify-between items-center text-sm bg-gray-800 rounded-lg px-4 py-2">
          <span className="text-gray-400">🔥 Calorie bruciate</span>
          <span className="text-orange-400 font-medium">{Math.round(totalBurned)} kcal</span>
        </div>
      )}

      {/* Meal sections */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div>
          {sortedMeals.length > 0
            ? sortedMeals.map(meal => (
                <MealSection
                  key={meal.id}
                  meal={meal}
                  onDeleteItem={itemId => removeMealItem(itemId, meal.id)}
                  onAddItem={openFoodSearch}
                />
              ))
            : <p className="text-gray-500 text-sm text-center py-4">Nessun pasto registrato</p>
          }
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => openFoodSearch('lunch')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-emerald-500 text-white text-2xl shadow-lg flex items-center justify-center"
      >
        +
      </button>

      {/* Food search modal */}
      <Modal open={foodSearchOpen} onClose={() => setFoodSearchOpen(false)}>
        <FoodSearch
          mealType={activeMealType}
          onClose={() => setFoodSearchOpen(false)}
          onAdd={async (item) => {
            if (!user) return
            await addMealItem(activeMealType, {
              ...item,
              meal_id: '',  // filled by DataContext
            }, selectedDate, user.id)
            setFoodSearchOpen(false)
          }}
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/MealsPage.tsx
git commit -m "feat: MealsPage with date nav, ring, macros, meal sections, food search"
```

---

## Task 15: WorkoutPage Components + Page

**Files:**
- Create: `src/components/workout/ActivityGrid.tsx`
- Create: `src/components/workout/WorkoutDrawer.tsx`
- Create: `src/components/workout/WorkoutRow.tsx`
- Create: `src/pages/WorkoutPage.tsx`

- [ ] **Step 1: ActivityGrid**

```tsx
// src/components/workout/ActivityGrid.tsx
import { MET_ACTIVITIES } from '../../utils/met'

interface Props {
  onSelect: (activityKey: string) => void
}

export default function ActivityGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Object.entries(MET_ACTIVITIES).map(([key, { label, icon }]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="flex flex-col items-center p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
        >
          <span className="text-2xl mb-1">{icon}</span>
          <span className="text-xs text-gray-300 text-center leading-tight">{label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: WorkoutDrawer**

```tsx
// src/components/workout/WorkoutDrawer.tsx
import { useState } from 'react'
import { MET_ACTIVITIES, calculateCaloriesBurned } from '../../utils/met'
import Modal from '../common/Modal'

interface Props {
  activityKey: string | null
  weightKg: number
  onSave: (activityKey: string, durationMin: number, caloriesBurned: number) => void
  onClose: () => void
}

export default function WorkoutDrawer({ activityKey, weightKg, onSave, onClose }: Props) {
  const [duration, setDuration] = useState(30)

  if (!activityKey) return null
  const activity = MET_ACTIVITIES[activityKey]
  if (!activity) return null

  const calories = calculateCaloriesBurned(activityKey, duration, weightKg)

  return (
    <Modal open title={`${activity.icon} ${activity.label}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Durata (minuti)</label>
          <input
            type="number"
            min={1}
            max={300}
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-emerald-500 text-lg"
          />
        </div>
        <div className="bg-gray-700 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Calorie bruciate</span>
          <span className="text-2xl font-bold text-orange-400">{calories} kcal</span>
        </div>
        <button
          onClick={() => onSave(activityKey, duration, calories)}
          className="w-full py-4 bg-emerald-500 rounded-xl font-semibold text-lg"
        >
          Salva workout
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: WorkoutRow**

```tsx
// src/components/workout/WorkoutRow.tsx
import type { Workout } from '../../types'
import { MET_ACTIVITIES } from '../../utils/met'

interface Props {
  workout: Workout
  onDelete: () => void
}

export default function WorkoutRow({ workout, onDelete }: Props) {
  const activity = MET_ACTIVITIES[workout.activity]
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{activity?.icon ?? '🏃'}</span>
        <div>
          <p className="font-medium text-sm">{activity?.label ?? workout.activity}</p>
          <p className="text-xs text-gray-500">{workout.duration_min} min</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-orange-400 font-medium text-sm">{Math.round(workout.calories_burned)} kcal</span>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 text-lg">✕</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: WorkoutPage**

```tsx
// src/pages/WorkoutPage.tsx
import { useEffect, useState } from 'react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import ActivityGrid from '../components/workout/ActivityGrid'
import WorkoutDrawer from '../components/workout/WorkoutDrawer'
import WorkoutRow from '../components/workout/WorkoutRow'

export default function WorkoutPage() {
  const { user } = useAuth()
  const { workouts, profile, loading, fetchForDate, addWorkout, removeWorkout, showToast } = useData()
  const { selectedDate, setSelectedDate } = useSettings()
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)
  const dateLabel = format(parseISO(selectedDate), 'EEEE d MMMM', { locale: it })

  async function handleSave(activityKey: string, durationMin: number, caloriesBurned: number) {
    if (!user) return
    try {
      await addWorkout({
        user_id: user.id,
        date: selectedDate,
        activity: activityKey,
        duration_min: durationMin,
        calories_burned: caloriesBurned,
        notes: null,
      })
      setSelectedActivity(null)
    } catch {
      showToast('Errore salvataggio workout')
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
        >
          ‹
        </button>
        <span className="capitalize text-sm font-medium text-gray-300">{dateLabel}</span>
        <button
          onClick={() => setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))}
          className="text-gray-400 text-2xl px-2"
        >
          ›
        </button>
      </div>

      <h2 className="font-semibold text-gray-300">Seleziona attività</h2>
      <ActivityGrid onSelect={setSelectedActivity} />

      {/* Today's workouts */}
      {workouts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-300">Workout di oggi</h3>
            <span className="text-sm text-orange-400">🔥 {Math.round(totalBurned)} kcal</span>
          </div>
          {workouts.map(w => (
            <WorkoutRow key={w.id} workout={w} onDelete={() => removeWorkout(w.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <WorkoutDrawer
        activityKey={selectedActivity}
        weightKg={profile?.weight_kg ?? 70}
        onSave={handleSave}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/workout/ src/pages/WorkoutPage.tsx
git commit -m "feat: WorkoutPage with activity grid, drawer, workout list"
```

---

## Task 16: HistoryPage

**Files:**
- Create: `src/pages/HistoryPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/HistoryPage.tsx
import { useEffect, useState, useMemo } from 'react'
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useData } from '../contexts/DataContext'
import { getMealsForRange, getWorkoutsForRange } from '../services/api'
import type { Meal, Workout } from '../types'

type Range = 7 | 30

export default function HistoryPage() {
  const { goals } = useData()
  const [range, setRange] = useState<Range>(7)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const to = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), range - 1), 'yyyy-MM-dd')
    setLoading(true)
    Promise.all([getMealsForRange(from, to), getWorkoutsForRange(from, to)])
      .then(([m, w]) => { setMeals(m); setWorkouts(w) })
      .finally(() => setLoading(false))
  }, [range])

  const chartData = useMemo(() => {
    const to = new Date()
    const days = eachDayOfInterval({ start: subDays(to, range - 1), end: to })
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayMeals = meals.filter(m => m.date === dateStr)
      const dayWorkouts = workouts.filter(w => w.date === dateStr)
      const consumed = dayMeals.flatMap(m => m.items).reduce((s, i) => s + i.calories, 0)
      const burned = dayWorkouts.reduce((s, w) => s + w.calories_burned, 0)
      return {
        date: format(day, 'dd/MM'),
        Mangiato: Math.round(consumed),
        Bruciato: Math.round(burned),
      }
    })
  }, [meals, workouts, range])

  const avgConsumed = chartData.reduce((s, d) => s + d.Mangiato, 0) / chartData.length
  const avgBurned = chartData.reduce((s, d) => s + d.Bruciato, 0) / chartData.length

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2">
        {([7, 30] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>
            {r} giorni
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-gray-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              {goals && (
                <Line type="monotone" dataKey={() => goals.calorie_target}
                  stroke="#6b7280" strokeDasharray="4 4" dot={false} name="Target" />
              )}
              <Line type="monotone" dataKey="Mangiato" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bruciato" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Media kcal/giorno</p>
          <p className="text-2xl font-bold text-emerald-400">{Math.round(avgConsumed)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Media bruciate/giorno</p>
          <p className="text-2xl font-bold text-orange-400">{Math.round(avgBurned)}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/HistoryPage.tsx
git commit -m "feat: HistoryPage with calorie/burned line chart"
```

---

## Task 17: SettingsPage

**Files:**
- Create: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { calculateBMR, calculateTDEE, calculateDeficit, suggestGoals } from '../utils/bmr'

export default function SettingsPage() {
  const { signOut } = useAuth()
  const { profile, goals, saveGoals, showToast } = useData()

  const [calories, setCalories] = useState(goals?.calorie_target ?? 2000)
  const [protein, setProtein] = useState(goals?.protein_g ?? 150)
  const [carbs, setCarbs] = useState(goals?.carbs_g ?? 200)
  const [fat, setFat] = useState(goals?.fat_g ?? 67)

  async function handleSaveGoals() {
    if (!goals) return
    try {
      await saveGoals({
        user_id: goals.user_id,
        calorie_target: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      })
      showToast('Goal salvati')
    } catch {
      showToast('Errore salvataggio')
    }
  }

  function handleRecalculate() {
    if (!profile) return
    const bmr = calculateBMR(profile)
    const tdee = calculateTDEE(bmr, profile.activity_level)
    const deficit = calculateDeficit(profile)
    const suggested = suggestGoals(tdee, deficit)
    setCalories(suggested.calorie_target)
    setProtein(suggested.protein_g)
    setCarbs(suggested.carbs_g)
    setFat(suggested.fat_g)
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Impostazioni</h1>

      {profile && (
        <div className="bg-gray-800 rounded-xl p-4 space-y-1 text-sm">
          <h2 className="font-semibold mb-2">Profilo</h2>
          <p className="text-gray-400">Peso: <span className="text-white">{profile.weight_kg} kg</span></p>
          <p className="text-gray-400">Altezza: <span className="text-white">{profile.height_cm} cm</span></p>
          <p className="text-gray-400">Obiettivo: <span className="text-white capitalize">{profile.objective.replace('_', ' ')}</span></p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Goal calorici</h2>
          <button onClick={handleRecalculate}
            className="text-xs text-emerald-400 border border-emerald-400 px-3 py-1 rounded-full">
            Ricalcola da TDEE
          </button>
        </div>

        {[
          { label: 'Calorie (kcal)', val: calories, set: setCalories },
          { label: 'Proteine (g)', val: protein, set: setProtein },
          { label: 'Carboidrati (g)', val: carbs, set: setCarbs },
          { label: 'Grassi (g)', val: fat, set: setFat },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-sm text-gray-400 mb-1 block">{label}</label>
            <input type="number" value={val}
              onChange={e => set(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none" />
          </div>
        ))}

        <button onClick={handleSaveGoals}
          className="w-full py-3 bg-emerald-500 rounded-xl font-semibold">
          Salva goal
        </button>
      </div>

      <button onClick={signOut}
        className="w-full py-3 border border-red-500 text-red-400 rounded-xl font-semibold mt-8">
        Logout
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: SettingsPage with goal editing and TDEE recalculation"
```

---

## Task 18: App.tsx + Routing

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: App.tsx**

```tsx
// src/App.tsx
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useData } from './contexts/DataContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import MealsPage from './pages/MealsPage'
import WorkoutPage from './pages/WorkoutPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { profile, fetchProfile } = useData()

  useEffect(() => {
    if (user) fetchProfile()
  }, [user, fetchProfile])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-emerald-400 text-2xl">⏳</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  if (profile === null) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/meals" replace />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/workout" element={<WorkoutPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="*" element={<Navigate to="/meals" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: main.tsx**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { SettingsProvider } from './contexts/SettingsContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>
)
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```
Expected: build succeeds with no errors

- [ ] **Step 4: Start dev server and verify manually**

```bash
npm run dev
```

Verify manually:
- [ ] Login page renders at localhost:5173
- [ ] Login/signup works with Supabase credentials
- [ ] New user → redirected to Onboarding
- [ ] 4-step onboarding wizard navigates correctly
- [ ] Step 2 (Objective) shows target fields for "lose_weight"
- [ ] Deficit warning shows if rate > 1kg/week
- [ ] After onboarding → Meals tab renders
- [ ] Date navigation works (prev/next day)
- [ ] "+" FAB opens food search modal
- [ ] Food search returns OFF results
- [ ] Adding food item updates calorie ring
- [ ] Workout tab → activity grid shows 20 activities
- [ ] Tap activity → drawer opens with duration input + live calorie preview
- [ ] Save workout → appears in workout list
- [ ] Calories burned row appears on Meals tab
- [ ] History tab → chart renders with 7d/30d toggle
- [ ] Settings → goal editing + TDEE recalculate works

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: App routing, context wiring, complete calTrackr Phase 1"
```
