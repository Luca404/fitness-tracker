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
