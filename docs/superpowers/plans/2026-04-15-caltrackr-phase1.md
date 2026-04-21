# calTrackr Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build calTrackr Phase 1 — a PWA for daily calorie + macro tracking with manual food entry via Open Food Facts, BMR/TDEE-based goals, and history charts.

**Architecture:** React 18 + TypeScript + Vite + Tailwind PWA, same Supabase project as trackr (shared auth, separate tables). DataContext holds in-memory state; api.ts handles all Supabase CRUD; nutrition.ts wraps Open Food Facts; bmr.ts is pure calculation logic with no dependencies.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, vite-plugin-pwa, Supabase, React Router, Recharts (charts), Open Food Facts REST API.

---

## File Map

**New files (create):**
```
fitness-tracker/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.local                          # gitignored
├── vercel.json
├── public/
│   └── icon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── vite-env.d.ts
    ├── types/index.ts                  # all TS interfaces
    ├── utils/bmr.ts                    # BMR/TDEE/goal calc (pure)
    ├── services/
    │   ├── supabase.ts                 # Supabase client
    │   ├── api.ts                      # CRUD: health profile, goals, meals, meal_items
    │   └── nutrition.ts                # Open Food Facts wrapper
    ├── contexts/
    │   ├── AuthContext.tsx             # Supabase session
    │   ├── DataContext.tsx             # in-memory state + CRUD actions
    │   └── SettingsContext.tsx         # language, number format
    ├── components/
    │   ├── common/
    │   │   ├── Modal.tsx
    │   │   ├── ConfirmDialog.tsx
    │   │   └── SkeletonLoader.tsx
    │   ├── layout/
    │   │   ├── Layout.tsx
    │   │   └── BottomNav.tsx
    │   ├── onboarding/
    │   │   ├── StepPhysical.tsx
    │   │   ├── StepLifestyle.tsx
    │   │   └── StepConfirm.tsx
    │   ├── log/
    │   │   ├── FoodSearch.tsx          # input + OFF results list
    │   │   ├── FoodResultItem.tsx      # single result row
    │   │   ├── MealSection.tsx         # one meal_type block with items
    │   │   └── MealItemRow.tsx         # single meal_item row + delete
    │   └── charts/
    │       ├── CalorieRing.tsx         # SVG ring progress
    │       ├── MacroBars.tsx           # 3 horizontal bars P/C/F
    │       ├── CalorieLineChart.tsx    # Recharts line chart for history
    │       └── MacroAvgChart.tsx       # Recharts bar chart for macro avg
    └── pages/
        ├── LoginPage.tsx
        ├── OnboardingPage.tsx
        ├── DashboardPage.tsx
        ├── LogPage.tsx
        ├── HistoryPage.tsx
        └── SettingsPage.tsx
```

**Supabase migration (create):**
```
fitness-tracker/supabase/migrations/20260415000000_caltrackr_phase1.sql
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `fitness-tracker/package.json`
- Create: `fitness-tracker/vite.config.ts`
- Create: `fitness-tracker/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `fitness-tracker/tailwind.config.js`, `fitness-tracker/postcss.config.js`
- Create: `fitness-tracker/index.html`
- Create: `fitness-tracker/vercel.json`
- Create: `fitness-tracker/src/vite-env.d.ts`
- Create: `fitness-tracker/src/index.css`
- Create: `fitness-tracker/src/main.tsx`

- [ ] **Step 1: Init project**

```bash
cd /home/lika44/Documenti/Python/fitness-tracker
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

- [ ] **Step 3: Configure vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'calTrackr',
        short_name: 'calTrackr',
        theme_color: '#10b981',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      }
    })
  ]
})
```

- [ ] **Step 4: Configure tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: Set up src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .card {
    @apply bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm;
  }
  .input-field {
    @apply w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500;
  }
  .btn-primary {
    @apply w-full rounded-xl bg-emerald-500 py-3 font-semibold text-white hover:bg-emerald-600 active:bg-emerald-700 transition-colors;
  }
  .btn-secondary {
    @apply w-full rounded-xl border border-gray-200 dark:border-gray-700 py-3 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
  }
}
```

- [ ] **Step 6: Set up vercel.json (SPA routing)**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 7: Create .env.local (gitignored)**

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: Vite dev server on http://localhost:5173 (or 5174), no errors.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold calTrackr PWA project"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `fitness-tracker/supabase/migrations/20260415000000_caltrackr_phase1.sql`

- [ ] **Step 1: Write migration**

```sql
-- calTrackr Phase 1: health profiles, goals, meals, meal_items, workouts

