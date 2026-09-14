// src/services/api.ts
import { supabase } from './supabase'
import type {
  UserHealthProfile, UserGoals, Meal, MealItem, Workout, WeightLog, Dish, DishItem, PantryItem
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
    items: (items ?? []).filter(i => i.dish_id === d.id),
  })) as Dish[]
}

export async function createDish(
  userId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'created_at'>[]
): Promise<Dish> {
  const { data: dish, error: dError } = await supabase
    .from('dishes')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (dError) throw dError

  const { data: dishItems, error: iError } = await supabase
    .from('dish_items')
    .insert(items.map(i => ({ ...i, dish_id: dish.id })))
    .select()
  if (iError) throw iError

  return { ...dish, items: dishItems ?? [] } as Dish
}

export async function updateDish(
  dishId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'created_at'>[]
): Promise<Dish> {
  const { data: dish, error: dError } = await supabase
    .from('dishes')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', dishId)
    .select()
    .single()
  if (dError) throw dError

  const { error: delError } = await supabase.from('dish_items').delete().eq('dish_id', dishId)
  if (delError) throw delError

  const { data: dishItems, error: iError } = await supabase
    .from('dish_items')
    .insert(items.map(i => ({ ...i, dish_id: dishId })))
    .select()
  if (iError) throw iError

  return { ...dish, items: dishItems ?? [] } as Dish
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
  return (data ?? []) as PantryItem[]
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

export async function deletePantryItem(id: string): Promise<void> {
  const { error } = await supabase.from('pantry_items').delete().eq('id', id)
  if (error) throw error
}
