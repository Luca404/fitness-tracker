// src/types/index.ts

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Objective = 'lose_weight' | 'gain_muscle' | 'maintain' | 'recomposition'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drinks'
export type DishMealType = Exclude<MealType, 'drinks'>
export type FoodSource = 'manual' | 'basic' | 'openfoodfacts' | 'ai_photo' | 'barcode' | 'pantry'
export type PantryUnit = 'g' | 'ml' | 'pz'
export type MealItemUnit = 'g' | 'ml'
export type PieceSize = 'small' | 'medium' | 'large'
export type FoodCategory =
  | 'grain' | 'legume' | 'vegetable' | 'fruit' | 'meat' | 'fish'
  | 'dairy' | 'egg' | 'plant_protein' | 'bakery' | 'nuts_seeds' | 'spread'
  | 'fat' | 'sauce' | 'condiment' | 'seasoning' | 'sweet' | 'snack' | 'prepared' | 'supplement'
  | 'alcohol' | 'beverage' | 'other'

export interface UserHealthProfile {
  user_id: string
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  does_resistance_training: boolean
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
  calculation_weight_kg: number | null
  updated_at: string
}

export interface Meal {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  meal_type: MealType
  name: string | null
  created_at: string
  entries: MealEntry[] // hydrated client-side: dishes actually eaten
  items: MealItem[]    // flattened from entries for daily/history totals
}

export interface MealEntry {
  id: string
  meal_id: string
  dish_id?: string | null
  dish_icon?: string | null
  name: string
  created_at: string
  items: MealItem[]
}

export interface MealItem {
  id: string
  meal_id: string
  entry_id: string
  dish_item_id?: string | null
  food_name: string
  quantity_g: number
  piece_count?: number | null
  piece_size?: PieceSize | null
  unit: MealItemUnit
  category: FoodCategory
  food_key: string | null
  pantry_item_id?: string | null
  pantry_quantity_used?: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  sugars_g?: number | null
  salt_g?: number | null
  source: FoodSource
  off_food_id: string | null
  created_at: string
}

export type MealItemInput = Omit<MealItem, 'id' | 'meal_id' | 'entry_id' | 'created_at' | 'unit'> & {
  unit?: MealItemUnit
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

export interface SuggestedGoals {
  calorie_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface WeightLog {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  weight_kg: number
  notes: string | null
  created_at: string
}

// Unified shape for a food, whether from the pantry, the local basic-foods dataset, or Open Food Facts.
export interface FoodResult {
  id: string
  name: string
  brand: string | null
  source: 'pantry' | 'basic' | 'openfoodfacts'
  category: FoodCategory
  food_key: string | null
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g?: number | null
  sugars_100g?: number | null
  saturated_fat_100g?: number | null
  unsaturated_fat_100g?: number | null
  salt_100g?: number | null
  nutrition_score?: number | null
  nutrition_grade?: string | null
  nova_group?: number | null
  ecoscore_grade?: string | null
  quantity?: string | null
  quantity_value?: number | null
  quantity_unit?: PantryUnit | null
  serving_size?: string | null
  ingredients?: string | null
  allergens?: string | null
  traces?: string | null
  labels?: string[]
  categories?: string[]
  image_url?: string | null
  off_data?: Record<string, unknown> | null
}

export interface PantryItem {
  id: string
  user_id: string
  archived_at?: string | null
  name: string
  quantity: number
  unit: PantryUnit
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  category: FoodCategory
  food_key: string | null
  source: FoodSource
  off_food_id: string | null
  barcode?: string | null
  off_data?: Record<string, unknown> | null
  fiber_100g?: number | null
  sugars_100g?: number | null
  saturated_fat_100g?: number | null
  unsaturated_fat_100g?: number | null
  salt_100g?: number | null
  nutrition_score?: number | null
  nutrition_grade?: string | null
  nova_group?: number | null
  ecoscore_grade?: string | null
  created_at: string
}

export interface BarcodeProduct {
  barcode: string
  name: string
  brand: string | null
  package_quantity: string | null
  quantity_value: number | null
  quantity_unit: PantryUnit | null
  package_piece_count: number | null
  package_net_quantity_value: number | null
  package_net_quantity_unit: 'g' | 'ml' | null
  serving_size: string | null
  ingredients: string | null
  allergens: string | null
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g: number | null
  sugars_100g: number | null
  saturated_fat_100g: number | null
  unsaturated_fat_100g: number | null
  salt_100g: number | null
  category: FoodCategory
  source: 'openfoodfacts' | 'ai_photo'
  off_food_id: string | null
  confidence: 'high' | 'medium' | 'low' | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  cache_hit?: boolean
}

export interface Dish {
  id: string
  user_id: string
  name: string
  icon: string | null
  meal_types: DishMealType[]
  created_at: string
  updated_at: string
  items: DishItem[]  // hydrated client-side
}

export interface DishItem {
  id: string
  dish_id: string
  position: number
  food_name: string
  quantity_g: number
  piece_count?: number | null
  piece_size?: PieceSize | null
  category: FoodCategory
  food_key: string | null
  pantry_item_id?: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  sugars_g?: number | null
  salt_g?: number | null
  source: FoodSource
  off_food_id: string | null
  created_at: string
}
