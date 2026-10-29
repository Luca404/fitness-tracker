import { describe, expect, it } from 'vitest'
import { BASIC_FOODS } from './basicFoods'
import { BASIC_FOOD_NUTRITION_REFERENCES } from './fixtures/basicFoodNutritionAudit'
import { searchBasicFoods } from '../services/nutrition'

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

describe('official nutrition references for the October catalog expansion', () => {
  it('covers all 84 additions and both revised existing ingredients exactly once', () => {
    expect(BASIC_FOOD_NUTRITION_REFERENCES).toHaveLength(86)
    expect(new Set(BASIC_FOOD_NUTRITION_REFERENCES.map(ref => ref.id)).size).toBe(86)
    expect(BASIC_FOOD_NUTRITION_REFERENCES.filter(ref => ref.provider === 'CREA')).toHaveLength(56)
    expect(BASIC_FOOD_NUTRITION_REFERENCES.filter(ref => ref.provider === 'USAV')).toHaveLength(29)
    expect(BASIC_FOOD_NUTRITION_REFERENCES.filter(ref => ref.provider === 'USDA')).toHaveLength(1)
  })

  it.each(BASIC_FOOD_NUTRITION_REFERENCES)('$id matches its original $provider profile after unit conversion', ref => {
    const food = BASIC_FOODS.find(food => food.id === ref.id)
    expect(food, ref.sourceName).toBeDefined()
    const result = searchBasicFoods(food!.name).find(result => result.id === ref.id)
    const [calories, protein, carbs, fat, fiber, sugars, sodiumOrSalt] = ref.values
    const density = ref.density ?? 1
    const availableCarbs = ref.totalCarbs ? carbs - fiber : carbs
    const salt = ref.provider === 'USAV' ? sodiumOrSalt : sodiumOrSalt * 2.5 / 1000
    expect(result, `${ref.provider} ${ref.code}: ${ref.sourceName}`).toMatchObject({
      food_key: `basic:${ref.id}`,
      quantity_unit: ref.density ? 'ml' : 'g',
      calories_100g: round(calories * density),
      protein_100g: round(protein * density),
      carbs_100g: round(availableCarbs * density),
      fat_100g: round(fat * density),
      fiber_100g: round(fiber * density),
      sugars_100g: round(sugars * density),
      salt_100g: round(salt * density),
    })
  })

  it('reconciles energy using each source carbohydrate convention and fibre contribution', () => {
    // USDA publishes manufacturer-supplied energy with no conversion factors.
    // Aceto also contains energy from alcohol/organic acids; USAV does not
    // publish all organic-acid values.
    const generalProfiles = BASIC_FOOD_NUTRITION_REFERENCES.filter(ref => ref.provider !== 'USDA' && ref.id !== 'aceto')
    expect(generalProfiles).toHaveLength(84)
    for (const ref of generalProfiles) {
      const [calories, protein, carbs, fat, fiber] = ref.values
      const carbFactor = ref.provider === 'CREA' ? 3.75 : 4
      const calculatedEnergy = 4 * protein + carbFactor * carbs + 9 * fat + 2 * fiber
      expect(Math.abs(calculatedEnergy - calories), `${ref.provider} ${ref.code}`).toBeLessThanOrEqual(1)
    }
  })
})
