export type RawNutrients = {
  energy_kj: number | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sugars_g: number | null
  saturated_fat_g: number | null
  salt_g: number | null
}

export const NUTRIENT_KEYS = [
  'energy_kj', 'calories_kcal', 'protein_g', 'carbs_g', 'fat_g',
  'fiber_g', 'sugars_g', 'saturated_fat_g', 'salt_g',
] as const

type Confidence = 'high' | 'medium' | 'low'
type NutritionBasis = 'per_100g' | 'per_100ml' | 'normalized_from_serving' | 'unavailable'
type JsonRecord = Record<string, unknown>

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function hasNutrition(value: RawNutrients | null): value is RawNutrients {
  return value !== null && NUTRIENT_KEYS.some(key => value[key] !== null)
}

function caloriesFrom(value: RawNutrients, warnings: string[], context: string): number | null {
  if (value.calories_kcal !== null && value.energy_kj !== null) {
    const converted = value.energy_kj / 4.184
    if (Math.abs(converted - value.calories_kcal) > Math.max(6, value.calories_kcal * 0.12)) {
      warnings.push(`Energia incoerente ${context}: ${value.energy_kj} kJ non corrispondono a ${value.calories_kcal} kcal.`)
    }
  }
  if (value.calories_kcal !== null) return value.calories_kcal
  if (value.energy_kj !== null) {
    warnings.push(`Calorie ${context} convertite dai kJ perché le kcal non erano presenti.`)
    return round(value.energy_kj / 4.184)
  }
  return null
}

function crossCheckColumns(per100: RawNutrients, perServing: RawNutrients, servingValue: number, issues: string[]) {
  const factor = servingValue / 100
  const labels: Record<keyof RawNutrients, string> = {
    energy_kj: 'kJ', calories_kcal: 'kcal', protein_g: 'proteine', carbs_g: 'carboidrati',
    fat_g: 'grassi', fiber_g: 'fibre', sugars_g: 'zuccheri',
    saturated_fat_g: 'grassi saturi', salt_g: 'sale',
  }
  for (const key of NUTRIENT_KEYS) {
    const base = per100[key]
    const serving = perServing[key]
    if (base === null || serving === null) continue
    const expected = base * factor
    const tolerance = key === 'calories_kcal' ? 6 : key === 'energy_kj' ? 25 : 0.3
    if (Math.abs(serving - expected) > Math.max(tolerance, Math.abs(expected) * 0.2)) {
      issues.push(`Le colonne per 100 e per porzione non coincidono per ${labels[key]}.`)
    }
  }
}

function plausibilityIssues(values: RawNutrients, calories: number | null): string[] {
  const issues: string[] = []
  const grams = [
    ['proteine', values.protein_g], ['carboidrati', values.carbs_g], ['grassi', values.fat_g],
    ['fibre', values.fiber_g], ['zuccheri', values.sugars_g],
    ['grassi saturi', values.saturated_fat_g], ['sale', values.salt_g],
  ] as const
  for (const [label, amount] of grams) {
    if (amount !== null && amount > 100) issues.push(`${label} oltre 100 g per 100 g/ml.`)
  }
  if (calories !== null && calories > 950) issues.push('Calorie oltre il massimo fisicamente plausibile per 100 g/ml.')
  if (values.sugars_g !== null && values.carbs_g !== null && values.sugars_g > values.carbs_g + 0.5) {
    issues.push('Gli zuccheri superano i carboidrati totali.')
  }
  if (values.saturated_fat_g !== null && values.fat_g !== null && values.saturated_fat_g > values.fat_g + 0.5) {
    issues.push('I grassi saturi superano i grassi totali.')
  }
  if (calories !== null && values.protein_g !== null && values.carbs_g !== null && values.fat_g !== null) {
    const estimated = values.protein_g * 4 + values.carbs_g * 4 + values.fat_g * 9
    if (estimated > 20 && Math.abs(calories - estimated) > Math.max(100, estimated * 0.45)) {
      issues.push('Le calorie non sono coerenti con proteine, carboidrati e grassi.')
    }
  }
  return issues
}

export function normalizeNutritionExtraction(extraction: JsonRecord): JsonRecord {
  const per100 = extraction.nutrition_per_100 as RawNutrients | null
  const perServing = extraction.nutrition_per_serving as RawNutrients | null
  const servingValue = extraction.serving_quantity_value as number | null
  const servingUnit = extraction.serving_quantity_unit as 'g' | 'ml' | null
  const warnings = [...extraction.warnings as string[]]
  const issues: string[] = []
  let values: RawNutrients | null = null
  let basis: NutritionBasis = 'unavailable'

  if (hasNutrition(per100)) {
    values = per100
    if (extraction.nutrition_per_100_basis === null) {
      issues.push('La base della colonna per 100 non è leggibile (g oppure ml).')
    }
    basis = extraction.nutrition_per_100_basis === 'ml' ? 'per_100ml' : 'per_100g'
    if (hasNutrition(perServing) && servingValue && servingValue > 0 && servingUnit) {
      caloriesFrom(perServing, issues, 'per porzione')
      if (extraction.nutrition_per_100_basis && extraction.nutrition_per_100_basis !== servingUnit) {
        issues.push('L’unità della porzione non coincide con la base della colonna per 100.')
      } else {
        crossCheckColumns(per100, perServing, servingValue, issues)
      }
    }
  } else if (hasNutrition(perServing) && servingValue && servingValue > 0 && servingUnit) {
    const factor = 100 / servingValue
    values = Object.fromEntries(NUTRIENT_KEYS.map(key => [
      key,
      perServing[key] === null ? null : round(perServing[key]! * factor),
    ])) as RawNutrients
    basis = 'normalized_from_serving'
    warnings.push(`Valori normalizzati matematicamente dalla porzione di ${servingValue} ${servingUnit}.`)
  } else {
    warnings.push('Nessuna colonna per 100 g/ml leggibile e porzione insufficiente per la normalizzazione.')
  }

  const calories = values ? caloriesFrom(values, issues, basis.startsWith('per_100') ? 'per 100' : 'normalizzate') : null
  if (values) issues.push(...plausibilityIssues(values, calories))
  const uniqueIssues = [...new Set(issues)]
  warnings.push(...uniqueIssues)
  const sourceConfidence = extraction.confidence as Confidence
  const confidence: Confidence = uniqueIssues.length > 0 ? 'low' : sourceConfidence

  return {
    ...extraction,
    package_quantity_value: extraction.package_piece_count ?? extraction.package_net_quantity_value,
    package_quantity_unit: extraction.package_piece_count !== null ? 'pz' : extraction.package_net_quantity_unit,
    nutrition_basis: basis,
    calories_100: calories,
    protein_100g: values?.protein_g ?? null,
    carbs_100g: values?.carbs_g ?? null,
    fat_100g: values?.fat_g ?? null,
    fiber_100g: values?.fiber_g ?? null,
    sugars_100g: values?.sugars_g ?? null,
    saturated_fat_100g: values?.saturated_fat_g ?? null,
    salt_100g: values?.salt_g ?? null,
    confidence,
    warnings: [...new Set(warnings)],
    validation_errors: uniqueIssues,
    requires_review: uniqueIssues.length > 0 || confidence === 'low',
    raw_extraction: {
      nutrition_per_100_basis: extraction.nutrition_per_100_basis,
      nutrition_per_100: per100,
      nutrition_per_serving: perServing,
      serving_quantity_value: servingValue,
      serving_quantity_unit: servingUnit,
    },
  }
}
