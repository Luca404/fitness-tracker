import type { Meal, MealEntry } from '../types'
import { nutritionTotals } from './nutrition'

export function mealItems(meal: Meal) {
  return meal.entries.flatMap(entry => entry.items)
}

export function getMealEntryTotals(entry: MealEntry) {
  return nutritionTotals(entry.items)
}
