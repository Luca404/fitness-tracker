import { describe, expect, it } from 'vitest'
import { getExtendedNutritionTotals } from './extendedNutrition'

describe('extended nutrition totals', () => {
  it('sums known fibre, sugars and salt values', () => {
    const totals = getExtendedNutritionTotals([
      { fiber_g: 3, sugars_g: 4, salt_g: 0.2 },
      { fiber_g: 2, sugars_g: 1, salt_g: 0.1 },
    ])

    expect(totals.fiber_g).toEqual({ value: 5, partial: false })
    expect(totals.sugars_g).toEqual({ value: 5, partial: false })
    expect(totals.salt_g.partial).toBe(false)
    expect(totals.salt_g.value).toBeCloseTo(0.3)
  })

  it('keeps missing data distinct from zero and marks mixed coverage as partial', () => {
    expect(getExtendedNutritionTotals([
      { fiber_g: 0, sugars_g: null },
      { fiber_g: null, sugars_g: null },
    ])).toEqual({
      fiber_g: { value: 0, partial: true },
      sugars_g: { value: null, partial: false },
      salt_g: { value: null, partial: false },
    })
  })
})
