import { describe, expect, it } from 'vitest'
import { normalizeServingSize, productCategory } from './nutrition'

function product(name: string, categories: string[] = []) {
  return {
    code: name,
    product_name: name,
    categories_tags: categories,
  }
}

describe('Open Food Facts category classification', () => {
  it.each([
    ["Burro d'arachidi", ['en:dairies'], 'spread'],
    ['Peanut butter', ['en:legumes'], 'spread'],
    ['Marmellata di arance', ['en:fruits'], 'spread'],
    ['Confettura di fragole', ['en:sweet-spreads'], 'spread'],
    ['Mandorle tostate', ['en:nuts'], 'nuts_seeds'],
    ['Pane integrale', ['en:breads'], 'bakery'],
    ['Patatine classiche', ['en:snacks'], 'snack'],
    ['Proteine whey', ['en:dairies'], 'supplement'],
    ['Proteine di pisello in polvere', ['en:legumes'], 'supplement'],
    ['Yogurt magro low-fat', ['en:dairies'], 'dairy'],
  ])('classifies %s in the expected category', (name, categories, expected) => {
    expect(productCategory(product(name, categories))).toBe(expected)
  })

  it('keeps dairy butter among oils and fats', () => {
    expect(productCategory(product('Burro', ['en:dairies']))).toBe('fat')
  })
})

describe('Open Food Facts serving size normalization', () => {
  it('hides a serving that duplicates the total package quantity', () => {
    expect(normalizeServingSize('470 g', '470g')).toBeNull()
  })

  it('keeps a real serving smaller than the package', () => {
    expect(normalizeServingSize('30 g', '470 g')).toBe('30 g')
  })

  it('compares normalized units', () => {
    expect(normalizeServingSize('500 ml', '0,5 L')).toBeNull()
  })
})
