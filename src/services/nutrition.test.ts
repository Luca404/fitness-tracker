import { describe, expect, it } from 'vitest'
import { normalizeServingSize, productCategory, resolveProductQuantity } from './nutrition'

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

  it('prefers explicit bread categories over a conflicting beverage group', () => {
    expect(productCategory(product('Pane in cassetta', [
      'en:breads',
      'en:toasts',
      'en:beverages',
    ]))).toBe('bakery')
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

describe('Open Food Facts package quantity resolution', () => {
  it('uses the normalized total package fields when textual quantity is missing', () => {
    expect(resolveProductQuantity({
      product_quantity: '470',
      product_quantity_unit: 'g',
    }, 'spread')).toEqual({
      label: '470 g',
      value: 470,
      unit: 'g',
      inferredFromServing: false,
    })
  })

  it('recovers an implausibly large spread serving as the package total', () => {
    expect(resolveProductQuantity({ serving_size: '470g' }, 'spread')).toEqual({
      label: '470g',
      value: 470,
      unit: 'g',
      inferredFromServing: true,
    })
  })

  it('does not mistake a normal spread serving for the package total', () => {
    expect(resolveProductQuantity({ serving_size: '30 g' }, 'spread')).toBeNull()
  })
})
