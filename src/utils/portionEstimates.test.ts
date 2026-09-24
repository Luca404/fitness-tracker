import { describe, expect, it } from 'vitest'
import { formatPieceQuantity, getPortionEstimates } from './portionEstimates'

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

  it('offers size estimates only for supported whole foods', () => {
    expect(getPortionEstimates('fruit', 'Mela')).toEqual([
      expect.objectContaining({ id: 'small', grams: 110 }),
      expect.objectContaining({ id: 'medium', grams: 150 }),
      expect.objectContaining({ id: 'large', grams: 190 }),
    ])
    expect(getPortionEstimates('egg', 'Uovo intero')[1]).toEqual(expect.objectContaining({ id: 'medium', grams: 44 }))
    expect(getPortionEstimates('egg', "Albume d'uovo")).toEqual([])
    expect(getPortionEstimates('fruit', 'Fragole')).toEqual([])
  })

  it('describes piece quantities in the diary', () => {
    expect(formatPieceQuantity('fruit', 'Mela', 'small', 1)).toBe('1 mela piccola')
    expect(formatPieceQuantity('egg', 'Uovo intero', 'medium', 2)).toBe('2 uova medie')
  })
})
