import type { FoodCategory, Meal } from '../types'

export interface HabitRow {
  label: string
  icon: string
  value: number | null
  target: number
  period: 'oggi' | 'settimana'
  direction: 'min' | 'max'
  partial?: boolean
}

export interface HabitTargets {
  vegetables: number
  fruit: number
  legumes: number
  fish: number
  fiber: number
  sugars: number
  salt: number
}

function gramsForCategories(meals: Meal[], categories: FoodCategory[]) {
  return meals
    .flatMap(meal => meal.items)
    .filter(item => item.unit === 'g' && categories.includes(item.category))
    .reduce((sum, item) => sum + item.quantity_g, 0)
}

type TrackedNutrient = 'fiber_g' | 'sugars_g' | 'salt_g'

function nutrientTotal(meals: Meal[], nutrient: TrackedNutrient) {
  const items = meals.flatMap(meal => meal.items)
  const known = items.filter(item => item[nutrient] != null)
  return {
    value: known.length === 0 ? null : known.reduce((sum, item) => sum + (item[nutrient] ?? 0), 0),
    partial: known.length > 0 && known.length < items.length,
  }
}

export function calculateHabitRows(
  selectedDate: string,
  currentMeals: Meal[],
  weeklyMeals: Meal[],
  targets: HabitTargets,
): HabitRow[] {
  const mergedWeek = [
    ...weeklyMeals.filter(meal => meal.date !== selectedDate),
    ...currentMeals,
  ]
  const fiber = nutrientTotal(currentMeals, 'fiber_g')
  const sugars = nutrientTotal(currentMeals, 'sugars_g')
  const salt = nutrientTotal(currentMeals, 'salt_g')
  return [
    { label: 'Verdura', icon: '🥬', value: gramsForCategories(currentMeals, ['vegetable']), target: targets.vegetables, period: 'oggi', direction: 'min' },
    { label: 'Frutta', icon: '🍎', value: gramsForCategories(currentMeals, ['fruit']), target: targets.fruit, period: 'oggi', direction: 'min' },
    { label: 'Legumi', icon: '🫘', value: gramsForCategories(mergedWeek, ['legume']), target: targets.legumes, period: 'settimana', direction: 'min' },
    { label: 'Pesce', icon: '🐟', value: gramsForCategories(mergedWeek, ['fish']), target: targets.fish, period: 'settimana', direction: 'min' },
    { label: 'Fibre', icon: '🌾', ...fiber, target: targets.fiber, period: 'oggi', direction: 'min' },
    { label: 'Zuccheri', icon: '🍬', ...sugars, target: targets.sugars, period: 'oggi', direction: 'max' },
    { label: 'Sale', icon: '🧂', ...salt, target: targets.salt, period: 'oggi', direction: 'max' },
  ]
}
