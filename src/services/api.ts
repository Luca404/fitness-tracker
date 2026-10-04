// src/services/api.ts
import { supabase } from './supabase'
import type {
  UserHealthProfile, UserGoals, Meal, MealEntry, MealItemInput, Workout, WeightLog, Dish, DishItem, PantryItem, DishMealType, PreparedBatch
} from '../types'
import { orderDishItems } from '../utils/dishOrder'
import { BASIC_FOODS } from '../data/basicFoods'
import { normalizeIngredientName } from '../utils/ingredientMatching'
import { groupBy } from '../utils/groupBy'

const catalogByName = new Map<string, (typeof BASIC_FOODS)[number]>()
for (const food of BASIC_FOODS) {
  const name = normalizeIngredientName(food.name)
  // Preserve the first match used by the legacy lookup when names collide.
  if (!catalogByName.has(name)) catalogByName.set(name, food)
}

function catalogFoodForName(name: string) {
  const normalized = normalizeIngredientName(name)
  return catalogByName.get(normalized)
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
  if (!data) return null
  return {
    ...data,
    does_resistance_training: data.does_resistance_training ?? false,
  } as UserHealthProfile
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

async function hydrateMeals(meals: Omit<Meal, 'entries'>[], includeDishIcons = true): Promise<Meal[]> {
  const mealIds = meals.map(m => m.id)
  const { data: entries, error: eError } = await supabase
    .from('meal_entries')
    .select('*')
    .in('meal_id', mealIds)
    .order('created_at')
  if (eError) throw eError

  if (!entries || entries.length === 0) {
    return meals.map(m => ({ ...m, entries: [] }))
  }

  const { data: items, error: iError } = await supabase
    .from('meal_items')
    .select('*')
    .in('entry_id', entries.map(e => e.id))
    .order('created_at')
  if (iError) throw iError

  const iconSourceByBatch = new Map<string, string | null>()
  let dishIcons = new Map<string, string | null>()
  if (includeDishIcons) {
    const batchIds = [...new Set(entries.map(entry => entry.prepared_batch_id)
      .filter((id): id is string => Boolean(id)))]
    if (batchIds.length) {
      const { data: batches, error } = await supabase.from('prepared_batches')
        .select('id, source_dish_id').in('id', batchIds)
      if (error) throw error
      for (const batch of batches ?? []) iconSourceByBatch.set(batch.id, batch.source_dish_id)
    }
    const dishIds = [...new Set([
      ...entries.map(entry => entry.dish_id), ...iconSourceByBatch.values(),
    ].filter((id): id is string => Boolean(id)))]
    if (dishIds.length) {
      const { data: dishes, error } = await supabase.from('dishes').select('id, icon').in('id', dishIds)
      if (error) throw error
      dishIcons = new Map((dishes ?? []).map(dish => [dish.id, dish.icon]))
    }
  }

  const itemsByEntry = groupBy((items ?? []).map(enrichLegacyFoodItem), item => item.entry_id)
  const entriesByMeal = groupBy(entries.map(entry => {
    const sourceId = entry.prepared_batch_id ? iconSourceByBatch.get(entry.prepared_batch_id) : null
    const iconId = sourceId && dishIcons.has(sourceId) ? sourceId : entry.dish_id
    return { ...entry, dish_icon: iconId ? dishIcons.get(iconId) ?? null : null,
      dish_icon_source_id: iconId ?? null, items: itemsByEntry.get(entry.id) ?? [] }
  }), entry => entry.meal_id)
  return meals.map(meal => ({ ...meal, entries: entriesByMeal.get(meal.id) ?? [] })) as Meal[]
}

export async function addMealEntry(
  userId: string,
  date: string,
  mealType: Meal['meal_type'],
  name: string,
  items: MealItemInput[],
  dishId: string | null = null,
): Promise<{ meal: Omit<Meal, 'entries'>; entry: MealEntry }> {
  const { data, error } = await supabase.rpc('add_meal_entry', {
    p_user_id: userId,
    p_date: date,
    p_meal_type: mealType,
    p_name: name,
    p_items: items,
    p_dish_id: dishId,
  })
  if (error) throw error
  return data as { meal: Omit<Meal, 'entries'>; entry: MealEntry }
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

  return hydrateMeals(meals, false)
}

// --- Dishes (piatti salvati) ---

export async function getDishes(): Promise<Dish[]> {
  const { data: dishes, error: dError } = await supabase
    .from('dishes')
    .select('*')
    .eq('is_preparation', false)
    .order('name')
  if (dError) throw dError
  if (!dishes || dishes.length === 0) return []

  const dishIds = dishes.map(d => d.id)
  const { data: items, error: iError } = await supabase
    .from('dish_items')
    .select('*')
    .in('dish_id', dishIds)
    .order('position', { ascending: true })
    .order('id', { ascending: true })
  if (iError) throw iError

  const itemsByDish = groupBy((items ?? []).map(enrichLegacyFoodItem), item => item.dish_id)
  return dishes.map(d => ({
    ...d,
    items: orderDishItems(itemsByDish.get(d.id) ?? []),
  })) as Dish[]
}

export async function createDish(
  userId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'position' | 'created_at'>[],
  mealTypes: DishMealType[],
): Promise<Dish> {
  const { data, error } = await supabase.rpc('create_dish_with_categories', {
    p_user_id: userId,
    p_name: name,
    p_items: items,
    p_meal_types: mealTypes,
  })
  if (error) throw error
  return data as Dish
}

export async function updateDish(
  dishId: string,
  name: string,
  items: Omit<DishItem, 'id' | 'dish_id' | 'position' | 'created_at'>[],
  mealTypes: DishMealType[],
): Promise<Dish> {
  const { data, error } = await supabase.rpc('update_dish_with_categories', {
    p_dish_id: dishId,
    p_name: name,
    p_items: items,
    p_meal_types: mealTypes,
  })
  if (error) throw error
  return data as Dish
}

export async function updateDishIcon(dishId: string, icon: string | null): Promise<void> {
  const { error } = await supabase.from('dishes').update({ icon }).eq('id', dishId)
  if (error) throw error
}

export async function updateDishCookingPreference(
  dishId: string, signature: string, methods: ('raw' | 'boiled' | 'pan')[], measuredYieldRatio: number | null,
): Promise<void> {
  const { error } = await supabase.from('dishes').update({
    cooking_signature: signature,
    cooking_methods: methods,
    measured_yield_ratio: measuredYieldRatio,
  }).eq('id', dishId)
  if (error) throw error
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

// --- Personal ingredient catalog ---

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

export async function updatePantryItem(
  id: string,
  item: Omit<PantryItem, 'id' | 'user_id' | 'created_at'>
): Promise<PantryItem> {
  const { data, error } = await supabase.from('pantry_items').update(item).eq('id', id).select().single()
  if (error) throw error
  return data as PantryItem
}

export async function deletePantryItem(id: string): Promise<void> {
  const { error } = await supabase.from('pantry_items').delete().eq('id', id)
  if (error) throw error
}

export async function getPreparedBatches(): Promise<PreparedBatch[]> {
  const { data: batches, error } = await supabase
    .from('prepared_batches').select('*').is('closed_at', null).gt('remaining_g', 0)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!batches?.length) return []
  const snapshotIds = batches.map(batch => batch.snapshot_dish_id as string)
  const dishIds = [...new Set([...snapshotIds, ...batches.map(batch => batch.source_dish_id)
    .filter((id): id is string => Boolean(id))])]
  const [{ data: dishes, error: dishesError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from('dishes').select('*').in('id', dishIds),
    supabase.from('dish_items').select('*').in('dish_id', snapshotIds).order('position'),
  ])
  if (dishesError) throw dishesError
  if (itemsError) throw itemsError
  const itemsByDish = groupBy((items ?? []).map(enrichLegacyFoodItem), item => item.dish_id)
  const sourceDishes = new Map((dishes ?? []).map(dish => [dish.id, dish]))
  const dishById = new Map((dishes ?? []).map(dish => [dish.id, {
    ...dish, items: orderDishItems(itemsByDish.get(dish.id) ?? []),
  } as Dish]))
  return batches.flatMap(batch => {
    const dish = dishById.get(batch.snapshot_dish_id)
    const source = batch.source_dish_id ? sourceDishes.get(batch.source_dish_id) : undefined
    return dish ? [{ ...batch, dish: { ...dish, icon: source ? source.icon : dish.icon } } as PreparedBatch] : []
  })
}

export async function getPreparedBatchAmounts(id: string): Promise<Pick<PreparedBatch, 'total_cooked_g' | 'remaining_g'>> {
  const { data, error } = await supabase.from('prepared_batches')
    .select('total_cooked_g, remaining_g').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createPreparedBatch(args: {
  userId: string
  name: string
  items: MealItemInput[]
  sourceDishId: string | null
  icon: string | null
  totalCookedG: number
  firstPortionG: number
  date: string
  mealType: Meal['meal_type']
}): Promise<void> {
  const { error } = await supabase.rpc('create_prepared_batch', {
    p_user_id: args.userId, p_name: args.name, p_items: args.items,
    p_source_dish_id: args.sourceDishId, p_icon: args.icon,
    p_total_cooked_g: args.totalCookedG,
    p_first_portion_g: args.firstPortionG, p_date: args.date,
    p_meal_type: args.mealType,
  })
  if (error) throw error
}

export async function consumePreparedBatch(batchId: string, date: string, mealType: Meal['meal_type'], grams: number): Promise<void> {
  const { error } = await supabase.rpc('consume_prepared_batch', {
    p_batch_id: batchId, p_date: date, p_meal_type: mealType, p_grams: grams,
  })
  if (error) throw error
}

export async function updatePreparedPortion(entryId: string, grams: number): Promise<void> {
  const { error } = await supabase.rpc('update_prepared_portion', { p_entry_id: entryId, p_grams: grams })
  if (error) throw error
}

export async function closePreparedBatch(batchId: string): Promise<void> {
  const { error } = await supabase.rpc('close_prepared_batch', { p_batch_id: batchId })
  if (error) throw error
}
