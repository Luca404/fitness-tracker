import type { MealEntry } from '../types'

export function getMealEntryTotals(entry: MealEntry) {
  return entry.items.reduce((totals, item) => ({
    weight: totals.weight + (item.unit === 'ml' ? 0 : item.quantity_g),
    volumeMl: totals.volumeMl + (item.unit === 'ml' ? item.quantity_g : 0),
    calories: totals.calories + item.calories,
    protein: totals.protein + item.protein_g,
    carbs: totals.carbs + item.carbs_g,
    fat: totals.fat + item.fat_g,
  }), { weight: 0, volumeMl: 0, calories: 0, protein: 0, carbs: 0, fat: 0 })
}
