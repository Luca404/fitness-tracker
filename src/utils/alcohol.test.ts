import { describe, expect, it } from 'vitest'
import { alcoholStrength, alcoholTotal, alcoholUnits, ethanolGrams, validAlcoholStrength, withAlcoholStrength } from './alcohol'
import { scaleIngredient } from './nutrition'
import type { MealItem } from '../types'

const beer: MealItem = { id: 'item', meal_id: 'meal', entry_id: 'entry', food_name: 'Birra',
  category: 'alcohol', unit: 'ml', quantity_g: 330, alcohol_abv: 5, calories: 141.9,
  protein_g: 1.65, carbs_g: 11.88, fat_g: 0, food_key: 'basic:birra-chiara',
  source: 'basic', off_food_id: null, created_at: '' }

describe('alcohol calculations', () => {
  it('uses millilitres, volume percentage, ethanol density and 12 g per UA', () => {
    expect(ethanolGrams(330, 5)).toBeCloseTo(13.0185)
    expect(alcoholUnits(330, 5)).toBeCloseTo(1.084875)
    expect(alcoholUnits(125, 12)).toBeCloseTo(0.98625)
    expect(alcoholTotal([beer, { ...beer, quantity_g: 660 }]).value).toBeCloseTo(3.254625)
  })
  it('never guesses strength for a custom drink or converts grams to millilitres', () => {
    const unknown = { ...beer, alcohol_abv: null, food_key: null }
    expect(alcoholTotal([unknown])).toEqual({ value: null, partial: false })
    expect(alcoholTotal([{ ...beer, unit: 'g' }])).toEqual({ value: null, partial: false })
    expect(alcoholTotal([beer, unknown])).toEqual({ value: alcoholUnits(330, 5), partial: true })
    expect(alcoholTotal([])).toEqual({ value: 0, partial: false })
  })
  it('uses catalog defaults for old records and preserves a recorded zero', () => {
    expect(alcoholStrength({ ...beer, alcohol_abv: undefined })).toBe(5)
    expect(alcoholStrength({ ...beer, alcohol_abv: 0 })).toBe(0)
    expect(alcoholTotal([{ ...beer, alcohol_abv: 0 }])).toEqual({ value: 0, partial: false })
  })
  it('scales volume while keeping strength and adjusts only alcohol energy', () => {
    const scaled = scaleIngredient(beer, 660)
    expect(scaled.alcohol_abv).toBe(5)
    const updated = withAlcoholStrength(scaled, 6)
    expect(updated.calories).toBeCloseTo(320.25)
    expect(updated.carbs_g).toBe(scaled.carbs_g)
    expect(updated.protein_g).toBe(scaled.protein_g)
    expect(withAlcoholStrength({ ...beer, food_key: null, alcohol_abv: null }, 6).calories).toBe(141.9)
  })
  it('rejects missing, negative, excessive and non-finite strengths', () => {
    for (const value of [undefined, null, -1, 101, Infinity, NaN]) expect(validAlcoholStrength(value)).toBe(false)
    for (const value of [0, 5.5, 100]) expect(validAlcoholStrength(value)).toBe(true)
  })
})