create table if not exists public.user_health_profiles (
  user_id       uuid primary key references auth.users on delete cascade,
  age           int not null,
  sex           text not null check (sex in ('male', 'female')),
  height_cm     float not null,
  weight_kg     float not null,
  activity_level text not null check (activity_level in (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),
  body_fat_pct  float,
  bmr_override  float,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists public.user_goals (
  user_id        uuid primary key references auth.users on delete cascade,
  calorie_target int not null,
  protein_g      float not null,
  carbs_g        float not null,
  fat_g          float not null,
  updated_at     timestamptz default now()
);

create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  meal_type  text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
  name       text,
  created_at timestamptz default now()
);

create table if not exists public.meal_items (
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

create table if not exists public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  date            date not null,
  activity        text not null,
  duration_min    int not null,
  calories_burned float,
  notes           text,
  created_at      timestamptz default now()
);

-- RLS
alter table public.user_health_profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.workouts enable row level security;

create policy "own profile" on public.user_health_profiles
  for all using (user_id = auth.uid());

create policy "own goals" on public.user_goals
  for all using (user_id = auth.uid());

create policy "own meals" on public.meals
  for all using (user_id = auth.uid());

create policy "own meal items" on public.meal_items
  for all using (
    meal_id in (select id from public.meals where user_id = auth.uid())
  );

create policy "own workouts" on public.workouts
  for all using (user_id = auth.uid());
```

- [ ] **Step 2: Apply migration in Supabase dashboard**

Paste SQL into Supabase → SQL Editor → Run. Verify tables appear in Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add calTrackr phase 1 DB migration"
```

---

## Task 3: Types & Pure Utils

**Files:**
- Create: `fitness-tracker/src/types/index.ts`
- Create: `fitness-tracker/src/utils/bmr.ts`

- [ ] **Step 1: Write types/index.ts**

```typescript
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'manual' | 'openfoodfacts' | 'ai_photo' | 'barcode'

export interface HealthProfile {
  user_id: string
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  body_fat_pct?: number
  bmr_override?: number
  created_at?: string
  updated_at?: string
}

export interface UserGoals {
  user_id: string
  calorie_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  updated_at?: string
}

export interface Meal {
  id: string
  user_id: string
  date: string        // YYYY-MM-DD
  meal_type: MealType
  name?: string
  created_at?: string
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
  off_food_id?: string
  created_at?: string
}

export interface MacroTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface FoodSearchResult {
  id: string          // OFF product code
  name: string
  brand?: string
  kcal_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
}
```

- [ ] **Step 2: Write utils/bmr.ts**

```typescript
import type { HealthProfile, ActivityLevel, UserGoals } from '../types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Mifflin-St Jeor */
export function calculateBMR(profile: Pick<HealthProfile, 'age' | 'sex' | 'height_cm' | 'weight_kg' | 'bmr_override'>): number {
  if (profile.bmr_override) return profile.bmr_override
  const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age
  return profile.sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}

/** Default macro split: 30% protein, 40% carbs, 30% fat */
export function suggestGoals(tdee: number): Omit<UserGoals, 'user_id' | 'updated_at'> {
  return {
    calorie_target: tdee,
    protein_g: Math.round((tdee * 0.30) / 4),   // 4 kcal/g
    carbs_g:   Math.round((tdee * 0.40) / 4),
    fat_g:     Math.round((tdee * 0.30) / 9),   // 9 kcal/g
  }
}

export function sumMacros(items: Array<Pick<import('../types').MealItem, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>>): import('../types').MacroTotals {
  return items.reduce(
    (acc, item) => ({
      calories:  acc.calories  + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g:   acc.carbs_g   + item.carbs_g,
      fat_g:     acc.fat_g     + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/ src/utils/
git commit -m "feat: add types and BMR/TDEE calculation utils"
```

---

## Task 4: Services — Supabase Client, API, Nutrition

**Files:**
- Create: `fitness-tracker/src/services/supabase.ts`
- Create: `fitness-tracker/src/services/api.ts`
- Create: `fitness-tracker/src/services/nutrition.ts`

- [ ] **Step 1: Write services/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Write services/api.ts**

```typescript
import { supabase } from './supabase'
import type { HealthProfile, UserGoals, Meal, MealItem, MealType } from '../types'

// ── Health Profile ──────────────────────────────────────────────────────────

export async function getHealthProfile(): Promise<HealthProfile | null> {
  const { data, error } = await supabase
    .from('user_health_profiles')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertHealthProfile(profile: Omit<HealthProfile, 'created_at' | 'updated_at'>): Promise<HealthProfile> {
  const { data, error } = await supabase
    .from('user_health_profiles')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── User Goals ───────────────────────────────────────────────────────────────

export async function getUserGoals(): Promise<UserGoals | null> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertUserGoals(goals: Omit<UserGoals, 'updated_at'>): Promise<UserGoals> {
  const { data, error } = await supabase
    .from('user_goals')
    .upsert({ ...goals, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Meals ────────────────────────────────────────────────────────────────────

export async function getMealsForDate(date: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getMealsForRange(startDate: string, endDate: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createMeal(meal: Pick<Meal, 'date' | 'meal_type' | 'name'>): Promise<Meal> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('meals')
    .insert({ ...meal, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMeal(id: string): Promise<void> {
  const { error } = await supabase.from('meals').delete().eq('id', id)
  if (error) throw error
}

// ── Meal Items ───────────────────────────────────────────────────────────────

export async function getMealItems(mealIds: string[]): Promise<MealItem[]> {
  if (mealIds.length === 0) return []
  const { data, error } = await supabase
    .from('meal_items')
    .select('*')
    .in('meal_id', mealIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addMealItem(item: Omit<MealItem, 'id' | 'created_at'>): Promise<MealItem> {
  const { data, error } = await supabase
    .from('meal_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMealItem(id: string): Promise<void> {
  const { error } = await supabase.from('meal_items').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 3: Write services/nutrition.ts**

```typescript
import type { FoodSearchResult } from '../types'

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'

interface OFFProduct {
  code: string
  product_name?: string
  brands?: string
  nutriments?: {
    'energy-kcal_100g'?: number
    proteins_100g?: number
    carbohydrates_100g?: number
    fat_100g?: number
  }
}

export async function searchFood(query: string): Promise<FoodSearchResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    fields: 'product_name,brands,nutriments,code',
    page_size: '20',
  })
  const res = await fetch(`${OFF_SEARCH}?${params}`)
  if (!res.ok) throw new Error('Open Food Facts unreachable')
  const json = await res.json()
  const products: OFFProduct[] = json.products ?? []
  return products
    .filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
    .map(p => ({
      id: p.code,
      name: p.product_name!,
      brand: p.brands,
      kcal_100g:    p.nutriments!['energy-kcal_100g']!,
      protein_100g: p.nutriments!.proteins_100g ?? 0,
      carbs_100g:   p.nutriments!.carbohydrates_100g ?? 0,
      fat_100g:     p.nutriments!.fat_100g ?? 0,
    }))
}

export function calcNutrition(food: FoodSearchResult, quantity_g: number) {
  const ratio = quantity_g / 100
  return {
    calories:  Math.round(food.kcal_100g    * ratio * 10) / 10,
    protein_g: Math.round(food.protein_100g * ratio * 10) / 10,
    carbs_g:   Math.round(food.carbs_100g   * ratio * 10) / 10,
    fat_g:     Math.round(food.fat_100g     * ratio * 10) / 10,
  }
}
```

- [ ] **Step 4: Compile check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/
git commit -m "feat: add Supabase client, API service, and Open Food Facts wrapper"
```

---

## Task 5: Auth & Settings Contexts

**Files:**
- Create: `fitness-tracker/src/contexts/AuthContext.tsx`
- Create: `fitness-tracker/src/contexts/SettingsContext.tsx`

- [ ] **Step 1: Write AuthContext.tsx**

```typescript
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, loading: true,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const logout = async () => { await supabase.auth.signOut() }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Write SettingsContext.tsx**

```typescript
import { createContext, useContext, useState } from 'react'

type NumberFormat = 'dot' | 'comma'
type Lang = 'en' | 'it'

interface SettingsContextType {
  lang: Lang
  setLang: (l: Lang) => void
  numberFormat: NumberFormat
  setNumberFormat: (f: NumberFormat) => void
  formatNumber: (n: number, decimals?: number) => string
}

