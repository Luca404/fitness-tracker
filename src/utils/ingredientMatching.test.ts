import { describe, expect, it } from 'vitest'
import { normalizeIngredientName } from './ingredientMatching'

describe('ingredient matching', () => {
  it('normalizes accents and preparation details', () => {
    expect(normalizeIngredientName('Caffè (nero)')).toBe('caffe')
    expect(normalizeIngredientName('Petto di pollo (cotto)')).toBe('pollo')
  })
})
