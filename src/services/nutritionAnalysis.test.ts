import { describe, expect, it } from 'vitest'
import { normalizeNutritionExtraction, type RawNutrients } from '../../supabase/functions/_shared/nutritionAnalysis.ts'

const eggPer100: RawNutrients = {
  energy_kj: 582,
  calories_kcal: 139,
  protein_g: 12.5,
  carbs_g: 0.6,
  fat_g: 9.7,
  fiber_g: 0,
  sugars_g: 0,
  saturated_fat_g: 3,
  salt_g: 0.4,
}

const eggPerServing: RawNutrients = {
  energy_kj: 337,
  calories_kcal: 81,
  protein_g: 7.3,
  carbs_g: 0.3,
  fat_g: 5.6,
  fiber_g: 0,
  sugars_g: 0,
  saturated_fat_g: 1.7,
  salt_g: 0.2,
}

function eggExtraction(overrides: Record<string, unknown> = {}) {
  return {
    package_piece_count: 10,
    package_net_quantity_value: null,
    package_net_quantity_unit: null,
    serving_quantity_value: 58,
    serving_quantity_unit: 'g',
    nutrition_per_100_basis: 'g',
    nutrition_per_100: eggPer100,
    nutrition_per_serving: eggPerServing,
    confidence: 'high',
    warnings: [],
    ...overrides,
  }
}

describe('normalizeNutritionExtraction', () => {
  it('keeps egg package pieces, serving and per-100 values separate', () => {
    const result = normalizeNutritionExtraction(eggExtraction())

    expect(result).toMatchObject({
      package_quantity_value: 10,
      package_quantity_unit: 'pz',
      nutrition_basis: 'per_100g',
      calories_100: 139,
      protein_100g: 12.5,
      carbs_100g: 0.6,
      fat_100g: 9.7,
      salt_100g: 0.4,
      confidence: 'high',
      validation_errors: [],
      requires_review: false,
    })
  })

  it('flags the mixed-column values seen in the original egg scan', () => {
    const mixedColumns: RawNutrients = {
      ...eggPer100,
      calories_kcal: 962,
      protein_g: 16.4,
      salt_g: 1.1,
    }
    const result = normalizeNutritionExtraction(eggExtraction({ nutrition_per_100: mixedColumns }))

    expect(result.confidence).toBe('low')
    expect(result.requires_review).toBe(true)
    expect(result.validation_errors).toEqual(expect.arrayContaining([
      expect.stringContaining('Calorie oltre'),
      expect.stringContaining('colonne per 100 e per porzione'),
    ]))
  })

  it('normalizes only when the label has no readable per-100 column', () => {
    const result = normalizeNutritionExtraction(eggExtraction({
      nutrition_per_100_basis: null,
      nutrition_per_100: null,
    }))

    expect(result).toMatchObject({
      nutrition_basis: 'normalized_from_serving',
      calories_100: 139.66,
      protein_100g: 12.59,
      package_quantity_value: 10,
      package_quantity_unit: 'pz',
      validation_errors: [],
      requires_review: false,
    })
    expect(result.warnings).toContain('Valori normalizzati matematicamente dalla porzione di 58 g.')
  })
})