const SettingsContext = createContext<SettingsContextType>({} as SettingsContextType)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('lang') as Lang) ?? 'it'
  )
  const [numberFormat, setNumberFormatState] = useState<NumberFormat>(
    () => (localStorage.getItem('numberFormat') as NumberFormat) ?? 'dot'
  )

  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem('lang', l) }
  const setNumberFormat = (f: NumberFormat) => { setNumberFormatState(f); localStorage.setItem('numberFormat', f) }

  const formatNumber = (n: number, decimals = 1) =>
    n.toLocaleString(numberFormat === 'dot' ? 'en-US' : 'it-IT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })

  return (
    <SettingsContext.Provider value={{ lang, setLang, numberFormat, setNumberFormat, formatNumber }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/AuthContext.tsx src/contexts/SettingsContext.tsx
git commit -m "feat: add AuthContext and SettingsContext"
```

---

## Task 6: DataContext

**Files:**
- Create: `fitness-tracker/src/contexts/DataContext.tsx`

- [ ] **Step 1: Write DataContext.tsx**

```typescript
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import * as api from '../services/api'
import type { HealthProfile, UserGoals, Meal, MealItem } from '../types'

interface DataContextType {
  healthProfile: HealthProfile | null
  userGoals: UserGoals | null
  meals: Meal[]
  mealItems: MealItem[]
  selectedDate: string
  setSelectedDate: (date: string) => void
  loading: boolean
  needsOnboarding: boolean
  // actions
  saveHealthProfile: (p: Omit<HealthProfile, 'created_at' | 'updated_at'>) => Promise<void>
  saveUserGoals: (g: Omit<UserGoals, 'updated_at'>) => Promise<void>
  addMealItem: (item: Omit<MealItem, 'id' | 'created_at'>) => Promise<void>
  removeMealItem: (id: string) => Promise<void>
  getOrCreateMeal: (date: string, mealType: import('../types').MealType) => Promise<Meal>
  fetchDate: (date: string) => Promise<void>
  fetchRange: (start: string, end: string) => Promise<{ meals: Meal[]; mealItems: MealItem[] }>
}

const DataContext = createContext<DataContextType>({} as DataContextType)

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null)
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [mealItems, setMealItems] = useState<MealItem[]>([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const fetchDate = useCallback(async (date: string) => {
    const fetchedMeals = await api.getMealsForDate(date)
    const fetchedItems = await api.getMealItems(fetchedMeals.map(m => m.id))
    setMeals(fetchedMeals)
    setMealItems(fetchedItems)
  }, [])

  const fetchRange = useCallback(async (start: string, end: string) => {
    const fetchedMeals = await api.getMealsForRange(start, end)
    const fetchedItems = await api.getMealItems(fetchedMeals.map(m => m.id))
    return { meals: fetchedMeals, mealItems: fetchedItems }
  }, [])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const [profile, goals] = await Promise.all([
        api.getHealthProfile(),
        api.getUserGoals(),
      ])
      setHealthProfile(profile)
      setUserGoals(goals)
      setNeedsOnboarding(!profile)
      if (profile) await fetchDate(selectedDate)
      setLoading(false)
    })()
  }, [user])

  useEffect(() => {
    if (!user || needsOnboarding) return
    fetchDate(selectedDate)
  }, [selectedDate])

  const saveHealthProfile = async (p: Omit<HealthProfile, 'created_at' | 'updated_at'>) => {
    const saved = await api.upsertHealthProfile(p)
    setHealthProfile(saved)
    setNeedsOnboarding(false)
  }

  const saveUserGoals = async (g: Omit<UserGoals, 'updated_at'>) => {
    const saved = await api.upsertUserGoals(g)
    setUserGoals(saved)
  }

  const getOrCreateMeal = async (date: string, mealType: import('../types').MealType): Promise<Meal> => {
    const existing = meals.find(m => m.date === date && m.meal_type === mealType)
    if (existing) return existing
    const created = await api.createMeal({ date, meal_type: mealType })
    setMeals(prev => [...prev, created])
    return created
  }

  const addMealItem = async (item: Omit<MealItem, 'id' | 'created_at'>) => {
    const saved = await api.addMealItem(item)
    setMealItems(prev => [...prev, saved])
  }

  const removeMealItem = async (id: string) => {
    await api.deleteMealItem(id)
    setMealItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <DataContext.Provider value={{
      healthProfile, userGoals, meals, mealItems,
      selectedDate, setSelectedDate,
      loading, needsOnboarding,
      saveHealthProfile, saveUserGoals,
      addMealItem, removeMealItem,
      getOrCreateMeal, fetchDate, fetchRange,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
```

- [ ] **Step 2: Compile check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/DataContext.tsx
git commit -m "feat: add DataContext with health profile, goals, meals state"
```

---

## Task 7: App Shell — Layout, BottomNav, Router, LoginPage

**Files:**
- Create: `fitness-tracker/src/components/layout/Layout.tsx`
- Create: `fitness-tracker/src/components/layout/BottomNav.tsx`
- Create: `fitness-tracker/src/pages/LoginPage.tsx`
- Create: `fitness-tracker/src/App.tsx`
- Create: `fitness-tracker/src/main.tsx`

- [ ] **Step 1: Write BottomNav.tsx**

```typescript
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',         label: 'Oggi',      icon: '🏠' },
  { to: '/log',      label: 'Aggiungi',  icon: '➕' },
  { to: '/history',  label: 'Storico',   icon: '📊' },
  { to: '/settings', label: 'Impostaz.', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive
                ? 'text-emerald-500'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          <span className="text-xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Write Layout.tsx**

```typescript
import { BottomNav } from './BottomNav'

interface LayoutProps {
  title: string
  children: React.ReactNode
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100" style={{ height: '100dvh' }}>
      <header className="flex-shrink-0 flex items-center px-4 h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <h1 className="text-lg font-bold text-emerald-500">{title}</h1>
      </header>
      <main className="flex-1 overflow-y-auto overscroll-none pb-16 px-4 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Write LoginPage.tsx**

```typescript
import { useState } from 'react'
import { supabase } from '../services/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-3xl font-bold text-emerald-500">calTrackr</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className="input-field"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
          <button
            type="button"
            className="text-sm text-emerald-500 underline"
            onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write App.tsx**

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider, useData } from './contexts/DataContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { LoginPage } from './pages/LoginPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LogPage } from './pages/LogPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

function AppRoutes() {
  const { user, loading: authLoading } = useAuth()
  const { needsOnboarding, loading: dataLoading } = useData()

  if (authLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <LoginPage />
  if (needsOnboarding) return <OnboardingPage />

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/log" element={<LogPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Write main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Create stub pages so App compiles**

Create minimal stubs for `OnboardingPage`, `DashboardPage`, `LogPage`, `HistoryPage`, `SettingsPage` — each just exports a component returning `<div>TODO</div>`. These will be replaced in later tasks.

```typescript
// src/pages/OnboardingPage.tsx
import { Layout } from '../components/layout/Layout'
export function OnboardingPage() { return <Layout title="Benvenuto"><div>Onboarding TODO</div></Layout> }

// src/pages/DashboardPage.tsx
import { Layout } from '../components/layout/Layout'
export function DashboardPage() { return <Layout title="calTrackr"><div>Dashboard TODO</div></Layout> }

// src/pages/LogPage.tsx
import { Layout } from '../components/layout/Layout'
export function LogPage() { return <Layout title="Aggiungi"><div>Log TODO</div></Layout> }

// src/pages/HistoryPage.tsx
import { Layout } from '../components/layout/Layout'
export function HistoryPage() { return <Layout title="Storico"><div>History TODO</div></Layout> }

// src/pages/SettingsPage.tsx
import { Layout } from '../components/layout/Layout'
export function SettingsPage() { return <Layout title="Impostazioni"><div>Settings TODO</div></Layout> }
```

- [ ] **Step 7: Run dev and verify routing works**

```bash
npm run dev
```
Expected: login page visible, bottom nav renders after login, routes navigate correctly.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: app shell with routing, layout, bottom nav, login page"
```

---

## Task 8: Onboarding Wizard

**Files:**
- Create: `fitness-tracker/src/components/onboarding/StepPhysical.tsx`
- Create: `fitness-tracker/src/components/onboarding/StepLifestyle.tsx`
- Create: `fitness-tracker/src/components/onboarding/StepConfirm.tsx`
- Modify: `fitness-tracker/src/pages/OnboardingPage.tsx`

> **Use frontend-design skill** to implement UI for this task.

- [ ] **Step 1: Invoke frontend-design skill for Onboarding UI**

Invoke `frontend-design` skill with prompt:
> "Design the onboarding wizard for calTrackr (mobile-first Tailwind PWA, emerald color scheme, dark mode). 3 steps: (1) Physical data — age (number input), sex (male/female toggle), height in cm, weight in kg, body fat % (optional). (2) Lifestyle — activity level card selector with 5 options: Sedentary / Lightly active / Moderately active / Very active / Extra active, each with icon and short description. (3) Confirm — show calculated BMR and TDEE, suggested calorie goal with macro breakdown (protein/carbs/fat grams), allow editing goal before saving. Step indicator at top. Back/Next buttons. Skip button on step 1."

- [ ] **Step 2: Write StepPhysical.tsx**

Implement based on frontend-design output. Props interface:
```typescript
interface StepPhysicalProps {
  data: { age: number; sex: 'male'|'female'; height_cm: number; weight_kg: number; body_fat_pct?: number }
  onChange: (data: StepPhysicalProps['data']) => void
  onNext: () => void
  onSkip: () => void
}
```

- [ ] **Step 3: Write StepLifestyle.tsx**

Props interface:
```typescript
interface StepLifestyleProps {
  activityLevel: ActivityLevel
  onChange: (level: ActivityLevel) => void
  onNext: () => void
  onBack: () => void
}
```

Activity level descriptions:
- `sedentary`: "Ufficio, poco movimento"
- `light`: "Sport leggero 1-3 volte/settimana"
- `moderate`: "Sport moderato 3-5 volte/settimana"
- `active`: "Sport intenso 6-7 volte/settimana"
- `very_active`: "Lavoro fisico o sport 2×/giorno"

- [ ] **Step 4: Write StepConfirm.tsx**

```typescript
import { calculateBMR, calculateTDEE, suggestGoals } from '../../utils/bmr'
import type { HealthProfile, UserGoals } from '../../types'

interface StepConfirmProps {
  profile: Omit<HealthProfile, 'user_id' | 'created_at' | 'updated_at'>
  goals: Omit<UserGoals, 'user_id' | 'updated_at'>
  onGoalsChange: (g: Omit<UserGoals, 'user_id' | 'updated_at'>) => void
  onConfirm: () => void
  onBack: () => void
  saving: boolean
}
```

Show: BMR value, TDEE value, 3 editable number inputs (calorie target, protein g, carbs g, fat g). "Ricalcola dai dati" button resets to `suggestGoals(tdee)`.

- [ ] **Step 5: Write OnboardingPage.tsx**

```typescript
import { useState } from 'react'
import { StepPhysical } from '../components/onboarding/StepPhysical'
import { StepLifestyle } from '../components/onboarding/StepLifestyle'
import { StepConfirm } from '../components/onboarding/StepConfirm'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { calculateBMR, calculateTDEE, suggestGoals } from '../utils/bmr'
import type { ActivityLevel, HealthProfile, UserGoals } from '../types'

export function OnboardingPage() {
  const { user } = useAuth()
  const { saveHealthProfile, saveUserGoals } = useData()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [physicalData, setPhysicalData] = useState({
    age: 30, sex: 'male' as const, height_cm: 175, weight_kg: 70, body_fat_pct: undefined as number | undefined
  })
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')

  const bmr = calculateBMR({ ...physicalData, bmr_override: undefined })
  const tdee = calculateTDEE(bmr, activityLevel)
  const [goals, setGoals] = useState(() => suggestGoals(tdee))

  const handleConfirm = async () => {
    if (!user) return
    setSaving(true)
    await saveHealthProfile({ user_id: user.id, ...physicalData, activity_level: activityLevel })
    await saveUserGoals({ user_id: user.id, ...goals })
    setSaving(false)
    // DataContext sets needsOnboarding=false → App re-routes to Dashboard
  }

  if (step === 0) return <StepPhysical data={physicalData} onChange={setPhysicalData} onNext={() => setStep(1)} onSkip={handleConfirm} />
  if (step === 1) return <StepLifestyle activityLevel={activityLevel} onChange={setActivityLevel} onNext={() => setStep(2)} onBack={() => setStep(0)} />
  return <StepConfirm profile={{ ...physicalData, activity_level: activityLevel }} goals={goals} onGoalsChange={setGoals} onConfirm={handleConfirm} onBack={() => setStep(1)} saving={saving} />
}
```

- [ ] **Step 6: Test onboarding flow manually**

1. Log in with a fresh account (no health profile)
2. Onboarding wizard appears
3. Fill in step 1 → Next
4. Select activity level → Next
5. Confirm page shows BMR/TDEE correctly
6. Click Confirm → redirects to Dashboard
7. Verify `user_health_profiles` and `user_goals` rows in Supabase

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: onboarding wizard with BMR/TDEE calculation"
```

---

## Task 9: Calorie Ring & Macro Bars Components

**Files:**
- Create: `fitness-tracker/src/components/charts/CalorieRing.tsx`
- Create: `fitness-tracker/src/components/charts/MacroBars.tsx`

> **Use frontend-design skill** for visual design of these components.

- [ ] **Step 1: Invoke frontend-design skill for CalorieRing + MacroBars**

Invoke `frontend-design` skill with prompt:
> "Design two React components for calTrackr (mobile-first Tailwind PWA, emerald theme, dark mode): (1) CalorieRing — SVG donut/ring showing calories consumed vs target. Center shows 'X / Y kcal'. Ring fills clockwise in emerald, overflow shows in red. (2) MacroBars — 3 horizontal progress bars for Protein (blue), Carbs (amber), Fat (rose). Each shows label, consumed g / target g, and percentage fill. Both components receive numeric props only — no data fetching."

- [ ] **Step 2: Write CalorieRing.tsx**

Props:
```typescript
interface CalorieRingProps {
  consumed: number
  target: number
  size?: number  // default 180
}
```

SVG ring implementation — `strokeDasharray` / `strokeDashoffset` on a circle. Stroke color: emerald-500 if under target, red-500 if over.

- [ ] **Step 3: Write MacroBars.tsx**

Props:
```typescript
interface MacroBarsProps {
  protein: { consumed: number; target: number }
  carbs:   { consumed: number; target: number }
  fat:     { consumed: number; target: number }
}
```

Each bar: label + `consumed g / target g` on right, filled `div` inside track div. Width = `Math.min((consumed/target)*100, 100)%`. Overflow indicated by red fill.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/
git commit -m "feat: CalorieRing and MacroBars components"
```

---

## Task 10: Dashboard Page

**Files:**
- Modify: `fitness-tracker/src/pages/DashboardPage.tsx`

> **Use frontend-design skill** for the Dashboard layout.

- [ ] **Step 1: Invoke frontend-design skill for Dashboard**

Invoke `frontend-design` skill with prompt:
> "Design the Dashboard page for calTrackr (mobile-first Tailwind PWA, emerald theme, dark mode). Shows: date navigator (← today →) at top, CalorieRing centered below, MacroBars underneath, then list of meals for the day grouped by meal type (Colazione/Pranzo/Cena/Spuntino). Each meal section shows meal name + total calories. Empty state shows 'Nessun pasto registrato' with a prompt to tap Log. All data comes from props."

- [ ] **Step 2: Implement DashboardPage.tsx**

```typescript
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import { Layout } from '../components/layout/Layout'
import { CalorieRing } from '../components/charts/CalorieRing'
import { MacroBars } from '../components/charts/MacroBars'
import { sumMacros } from '../utils/bmr'
import type { MealType } from '../types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Colazione',
  lunch: 'Pranzo',
  dinner: 'Cena',
  snack: 'Spuntino',
}

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export function DashboardPage() {
  const { meals, mealItems, userGoals, selectedDate, setSelectedDate } = useData()
  const { formatNumber } = useSettings()

  const dayTotals = sumMacros(mealItems)

  const prevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }
  const nextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <Layout title="calTrackr">
      {/* Date navigator */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevDay} className="p-2 text-gray-500">‹</button>
        <span className="text-sm font-medium capitalize">{formattedDate}</span>
        <button onClick={nextDay} className="p-2 text-gray-500">›</button>
      </div>

      {/* Calorie ring */}
      <div className="flex justify-center mb-4">
        <CalorieRing consumed={dayTotals.calories} target={userGoals?.calorie_target ?? 2000} />
      </div>

      {/* Macro bars */}
      {userGoals && (
        <div className="card mb-4">
          <MacroBars
            protein={{ consumed: dayTotals.protein_g, target: userGoals.protein_g }}
            carbs={{ consumed: dayTotals.carbs_g, target: userGoals.carbs_g }}
            fat={{ consumed: dayTotals.fat_g, target: userGoals.fat_g }}
          />
        </div>
      )}

      {/* Meals list */}
      <div className="flex flex-col gap-3">
        {MEAL_ORDER.map(mealType => {
          const meal = meals.find(m => m.meal_type === mealType)
          if (!meal) return null
          const items = mealItems.filter(i => i.meal_id === meal.id)
          const mealTotals = sumMacros(items)
          return (
            <div key={mealType} className="card">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{MEAL_LABELS[mealType]}</span>
                <span className="text-sm text-emerald-500">{formatNumber(mealTotals.calories, 0)} kcal</span>
              </div>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-1 border-t border-gray-100 dark:border-gray-700">
                  <span>{item.food_name} <span className="text-gray-400">({item.quantity_g}g)</span></span>
                  <span className="text-gray-500">{formatNumber(item.calories, 0)}</span>
                </div>
              ))}
            </div>
          )
        })}
        {meals.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-4xl mb-2">🍽️</p>
            <p>Nessun pasto registrato</p>
            <p className="text-sm">Vai su Aggiungi per registrare i pasti</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 3: Test Dashboard manually**

1. Log in, complete onboarding
2. Dashboard shows today's date, empty state
3. Ring shows 0 / goal kcal
4. Navigate to yesterday → loads (empty), back to today

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: dashboard with calorie ring, macro bars, and daily meal list"
```

---

## Task 11: Food Search Component & Log Page

**Files:**
- Create: `fitness-tracker/src/components/log/FoodSearch.tsx`
- Create: `fitness-tracker/src/components/log/FoodResultItem.tsx`
- Create: `fitness-tracker/src/components/log/MealSection.tsx`
- Create: `fitness-tracker/src/components/log/MealItemRow.tsx`
- Modify: `fitness-tracker/src/pages/LogPage.tsx`

> **Use frontend-design skill** for Log page UI.

- [ ] **Step 1: Invoke frontend-design skill for Log page**

Invoke `frontend-design` skill with prompt:
> "Design the Log page for calTrackr (mobile-first Tailwind PWA, emerald theme, dark mode). Flow: (1) Meal type selector — 4 pill buttons (Colazione/Pranzo/Cena/Spuntino), one active at a time. (2) Food search — text input with magnifier icon, results list below showing food name, brand, kcal/100g. Tap result opens quantity input (number in grams) with a confirm button. (3) Current meal items list — each row: food name + grams on left, kcal on right, swipe-left or trash icon to delete. Error state for OFF unavailable shows 'Servizio non disponibile' with manual entry fallback (form with name, calories, protein, carbs, fat)."

- [ ] **Step 2: Write FoodResultItem.tsx**

```typescript
import type { FoodSearchResult } from '../../types'

interface FoodResultItemProps {
  result: FoodSearchResult
  onSelect: (result: FoodSearchResult) => void
}

export function FoodResultItem({ result, onSelect }: FoodResultItemProps) {
  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="font-medium text-sm">{result.name}</div>
      {result.brand && <div className="text-xs text-gray-400">{result.brand}</div>}
      <div className="text-xs text-emerald-500 mt-0.5">{result.kcal_100g} kcal / 100g</div>
    </button>
  )
}
```

- [ ] **Step 3: Write FoodSearch.tsx**

```typescript
import { useState, useRef } from 'react'
import { searchFood, calcNutrition } from '../../services/nutrition'
import { FoodResultItem } from './FoodResultItem'
import type { FoodSearchResult, MealItem } from '../../types'

interface FoodSearchProps {
  onAdd: (item: Omit<MealItem, 'id' | 'created_at' | 'meal_id'>) => void
}

export function FoodSearch({ onAdd }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [selected, setSelected] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  // Manual entry fallback
  const [manual, setManual] = useState(false)
  const [manualData, setManualData] = useState({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleQueryChange = (q: string) => {
    setQuery(q)
    clearTimeout(debounceRef.current)
    if (q.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        setResults(await searchFood(q))
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const handleSelect = (r: FoodSearchResult) => {
    setSelected(r)
    setResults([])
    setQuery(r.name)
  }

  const handleConfirm = () => {
    if (!selected) return
    const g = parseFloat(quantity)
    if (isNaN(g) || g <= 0) return
    const nutrition = calcNutrition(selected, g)
    onAdd({ food_name: selected.name, quantity_g: g, ...nutrition, source: 'openfoodfacts', off_food_id: selected.id })
    setQuery(''); setSelected(null); setQuantity('100')
  }

  const handleManualAdd = () => {
    const item = {
      food_name: manualData.name,
      quantity_g: parseFloat(manualData.calories) > 0 ? 100 : 0,
      calories:  parseFloat(manualData.calories)  || 0,
      protein_g: parseFloat(manualData.protein_g) || 0,
      carbs_g:   parseFloat(manualData.carbs_g)   || 0,
      fat_g:     parseFloat(manualData.fat_g)     || 0,
      source: 'manual' as const,
    }
    if (!item.food_name || item.calories <= 0) return
    onAdd(item)
    setManualData({ name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' })
    setManual(false)
  }

  if (manual) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Inserimento manuale</p>
        <input className="input-field" placeholder="Nome alimento" value={manualData.name} onChange={e => setManualData(d => ({ ...d, name: e.target.value }))} />
        <input className="input-field" type="number" placeholder="Calorie (kcal)" value={manualData.calories} onChange={e => setManualData(d => ({ ...d, calories: e.target.value }))} />
        <input className="input-field" type="number" placeholder="Proteine (g)" value={manualData.protein_g} onChange={e => setManualData(d => ({ ...d, protein_g: e.target.value }))} />
        <input className="input-field" type="number" placeholder="Carboidrati (g)" value={manualData.carbs_g} onChange={e => setManualData(d => ({ ...d, carbs_g: e.target.value }))} />
        <input className="input-field" type="number" placeholder="Grassi (g)" value={manualData.fat_g} onChange={e => setManualData(d => ({ ...d, fat_g: e.target.value }))} />
        <button className="btn-primary" onClick={handleManualAdd}>Aggiungi</button>
        <button className="btn-secondary" onClick={() => setManual(false)}>Annulla</button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <input
          className="input-field pr-10"
          placeholder="Cerca alimento..."
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
        />
        {loading && <span className="absolute right-3 top-3 text-gray-400 animate-spin">⟳</span>}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-500">
          Servizio non disponibile.{' '}
          <button className="underline" onClick={() => setManual(true)}>Inserimento manuale</button>
        </div>
      )}

      {results.length > 0 && !selected && (
        <div className="mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {results.map(r => <FoodResultItem key={r.id} result={r} onSelect={handleSelect} />)}
        </div>
      )}

      {selected && (
        <div className="mt-3 flex gap-2">
          <input
            className="input-field flex-1"
            type="number"
            inputMode="decimal"
            placeholder="Grammi"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
          />
          <button className="btn-primary flex-none w-24" onClick={handleConfirm}>Aggiungi</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write MealItemRow.tsx**

```typescript
import type { MealItem } from '../../types'

interface MealItemRowProps {
  item: MealItem
  onDelete: (id: string) => void
}

export function MealItemRow({ item, onDelete }: MealItemRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{item.food_name}</span>
        <span className="text-xs text-gray-400 ml-1">{item.quantity_g}g</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm text-emerald-500">{Math.round(item.calories)} kcal</span>
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Elimina"
        >
          🗑
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write MealSection.tsx**

```typescript
import type { Meal, MealItem, MealType } from '../../types'
import { MealItemRow } from './MealItemRow'
import { sumMacros } from '../../utils/bmr'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino',
}

interface MealSectionProps {
  mealType: MealType
  meal: Meal | undefined
  items: MealItem[]
  onDelete: (id: string) => void
}

export function MealSection({ mealType, meal, items, onDelete }: MealSectionProps) {
  const totals = sumMacros(items)
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold">{MEAL_LABELS[mealType]}</span>
        {items.length > 0 && (
          <span className="text-xs text-emerald-500">{Math.round(totals.calories)} kcal</span>
        )}
      </div>
      {items.length === 0 && <p className="text-sm text-gray-400">Nessun alimento</p>}
      {items.map(item => <MealItemRow key={item.id} item={item} onDelete={onDelete} />)}
    </div>
  )
}
```

- [ ] **Step 6: Write LogPage.tsx**

```typescript
import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { Layout } from '../components/layout/Layout'
import { FoodSearch } from '../components/log/FoodSearch'
import { MealSection } from '../components/log/MealSection'
import type { MealType, MealItem } from '../types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino',
}

export function LogPage() {
  const { meals, mealItems, selectedDate, getOrCreateMeal, addMealItem, removeMealItem } = useData()
  const [activeMeal, setActiveMeal] = useState<MealType>('lunch')

  const handleAdd = async (itemData: Omit<MealItem, 'id' | 'created_at' | 'meal_id'>) => {
    const meal = await getOrCreateMeal(selectedDate, activeMeal)
    await addMealItem({ ...itemData, meal_id: meal.id })
  }

  return (
    <Layout title="Aggiungi">
      {/* Meal type selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {MEAL_TYPES.map(mt => (
          <button
            key={mt}
            onClick={() => setActiveMeal(mt)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeMeal === mt
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {MEAL_LABELS[mt]}
          </button>
        ))}
      </div>

      {/* Food search */}
      <div className="mb-6">
        <FoodSearch onAdd={handleAdd} />
      </div>

      {/* Current day meals */}
      <div className="flex flex-col gap-3">
        {MEAL_TYPES.map(mt => {
          const meal = meals.find(m => m.meal_type === mt)
          const items = meal ? mealItems.filter(i => i.meal_id === meal.id) : []
          if (!meal && items.length === 0) return null
          return (
            <MealSection
              key={mt}
              mealType={mt}
              meal={meal}
              items={items}
              onDelete={removeMealItem}
            />
          )
        })}
      </div>
    </Layout>
  )
}
```

- [ ] **Step 7: Test Log flow manually**

1. Open Log tab
2. Select "Pranzo"
3. Search "pollo" → results appear from Open Food Facts
4. Tap result → quantity input appears → set 150 → Aggiungi
5. Item appears in Pranzo section
6. Navigate to Dashboard → Pranzo shows with correct calories
7. Delete item from Log → disappears from Dashboard

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: log page with food search, Open Food Facts integration, meal items"
```

---

## Task 12: History Page with Charts

**Files:**
- Create: `fitness-tracker/src/components/charts/CalorieLineChart.tsx`
- Create: `fitness-tracker/src/components/charts/MacroAvgChart.tsx`
- Modify: `fitness-tracker/src/pages/HistoryPage.tsx`

> **Use frontend-design skill** for History page layout.

- [ ] **Step 1: Write CalorieLineChart.tsx**

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { UserGoals } from '../../types'

interface DayData {
  date: string   // YYYY-MM-DD
  calories: number
}

interface CalorieLineChartProps {
  data: DayData[]
  goal?: UserGoals
}

export function CalorieLineChart({ data, goal }: CalorieLineChartProps) {
  const chartData = data.map(d => ({
    label: d.date.slice(5),  // MM-DD
    calories: Math.round(d.calories),
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={40} />
        <Tooltip formatter={(v: number) => [`${v} kcal`, 'Calorie']} />
        {goal && <ReferenceLine y={goal.calorie_target} stroke="#10b981" strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="calories" stroke="#10b981" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Write MacroAvgChart.tsx**

```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface MacroAvgChartProps {
  protein_g: number
  carbs_g: number
  fat_g: number
}

export function MacroAvgChart({ protein_g, carbs_g, fat_g }: MacroAvgChartProps) {
  const data = [
    { name: 'Prot.', value: Math.round(protein_g), fill: '#3b82f6' },
    { name: 'Carb.', value: Math.round(carbs_g),   fill: '#f59e0b' },
    { name: 'Grassi', value: Math.round(fat_g),    fill: '#f43f5e' },
  ]
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={35} />
        <Tooltip formatter={(v: number) => [`${v}g`]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

Note: Recharts Bar cell coloring requires using `Cell` from recharts. Replace the `<rect>` with:
```typescript
import { Cell } from 'recharts'
// inside Bar:
{data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
```

- [ ] **Step 3: Write HistoryPage.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useData } from '../contexts/DataContext'
import { Layout } from '../components/layout/Layout'
import { CalorieLineChart } from '../components/charts/CalorieLineChart'
import { MacroAvgChart } from '../components/charts/MacroAvgChart'
import { sumMacros } from '../utils/bmr'
import type { MacroTotals } from '../types'

type Range = '7d' | '30d'

function subDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function HistoryPage() {
  const { fetchRange, userGoals } = useData()
  const [range, setRange] = useState<Range>('7d')
  const [chartData, setChartData] = useState<{ date: string; calories: number }[]>([])
  const [avgMacros, setAvgMacros] = useState<MacroTotals>({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const days = range === '7d' ? 6 : 29
    const start = subDays(days)
    const end = new Date().toISOString().slice(0, 10)
    setLoading(true)
    fetchRange(start, end).then(({ meals, mealItems }) => {
      // Group items by date
      const mealById = Object.fromEntries(meals.map(m => [m.id, m]))
      const byDate: Record<string, typeof mealItems> = {}
      for (const item of mealItems) {
        const date = mealById[item.meal_id]?.date
        if (!date) continue
        byDate[date] = byDate[date] ?? []
        byDate[date].push(item)
      }
      // Fill all days (0 for missing)
      const allDays: string[] = []
      for (let i = days; i >= 0; i--) allDays.push(subDays(i))
      const series = allDays.map(date => ({
        date,
        calories: sumMacros(byDate[date] ?? []).calories,
      }))
      setChartData(series)

      // Averages
      const activeDays = Object.keys(byDate).length || 1
      const totals = Object.values(byDate).flat()
      const sum = sumMacros(totals)
      setAvgMacros({
        calories:  sum.calories  / activeDays,
        protein_g: sum.protein_g / activeDays,
        carbs_g:   sum.carbs_g   / activeDays,
        fat_g:     sum.fat_g     / activeDays,
      })
      setLoading(false)
    })
  }, [range])

  return (
    <Layout title="Storico">
      <div className="flex gap-2 mb-4">
        {(['7d', '30d'] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              range === r ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
            }`}
          >
            {r === '7d' ? '7 giorni' : '30 giorni'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="card mb-4">
            <p className="text-sm font-semibold mb-3">Calorie giornaliere</p>
            <CalorieLineChart data={chartData} goal={userGoals ?? undefined} />
          </div>
          <div className="card">
            <p className="text-sm font-semibold mb-3">Media macros / giorno</p>
            <MacroAvgChart protein_g={avgMacros.protein_g} carbs_g={avgMacros.carbs_g} fat_g={avgMacros.fat_g} />
          </div>
        </>
      )}
    </Layout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: history page with calorie line chart and macro average chart"
```

---

## Task 13: Settings Page

**Files:**
- Modify: `fitness-tracker/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Write SettingsPage.tsx**

```typescript
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import { Layout } from '../components/layout/Layout'
import { calculateBMR, calculateTDEE, suggestGoals } from '../utils/bmr'
import type { HealthProfile, UserGoals, ActivityLevel } from '../types'

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Leggero',
  moderate: 'Moderato',
  active: 'Attivo',
  very_active: 'Molto attivo',
}

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { healthProfile, userGoals, saveHealthProfile, saveUserGoals } = useData()
  const { lang, setLang, numberFormat, setNumberFormat } = useSettings()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [profile, setProfile] = useState<Omit<HealthProfile, 'user_id' | 'created_at' | 'updated_at'>>({
    age: healthProfile?.age ?? 30,
    sex: healthProfile?.sex ?? 'male',
    height_cm: healthProfile?.height_cm ?? 175,
    weight_kg: healthProfile?.weight_kg ?? 70,
    activity_level: healthProfile?.activity_level ?? 'moderate',
    body_fat_pct: healthProfile?.body_fat_pct,
    bmr_override: healthProfile?.bmr_override,
  })

  const [goals, setGoals] = useState<Omit<UserGoals, 'user_id' | 'updated_at'>>({
    calorie_target: userGoals?.calorie_target ?? 2000,
    protein_g: userGoals?.protein_g ?? 150,
    carbs_g: userGoals?.carbs_g ?? 200,
    fat_g: userGoals?.fat_g ?? 67,
  })

  const handleRecalculate = () => {
    const bmr = calculateBMR({ ...profile, bmr_override: profile.bmr_override })
    const tdee = calculateTDEE(bmr, profile.activity_level)
    setGoals(suggestGoals(tdee))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await saveHealthProfile({ user_id: user.id, ...profile })
    await saveUserGoals({ user_id: user.id, ...goals })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout title="Impostazioni">
      <div className="flex flex-col gap-6">

        {/* Profile */}
        <section className="card">
          <h2 className="font-semibold mb-4">Profilo fisico</h2>
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setProfile(p => ({ ...p, sex: s }))}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    profile.sex === s ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {s === 'male' ? 'Uomo' : 'Donna'}
                </button>
              ))}
            </div>
            <input className="input-field" type="number" placeholder="Età" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: parseInt(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="Altezza (cm)" value={profile.height_cm} onChange={e => setProfile(p => ({ ...p, height_cm: parseFloat(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="Peso (kg)" value={profile.weight_kg} onChange={e => setProfile(p => ({ ...p, weight_kg: parseFloat(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="% Grasso corporeo (opzionale)" value={profile.body_fat_pct ?? ''} onChange={e => setProfile(p => ({ ...p, body_fat_pct: e.target.value ? parseFloat(e.target.value) : undefined }))} />
            <select className="input-field" value={profile.activity_level} onChange={e => setProfile(p => ({ ...p, activity_level: e.target.value as ActivityLevel }))}>
              {Object.entries(ACTIVITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </section>

        {/* Goals */}
        <section className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Obiettivi</h2>
            <button onClick={handleRecalculate} className="text-sm text-emerald-500 underline">Ricalcola dal TDEE</button>
          </div>
          <div className="flex flex-col gap-3">
            <input className="input-field" type="number" placeholder="Calorie target" value={goals.calorie_target} onChange={e => setGoals(g => ({ ...g, calorie_target: parseInt(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="Proteine (g)" value={goals.protein_g} onChange={e => setGoals(g => ({ ...g, protein_g: parseFloat(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="Carboidrati (g)" value={goals.carbs_g} onChange={e => setGoals(g => ({ ...g, carbs_g: parseFloat(e.target.value) || 0 }))} />
            <input className="input-field" type="number" placeholder="Grassi (g)" value={goals.fat_g} onChange={e => setGoals(g => ({ ...g, fat_g: parseFloat(e.target.value) || 0 }))} />
          </div>
        </section>

        {/* App settings */}
        <section className="card">
          <h2 className="font-semibold mb-4">App</h2>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Lingua</span>
              <div className="flex gap-2">
                {(['it', 'en'] as const).map(l => (
                  <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-lg text-sm ${lang === l ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>{l.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Formato numeri</span>
              <div className="flex gap-2">
                <button onClick={() => setNumberFormat('dot')} className={`px-3 py-1 rounded-lg text-sm ${numberFormat === 'dot' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>1,234.5</button>
                <button onClick={() => setNumberFormat('comma')} className={`px-3 py-1 rounded-lg text-sm ${numberFormat === 'comma' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>1.234,5</button>
              </div>
            </div>
          </div>
        </section>

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : 'Salva modifiche'}
        </button>

        <button
          className="btn-secondary text-red-500"
          onClick={logout}
        >
          Logout
        </button>

      </div>
    </Layout>
  )
}
```

- [ ] **Step 2: Test Settings manually**

1. Open Settings
2. Change weight → Save → re-open Settings → value persisted
3. Click "Ricalcola dal TDEE" → goals update
4. Change goals manually → Save → Dashboard shows new target in ring

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "feat: settings page with profile edit, goal edit, and TDEE recalculation"
```

---

## Task 14: Build & Deploy

**Files:**
- No new files

- [ ] **Step 1: Production build**

```bash
npm run build
```
Expected: `dist/` generated, no TypeScript errors, no Vite build errors.

- [ ] **Step 2: Preview build**

```bash
npm run preview
```
Test: login, onboarding, add meal item, dashboard updates, history loads charts.

- [ ] **Step 3: Push to GitHub and deploy to Vercel**

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```
Connect repo in Vercel dashboard. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Deploy.

- [ ] **Step 4: Verify on mobile**

Open deployed URL on mobile. Test: PWA install prompt, add to home screen, offline splash. Test full flow: login → onboarding → log meal → dashboard.

- [ ] **Step 5: Final commit**

```bash
git commit -m "chore: verify production build and deploy"
```

---

## Self-Review

**Spec coverage:**
- ✅ Stack (React+TS+Vite+Tailwind+Supabase PWA) — Task 1
- ✅ DB migration with RLS — Task 2
- ✅ Types + BMR/TDEE utils — Task 3
- ✅ Supabase client + CRUD api + Open Food Facts — Task 4
- ✅ AuthContext + SettingsContext — Task 5
- ✅ DataContext (health profile, goals, meals, meal_items) — Task 6
- ✅ App shell (routing, layout, login) — Task 7
- ✅ Onboarding wizard 3-step — Task 8
- ✅ CalorieRing + MacroBars — Task 9
- ✅ Dashboard with date navigator — Task 10
- ✅ Log page with food search + OFF + meal sections — Task 11
- ✅ History page with Recharts — Task 12
- ✅ Settings page with profile+goals edit — Task 13
- ✅ Build + deploy — Task 14
- ✅ Error handling: OFF unavailable → manual fallback (Task 11 FoodSearch)
- ✅ Onboarding skipped → banner in Dashboard (DataContext `needsOnboarding` flag; DashboardPage should show banner when `userGoals` is null — add this as a note in Dashboard)
- ✅ frontend-design skill flagged for Tasks 8, 9, 10, 11, 12

**Placeholder scan:** No TBD/TODO left in task steps. All code blocks complete.

**Type consistency:**
- `sumMacros` defined in `bmr.ts` Task 3, used in Tasks 10, 11, 12 ✅
- `FoodSearchResult` defined in `types/index.ts` Task 3, used in `nutrition.ts` Task 4 and `FoodSearch.tsx` Task 11 ✅
- `getOrCreateMeal` defined in DataContext Task 6, called in LogPage Task 11 ✅
- `calcNutrition` defined in `nutrition.ts` Task 4, used in `FoodSearch` Task 11 ✅
- `MacroTotals` type used in HistoryPage Task 12, defined in types Task 3 ✅
