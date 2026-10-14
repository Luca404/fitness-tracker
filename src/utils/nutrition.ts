import { roundToTwo } from './decimal'

interface NutritionValues {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  sugars_g?: number | null
  salt_g?: number | null
}

export function nutritionValidationError(values: NutritionValues & { saturated_fat_g?: number | null }): string | null {
  const required = [values.calories, values.protein_g, values.carbs_g, values.fat_g]
  const optional = [values.fiber_g, values.sugars_g, values.salt_g, values.saturated_fat_g]
  if (required.some(value => !Number.isFinite(value) || value < 0)
    || optional.some(value => value != null && (!Number.isFinite(value) || value < 0))) {
    return 'I valori nutrizionali devono essere numeri non negativi'
  }
  if ((values.sugars_g != null && values.sugars_g > values.carbs_g)
    || (values.saturated_fat_g != null && values.saturated_fat_g > values.fat_g)) {
    return 'Grassi saturi e zuccheri non possono superare i rispettivi totali'
  }
  return null
}

/** Scale without losing unknown nutrients; calculations keep two decimals. */
export function scaleNutrition(values: NutritionValues, factor: number) {
  const optional = (value: number | null | undefined) => value == null ? null : roundToTwo(value * factor)
  return {
    calories: roundToTwo(values.calories * factor),
    protein_g: roundToTwo(values.protein_g * factor),
    carbs_g: roundToTwo(values.carbs_g * factor),
    fat_g: roundToTwo(values.fat_g * factor),
    fiber_g: optional(values.fiber_g),
    sugars_g: optional(values.sugars_g),
    salt_g: optional(values.salt_g),
  }
}

export function scaleIngredient<T extends NutritionValues & { quantity_g: number }>(item: T, quantity: number) {
  const factor = item.quantity_g > 0 ? quantity / item.quantity_g : 0
  return { ...item, quantity_g: roundToTwo(quantity), ...scaleNutrition(item, factor) }
}

export function nutritionTotals(items: readonly (NutritionValues & { quantity_g: number; unit?: string })[]) {
  return items.reduce((totals, item) => ({
    weight: totals.weight + (item.unit === 'ml' ? 0 : item.quantity_g),
    volumeMl: totals.volumeMl + (item.unit === 'ml' ? item.quantity_g : 0),
    calories: totals.calories + item.calories,
    protein: totals.protein + item.protein_g,
    carbs: totals.carbs + item.carbs_g,
    fat: totals.fat + item.fat_g,
  }), { weight: 0, volumeMl: 0, calories: 0, protein: 0, carbs: 0, fat: 0 })
}
