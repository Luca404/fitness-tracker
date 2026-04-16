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
