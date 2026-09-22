import { describe, expect, it } from 'vitest'
import { BASIC_FOODS } from '../data/basicFoods'
import { calcNutrition, normalizeServingSize, productCategory, resolveProductQuantity, searchBasicFoods } from './nutrition'

function product(name: string, categories: string[] = []) {
  return {
    code: name,
    product_name: name,
    categories_tags: categories,
  }
}

describe('local basic-food catalog', () => {
  it('offers broad fruit and vegetable coverage without external APIs', () => {
    expect(BASIC_FOODS.filter(food => food.category === 'vegetable').length).toBeGreaterThanOrEqual(50)
    expect(BASIC_FOODS.filter(food => food.category === 'fruit').length).toBeGreaterThanOrEqual(40)
  })

  it('offers broad nuts, meat and fish coverage', () => {
    expect(BASIC_FOODS.filter(food => food.category === 'nuts_seeds').length).toBeGreaterThanOrEqual(15)
    expect(BASIC_FOODS.filter(food => food.category === 'meat').length).toBeGreaterThanOrEqual(15)
    expect(BASIC_FOODS.filter(food => food.category === 'fish').length).toBeGreaterThanOrEqual(15)
  })

  it('uses uncooked values for ingredients that need cooking', () => {
    expect(BASIC_FOODS.some(food => /\((?:cotto|cotta|cotti|cotte|lesso|lessa|lessi|lesse)\)/i.test(food.name))).toBe(false)
    expect(BASIC_FOODS.find(food => food.id === 'petto-pollo')).toMatchObject({
      name: 'Petto di pollo', calories: 120, protein_g: 22.5,
    })
    expect(BASIC_FOODS.find(food => food.id === 'riso-basmati')).toMatchObject({
      name: 'Riso basmati', calories: 356,
    })
  })

  it('has unique ids and valid non-negative nutrition values', () => {
    expect(new Set(BASIC_FOODS.map(food => food.id)).size).toBe(BASIC_FOODS.length)
    for (const food of BASIC_FOODS) {
      expect([food.calories, food.protein_g, food.carbs_g, food.fat_g]
        .every(value => Number.isFinite(value) && value >= 0)).toBe(true)
    }
  })

  it.each([
    ['cavolo cappuccio', 'cavolo-cappuccio'],
    ['cappuccio', 'cavolo-cappuccio'],
    ['coste', 'bietole'],
    ['friarielli', 'cime-rapa'],
    ['prugna fresca', 'susine'],
    ['caffe', 'caffe-nero'],
  ])('finds %s locally, including aliases and unaccented queries', (query, expectedId) => {
    expect(searchBasicFoods(query).some(food => food.id === expectedId)).toBe(true)
  })
})

describe('extended nutrition calculation', () => {
  it('scales fibre, sugars and salt with the selected quantity', () => {
    expect(calcNutrition({
      id: 'food-1', name: 'Test', brand: null, source: 'openfoodfacts', category: 'other', food_key: null,
      calories_100g: 200, protein_100g: 10, carbs_100g: 20, fat_100g: 5,
      fiber_100g: 4, sugars_100g: 8, salt_100g: 1.2,
    }, 50)).toEqual({
      calories: 100, protein_g: 5, carbs_g: 10, fat_g: 2.5,
      fiber_g: 2, sugars_g: 4, salt_g: 0.6,
    })
  })

  it('keeps missing extended nutrients distinct from measured zero', () => {
    const food = searchBasicFoods('riso basmati')[0]
    expect(food).toBeTruthy()
    expect(calcNutrition(food, 100)).toMatchObject({
      fiber_g: null,
      sugars_g: null,
      salt_g: null,
    })
  })
})

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
