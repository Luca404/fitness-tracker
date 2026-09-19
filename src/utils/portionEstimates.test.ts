import { describe, expect, it } from 'vitest'
import { getPortionEstimates } from './portionEstimates'

describe('household portion estimates', () => {
  it('offers slices for bread but not every baked product', () => {
    expect(getPortionEstimates('bakery', 'Pane in cassetta')).toEqual([
      expect.objectContaining({ id: 'slice', grams: 30 }),
    ])
    expect(getPortionEstimates('bakery', 'Cracker')).toEqual([])
  })

  it('offers teaspoons for spreads and preserves', () => {
    expect(getPortionEstimates('spread', "Burro d'arachidi")).toEqual([
      expect.objectContaining({ id: 'teaspoon', grams: 6 }),
    ])
  })

  it('uses oil-specific spoon weights', () => {
    expect(getPortionEstimates('fat', "Olio extravergine d'oliva")).toEqual([
      expect.objectContaining({ id: 'teaspoon', grams: 5 }),
      expect.objectContaining({ id: 'tablespoon', grams: 14 }),
    ])
  })

  it('offers teaspoons and tablespoons for sauces', () => {
    expect(getPortionEstimates('condiment', 'Maionese')).toEqual([
      expect.objectContaining({ id: 'teaspoon', grams: 5 }),
      expect.objectContaining({ id: 'tablespoon', grams: 15 }),
    ])
  })
})
