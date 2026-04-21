# calTrackr — Phase 1 Design Spec
**Date:** 2026-04-15 (updated 2026-04-16)
**Scope:** Fase 1 — Log pasti manuale + obiettivo + goal calorico + workout manuale + storico/grafici
**App name:** calTrackr

---

## 1. Overview

PWA mobile-first per tracking calorico, macronutrienti e workout. Stessa auth Supabase di trackr (utente condiviso), tabelle DB separate. Fase 1 copre: inserimento pasti via ricerca Open Food Facts, calcolo BMR/TDEE con obiettivo personalizzato, goal calorici, log workout manuale con calcolo calorie bruciate, dashboard giornaliera, storico.

Fasi successive (spec separate):
- **Fase 2**: foto AI (Supabase Edge Function + GPT-4o Vision) + barcode scan
- **Fase 3**: sync smart band / Apple Watch / Google Fit

---

## 2. Stack

| Layer | Scelta |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| PWA | vite-plugin-pwa (service worker + manifest) |
| DB + Auth | Supabase (stesso progetto di trackr) |
| Routing | React Router |
| Nutrizione | Open Food Facts REST API (pubblica, no key) |
| Deploy | Vercel |
| Node | 20+ |

---

## 3. Data Model

### `user_health_profiles`
```sql
user_id          UUID PRIMARY KEY REFERENCES auth.users
age              INT NOT NULL
sex              TEXT NOT NULL CHECK (sex IN ('male', 'female'))
height_cm        FLOAT NOT NULL
weight_kg        FLOAT NOT NULL
activity_level   TEXT NOT NULL CHECK (activity_level IN (
                   'sedentary', 'light', 'moderate', 'active', 'very_active'))
objective        TEXT NOT NULL CHECK (objective IN (
                   'lose_weight', 'gain_muscle', 'maintain'))
target_weight_kg FLOAT        -- usato per lose_weight e gain_muscle
target_date      DATE         -- solo lose_weight (per calcolo ritmo automatico)
body_fat_pct     FLOAT        -- opzionale
bmr_override     FLOAT        -- se utente conosce il suo BMR esatto
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

BMR calcolato con **Mifflin-St Jeor** quando `bmr_override IS NULL`:
```
BMR = 10×weight_kg + 6.25×height_cm - 5×age + (5 se male, -161 se female)
TDEE = BMR × activity_multiplier
```

Activity multipliers: sedentary=1.2, light=1.375, moderate=1.55, active=1.725, very_active=1.9

Calorie target derivate da TDEE + obiettivo:
```
lose_weight  → deficit = min((kg_da_perdere × 7700) / giorni_totali, 1000)
               calorie_target = round(TDEE - deficit)
gain_muscle  → calorie_target = round(TDEE + 250)
maintain     → calorie_target = round(TDEE)
```

### `user_goals`
```sql
user_id         UUID PRIMARY KEY REFERENCES auth.users
calorie_target  INT NOT NULL
protein_g       FLOAT NOT NULL
carbs_g         FLOAT NOT NULL
fat_g           FLOAT NOT NULL
updated_at      TIMESTAMPTZ DEFAULT now()
```

Default macro split: 30% proteine / 40% carboidrati / 30% grassi (su calorie target).
Modificabili liberamente da Impostazioni.

### `meals`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID NOT NULL REFERENCES auth.users
date        DATE NOT NULL
meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack'))
name        TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

### `meal_items`
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
meal_id     UUID NOT NULL REFERENCES meals ON DELETE CASCADE
food_name   TEXT NOT NULL
quantity_g  FLOAT NOT NULL
calories    FLOAT NOT NULL
protein_g   FLOAT NOT NULL
carbs_g     FLOAT NOT NULL
fat_g       FLOAT NOT NULL
source      TEXT NOT NULL DEFAULT 'manual'
            -- 'manual' | 'openfoodfacts' | 'ai_photo' (Fase 2) | 'barcode' (Fase 2)
off_food_id TEXT
created_at  TIMESTAMPTZ DEFAULT now()
```

### `workouts`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID NOT NULL REFERENCES auth.users
date            DATE NOT NULL
activity        TEXT NOT NULL   -- chiave nel MET constants file (es. 'running')
duration_min    INT NOT NULL
calories_burned FLOAT NOT NULL  -- MET x peso_kg x (duration_min / 60)
notes           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

Nessuna tabella `workout_types`: tipi di attività e valori MET sono costanti TS in `src/utils/met.ts`.

