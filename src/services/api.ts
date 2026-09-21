// src/services/api.ts
import { supabase } from './supabase'
import type {
  UserHealthProfile, UserGoals, Meal, MealEntry, MealItemInput, Workout, WeightLog, Dish, DishItem, PantryItem
} from '../types'
import { BASIC_FOODS } from '../data/basicFoods'
import { normalizeIngredientName } from '../utils/ingredientMatching'

function catalogFoodForName(name: string) {
  const normalized = normalizeIngredientName(name)
  return BASIC_FOODS.find(food => normalizeIngredientName(food.name) === normalized)
}

function enrichLegacyFoodItem<T extends { food_name: string; category?: string | null; food_key?: string | null }>(item: T) {
  const catalogFood = (!item.food_key || !item.category || item.category === 'other')
    ? catalogFoodForName(item.food_name)
    : undefined
  return {
    ...item,
    category: item.category && item.category !== 'other' ? item.category : (catalogFood?.category ?? 'other'),
    food_key: item.food_key ?? (catalogFood ? `basic:${catalogFood.id}` : null),
  }
}

function enrichLegacyPantryItem(item: PantryItem): PantryItem {
  const catalogFood = (!item.food_key || item.category === 'other') ? catalogFoodForName(item.name) : undefined
  return {
    ...item,
    category: item.category && item.category !== 'other' ? item.category : (catalogFood?.category ?? 'other'),
    food_key: item.food_key ?? (catalogFood ? `basic:${catalogFood.id}` : null),
  }
}

// --- Health Profile ---

export async function getHealthProfile(): Promise<UserHealthProfile | null> {
  const { data, error } = await supabase
    .from('user_health_profiles')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
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

  return hydrateMeals(meals)
}

async function hydrateMeals(meals: Omit<Meal, 'entries' | 'items'>[]): Promise<Meal[]> {
  const mealIds = meals.map(m => m.id)
  const { data: entries, error: eError } = await supabase
    .from('meal_entries')
    .select('*')
    .in('meal_id', mealIds)
    .order('created_at')
  if (eError) throw eError

  if (!entries || entries.length === 0) {
    return meals.map(m => ({ ...m, entries: [], items: [] })) as Meal[]
  }

  const { data: items, error: iError } = await supabase
    .from('meal_items')
    .select('*')
    .in('entry_id', entries.map(e => e.id))
    .order('created_at')
  if (iError) throw iError

  return meals.map(m => ({
    ...m,
    entries: entries.filter(e => e.meal_id === m.id).map(e => ({
      ...e,
      items: (items ?? []).filter(i => i.entry_id === e.id).map(enrichLegacyFoodItem),
    })),
    items: (items ?? []).filter(i => i.meal_id === m.id).map(enrichLegacyFoodItem),
  })) as Meal[]
}

export async function addMealEntry(
  userId: string,
  date: string,
  mealType: Meal['meal_type'],
  name: string,
  items: MealItemInput[]
): Promise<{ meal: Omit<Meal, 'entries' | 'items'>; entry: MealEntry }> {
  const { data, error } = await supabase.rpc('add_meal_entry', {
    p_user_id: userId,
    p_date: date,
    p_meal_type: mealType,
    p_name: name,
    p_items: items,
  })
  if (error) throw error
  return data as { meal: Omit<Meal, 'entries' | 'items'>; entry: MealEntry }
}

export async function updateMealEntry(
  entryId: string,
  name: string,
  items: MealItemInput[]
): Promise<MealEntry> {
  const { data, error } = await supabase.rpc('update_meal_entry', {
    p_entry_id: entryId,
    p_name: name,
    p_items: items,
  })
  if (error) throw error
  return data as MealEntry
}

export async function deleteMealEntry(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_meal_entry', { p_entry_id: id })
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

// --- Weight Logs ---

export async function getWeightLogs(from: string, to: string): Promise<WeightLog[]> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .gte('date', from)
    .lte('date', to)
    .order('date')
  if (error) throw error
  return (data ?? []) as WeightLog[]
}

export async function getLatestWeightLog(to: string): Promise<WeightLog | null> {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .lte('date', to)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as WeightLog | null
}

export async function upsertWeightLog(
  entry: Pick<WeightLog, 'user_id' | 'date' | 'weight_kg' | 'notes'>
): Promise<WeightLog> {
  const { data, error } = await supabase
    .from('weight_logs')
    .upsert(entry, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw error
  return data as WeightLog
}

export async function deleteWeightLog(id: string): Promise<void> {
  const { error } = await supabase.from('weight_logs').delete().eq('id', id)
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

  return hydrateMeals(meals)
}

// --- Dishes (piatti salvati) ---

export async function getDishes(): Promise<Dish[]> {
  const { data: dishes, error: dError } = await supabase
    .from('dishes')
    .select('*')
    .order('name')
  if (dError) throw dError
  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map(d => d.id)
  const { data: items, error: iError } = await supabase
    .from('dish_items')
    .select('*')
    .in('dish_id', dishIds)
  if (iError) throw iError

  return dishes.map(d => ({
    ...d,
    items: (items ?? []).filter(i => i.dish_id === d.id).map(enrichLegacyFoodItem),
  })) as Dish[]
}

export async function createDish(
  userId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'created_at'>[]
): Promise<Dish> {
  const { data, error } = await supabase.rpc('create_dish_with_items', {
    p_user_id: userId,
    p_name: name,
    p_items: items,
  })
  if (error) throw error
  return data as Dish
}

export async function updateDish(
  dishId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'created_at'>[]
): Promise<Dish> {
  const { data, error } = await supabase.rpc('update_dish_with_items', {
    p_dish_id: dishId,
    p_name: name,
    p_items: items,
  })
  if (error) throw error
  return data as Dish
}

export async function completeOnboarding(
  profile: Omit<UserHealthProfile, 'created_at' | 'updated_at'>,
  goals: Omit<UserGoals, 'updated_at'>
): Promise<void> {
  const { error } = await supabase.rpc('complete_health_onboarding', {
    p_profile: profile,
    p_goals: goals,
  })
  if (error) throw error
}

export async function deleteDish(id: string): Promise<void> {
  const { error } = await supabase.from('dishes').delete().eq('id', id)
  if (error) throw error
}

// --- Pantry (dispensa) ---

export async function getPantryItems(): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .order('name')
  if (error) throw error
  return ((data ?? []) as PantryItem[]).map(enrichLegacyPantryItem)
}

export async function addPantryItem(
  item: Omit<PantryItem, 'id' | 'created_at'>
): Promise<PantryItem> {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert(item)
    .select()
    .single()
  if (error) throw error
  return data as PantryItem
}

export async function updatePantryItemQuantity(id: string, quantity: number): Promise<void> {
  const { error } = await supabase.from('pantry_items').update({ quantity }).eq('id', id)
  if (error) throw error
}

export async function updatePantryItem(
  id: string,
  item: Omit<PantryItem, 'id' | 'user_id' | 'created_at'>
): Promise<void> {
  const { error } = await supabase.from('pantry_items').update(item).eq('id', id)
  if (error) throw error
}

export async function deletePantryItem(id: string): Promise<void> {
  const { error } = await supabase.from('pantry_items').delete().eq('id', id)
  if (error) throw error
}
