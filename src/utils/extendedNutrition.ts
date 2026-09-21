export type ExtendedNutrientKey = 'fiber_g' | 'sugars_g' | 'salt_g'

export interface ExtendedNutrientTotal {
  value: number | null
  partial: boolean
}

export type ExtendedNutritionTotals = Record<ExtendedNutrientKey, ExtendedNutrientTotal>

export function getExtendedNutritionTotals(
  items: Array<Partial<Record<ExtendedNutrientKey, number | null>>>,
): ExtendedNutritionTotals {
  const total = (key: ExtendedNutrientKey): ExtendedNutrientTotal => {
    const known = items.filter(item => item[key] != null)
    return {
      value: known.length === 0
        ? null
        : known.reduce((sum, item) => sum + (item[key] ?? 0), 0),
      partial: known.length > 0 && known.length < items.length,
    }
  }

  return {
    fiber_g: total('fiber_g'),
    sugars_g: total('sugars_g'),
    salt_g: total('salt_g'),
  }
}