### RLS
Tutte le tabelle: `user_id = auth.uid()`.

---

## 4. MET Constants (`src/utils/met.ts`)

20 attività predefinite con icona e valore MET:

| key | label | MET | icon |
|-----|-------|-----|------|
| running | Corsa | 9.8 | running |
| walking | Camminata | 3.5 | walking |
| cycling | Ciclismo | 7.5 | cycling |
| swimming | Nuoto | 8.0 | swimming |
| weights | Pesi | 5.0 | weights |
| hiit | HIIT | 10.0 | hiit |
| yoga | Yoga | 2.5 | yoga |
| pilates | Pilates | 3.0 | pilates |
| elliptical | Ellittica | 5.0 | elliptical |
| rowing | Canottaggio | 7.0 | rowing |
| skiing | Sci | 6.0 | skiing |
| tennis | Tennis | 7.3 | tennis |
| football | Calcio | 7.0 | football |
| basketball | Basket | 6.5 | basketball |
| climbing | Arrampicata | 8.0 | climbing |
| dancing | Danza | 5.0 | dancing |
| boxing | Boxe | 9.0 | boxing |
| stretching | Stretching | 2.3 | stretching |
| hiking | Escursionismo | 6.0 | hiking |
| spinning | Spinning | 8.5 | spinning |

Calcolo calorie bruciate:
```typescript
calories_burned = MET * weight_kg * (duration_min / 60)
```

---

## 5. Architettura Frontend

```
src/
├── components/
│   ├── common/        # Modal, SkeletonLoader, ConfirmDialog
│   ├── layout/        # Layout shell, bottom nav (4 tab)
│   ├── onboarding/    # Wizard 4-step
│   ├── meals/         # FoodSearch, MealItemRow, AddMealForm, MealSection
│   ├── workout/       # ActivityGrid, ActivityCard, WorkoutModal, WorkoutRow
│   └── charts/        # CalorieLineChart, MacroBarChart
├── contexts/
│   ├── AuthContext.tsx
│   ├── DataContext.tsx   # cache in-memory meals/items/goals/profile/workouts
│   └── SettingsContext.tsx
├── pages/
│   ├── OnboardingPage.tsx
│   ├── MealsPage.tsx      # ring + macro + calorie bruciate + meal list + FAB
│   ├── WorkoutPage.tsx    # grid attivita + lista workout del giorno
│   ├── HistoryPage.tsx
│   └── SettingsPage.tsx
├── services/
│   ├── supabase.ts
│   ├── api.ts            # CRUD su tutte le tabelle + workouts
│   └── nutrition.ts      # wrapper Open Food Facts API
└── utils/
    ├── bmr.ts            # calcolo BMR/TDEE/goal/deficit
    └── met.ts            # costanti attivita + calcolo calorie bruciate
```

### Layer chain
```
Page / Component
  -> DataContext (cache in-memory)
    -> api.ts (CRUD Supabase)
      -> supabase.ts (client)
  -> nutrition.ts (Open Food Facts -- chiamata diretta, API pubblica)
```

---

## 6. Pagine

### Onboarding (primo accesso)
Wizard 4 step mostrato se `user_health_profiles` mancante:

**Step 1 -- Dati fisici**
Eta, sesso, altezza, peso, % grasso (opzionale).

**Step 2 -- Obiettivo**
Tre card selezionabili:
- **Perdi peso** -> mostra "Peso target (kg)" + "Entro quando?" (date picker)
  - Preview ritmo: app calcola e mostra kg/settimana stimati in tempo reale
  - Avviso se deficit calcolato supera 1000 kcal/giorno (ritmo troppo aggressivo)
- **Metti massa** -> mostra "Peso target (kg)" (opzionale, solo riferimento)
- **Mantieni** -> nessun campo extra

**Step 3 -- Stile di vita**
Activity level con descrizione di ciascun livello.

**Step 4 -- Conferma**
Mostra: BMR . TDEE . aggiustamento obiettivo -> calorie target (editabile) . macro suggeriti (editabili).
Pulsante "Inizia".

Skippabile. Riapribile da Impostazioni.

---

### Meals tab (`MealsPage.tsx`)
Data selezionata condivisa via context (default oggi), navigazione +/-giorno con swipe o frecce.

- Ring progress calorie (consumate / target)
- Barre orizzontali macro: Proteine / Carboidrati / Grassi
- **Riga "Calorie bruciate: X kcal"** -- visibile solo se ci sono workout per quel giorno
- Lista pasti raggruppata per meal_type con totale calorie per pasto
- FAB "+" -> food search (selettore meal_type + ricerca Open Food Facts)

---

### Workout tab (`WorkoutPage.tsx`)
Stessa date navigation della tab Meals (date condivisa in context).

**Layout:**
1. Grid 4 colonne di card attivita (~20), ciascuna con icona + nome
2. Tap card -> bottom drawer:
   - Nome attivita (readonly)
   - Input durata in minuti
   - Preview "Calorie bruciate: X kcal" aggiornato live
   - Bottone "Salva"
3. Lista workout registrati per il giorno:
   - Riga: icona . nome . durata . kcal bruciate . delete
   - Totale kcal bruciate in fondo

---

### History tab (`HistoryPage.tsx`)
- Toggle 7gg / 30gg
- Grafico linea: calorie ingerite + calorie bruciate (due serie) vs target
- Macro medi del periodo (breakdown barre)
- Workout piu frequenti del periodo

---

### Settings tab (`SettingsPage.tsx`)
- Modifica profilo fisico (step 1-2 onboarding)
- Modifica obiettivo (step 2 onboarding)
- Modifica goal calorici + macro manualmente
- Bottone "Ricalcola da TDEE"
- Logout

---

## 7. Bottom Nav
```
[ Meals ]  [ Workout ]  [ History ]  [ Settings ]
```

---

## 8. Data Flow

### Avvio app
```
onAuthStateChange -> DataContext.fetchAllData()
  -> getHealthProfile() -> se null -> redirect OnboardingPage
  -> getUserGoals()
  -> getMealsForDate(today) + getMealItems(mealIds)
  -> getWorkoutsForDate(today)
  -> stato in-memory pronto -> MealsPage si renderizza
```

### Navigazione tra giorni
```
DataContext.setSelectedDate(date)
  -> MealsPage e WorkoutPage reagiscono (stesso stato condiviso)
  -> fetch dati per nuova data se non in cache
```

### Aggiunta workout
```
utente seleziona attivita -> inserisce durata
  -> preview: met.calculateCalories(activity, duration_min, weight_kg)
  -> conferma -> api.addWorkout(workout) -> Supabase INSERT
  -> DataContext aggiorna in-memory
  -> WorkoutPage e MealsPage (riga calorie bruciate) aggiornano
```

### Aggiunta alimento
```
utente digita "pollo" -> nutrition.searchFood("pollo")
  -> GET world.openfoodfacts.org/cgi/search.pl?...
  -> lista risultati con name, brands, nutriments per 100g
  -> utente sceglie + inserisce grammi
  -> calcolo locale: (nutriments/100) * (grams/100)
  -> api.addMealItem(mealId, item) -> Supabase INSERT
  -> DataContext aggiorna ottimisticamente
```

### Calcolo goal da obiettivo (`bmr.ts`)
```typescript
calculateBMR(profile)         // Mifflin-St Jeor -> number
calculateTDEE(bmr, activity)  // -> number
calculateDeficit(profile)     // -> number
  // lose_weight: -min((delta_kg * 7700) / giorni_totali, 1000)
  // gain_muscle: +250
  // maintain:    0
suggestGoals(tdee, deficit)   // -> { calorie_target, protein_g, carbs_g, fat_g }
  // macro split: 30% prot / 40% carbs / 30% fat
```

---

## 9. Open Food Facts Integration

Endpoint: `https://world.openfoodfacts.org/cgi/search.pl`

```
search_terms=<query>&search_simple=1&action=process&json=1
&fields=product_name,brands,nutriments,code&page_size=20
```

Campi nutriments: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`.

Fallback se non raggiungibile -> inserimento manuale campi liberi.

---

## 10. Error Handling

- Open Food Facts non raggiungibile -> banner + form inserimento manuale
- Supabase error -> toast errore, scrittura ottimistica rollbackata
- Onboarding skippato -> banner "Completa profilo per vedere il goal"
- Deficit calcolato > 1000 kcal -> avviso step 2 + highlight ritmo aggressivo

---

## 11. Fasi Future

### Fase 2 -- AI Photo + Barcode
- Edge Function `analyze-food` (Deno): immagine base64 -> GPT-4o Vision -> `[{name, quantity_g}]`
- Barcode: `@zxing/browser` -> scan -> lookup OFF API

### Fase 3 -- Smart Band / Wearable
- HealthKit (iOS) / Google Fit / Samsung Health APIs
- Sync automatico steps + calorie bruciate (sostituisce input manuale workout)
