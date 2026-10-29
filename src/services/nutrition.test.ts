import { describe, expect, it } from 'vitest'
import { BASIC_FOODS } from '../data/basicFoods'
import { BASIC_FOOD_EXTENDED_NUTRITION } from '../data/basicFoodExtendedNutrition'
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
    expect(Object.keys(BASIC_FOOD_EXTENDED_NUTRITION).sort())
      .toEqual(BASIC_FOODS.map(food => food.id).sort())
    for (const food of BASIC_FOODS) {
      expect([food.calories, food.protein_g, food.carbs_g, food.fat_g,
        food.fiber_g, food.sugars_g, food.salt_g]
        .every(value => Number.isFinite(value) && value >= 0)).toBe(true)
      expect(food.sugars_g).toBeLessThanOrEqual(food.carbs_g)
    }
  })

  it('distinguishes chicken thighs by cut and skin without reusing the old alias', () => {
    const thighs = searchBasicFoods('sovracoscia di pollo')
    expect(thighs.map(food => food.id).sort()).toEqual([
      'sovracoscia-pollo-con-pelle', 'sovracoscia-pollo-senza-pelle',
    ])
    expect(thighs.find(food => food.id === 'sovracoscia-pollo-con-pelle')).toMatchObject({
      food_key: 'basic:sovracoscia-pollo-con-pelle', calories_100g: 196, fat_100g: 14,
    })
    expect(thighs.find(food => food.id === 'sovracoscia-pollo-senza-pelle')).toMatchObject({
      calories_100g: 132, fat_100g: 6.3,
    })
    const drumstick = searchBasicFoods('fuso di pollo con pelle')[0]
    expect(drumstick.id).toBe('coscia-pollo-con-pelle')
    expect(calcNutrition(drumstick, 200)).toMatchObject({
      calories: 250, protein_g: 36.8, fat_g: 11.4, salt_g: 0.44,
    })
    const skinlessDrumstick = searchBasicFoods('fuso di pollo senza pelle')[0]
    expect(skinlessDrumstick).toMatchObject({
      id: 'coscia-pollo', food_key: 'basic:coscia-pollo', quantity_unit: 'g',
      calories_100g: 107, protein_100g: 18.5, carbs_100g: 0, fat_100g: 3.7,
      fiber_100g: 0, sugars_100g: 0, salt_100g: 0.22,
    })
    expect(calcNutrition(skinlessDrumstick, 200)).toMatchObject({
      calories: 214, protein_g: 37, fat_g: 7.4, salt_g: 0.44,
    })
    expect(drumstick.calories_100g).toBeGreaterThan(skinlessDrumstick.calories_100g)
    expect(drumstick.fat_100g).toBeGreaterThan(skinlessDrumstick.fat_100g)
  })

  it('distinguishes dry gluten, hydrated seitan and salted nuts', () => {
    expect(searchBasicFoods('glutine vitale')[0]).toMatchObject({
      id: 'seitan', name: 'Seitan, glutine di frumento secco', calories_100g: 370,
    })
    expect(searchBasicFoods('seitan fresco')[0]).toMatchObject({
      id: 'seitan-fresco', category: 'plant_protein', calories_100g: 193, protein_100g: 28,
    })
    expect(searchBasicFoods('arachidi tostate salate')[0]).toMatchObject({ salt_100g: 1.3 })
    expect(searchBasicFoods('arachidi tostate senza sale')[0]).toMatchObject({ salt_100g: 0 })
  })

  it('uses per-100ml nutrition for plant drinks and keeps cooking coconut milk in grams', () => {
    const soy = searchBasicFoods('latte di soia')[0]
    expect(soy).toMatchObject({ id: 'bevanda-soia', category: 'beverage', quantity_unit: 'ml' })
    expect(calcNutrition(soy, 200)).toEqual({
      calories: 82.4, protein_g: 7.42, carbs_g: 3.1, fat_g: 4.32,
      fiber_g: 1.24, sugars_g: 2.88, salt_g: 0.2,
    })
    expect(searchBasicFoods('latte di cocco')[0]).toMatchObject({
      id: 'latte-cocco-cucina', category: 'sauce', quantity_unit: 'g', calories_100g: 214,
    })
  })

  it.each([
    ['cavolo cappuccio', 'cavolo-cappuccio'],
    ['cappuccio', 'cavolo-cappuccio'],
    ['coste', 'bietole'],
    ['friarielli', 'cime-rapa'],
    ['prugna fresca', 'susine'],
    ['caffe', 'caffe-nero'],
    ['pecorino grattugiato', 'pecorino-romano'],
    ['cottage cheese', 'fiocchi-latte'],
    ['scamorza affumicata', 'scamorza'],
    ['gorgonzola', 'gorgonzola'],
    ['robiola', 'robiola'],
    ['cosce di pollo con pelle', 'coscia-pollo-con-pelle'],
    ['sovracosce di pollo senza pelle', 'sovracoscia-pollo-senza-pelle'],
    ['alette di pollo', 'ali-pollo-con-pelle'],
    ['riso nero', 'riso-venere'],
    ['maizena', 'amido-mais'],
    ['pane grattugiato', 'pangrattato'],
    ['black eyed beans', 'fagioli-occhio-secchi'],
    ['funghi ostrica', 'funghi-pleurotus'],
    ['albicocche secche', 'albicocche-secche'],
    ['filetto di bovino', 'manzo-filetto'],
    ['tonno sottolio', 'tonno-olio-sgocciolato'],
    ['rosso d’uovo', 'tuorlo-uovo'],
    ['emmenthal', 'emmental'],
    ['silken tofu', 'tofu-setoso'],
    ['olio di semi di girasole', 'olio-girasole'],
    ['capperi sotto aceto', 'capperi-sottaceto'],
    ['radice di zenzero', 'zenzero-fresco'],
    ['cacao in polvere', 'cacao-amaro'],
    ['latte di avena', 'bevanda-avena'],
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

  it('provides extended nutrients for every basic ingredient', () => {
    const food = searchBasicFoods('riso basmati')[0]
    expect(food).toBeTruthy()
    expect(calcNutrition(food, 200)).toMatchObject({
      fiber_g: 2.6,
      sugars_g: 0.2,
      salt_g: 0.02,
    })
    expect(BASIC_FOODS.find(food => food.id === 'sale')).toMatchObject({
      fiber_g: 0, sugars_g: 0, salt_g: 100,
    })
    expect(BASIC_FOODS.find(food => food.id === 'pane-bianco')).toMatchObject({
      fiber_g: 2.5, sugars_g: 0.2, salt_g: 1.7,
    })
  })

  it('keeps genuinely missing extended nutrients distinct from measured zero', () => {
    expect(calcNutrition({
      id: 'unknown', name: 'Alimento esterno', brand: null, source: 'openfoodfacts',
      category: 'other', food_key: null,
      calories_100g: 100, protein_100g: 1, carbs_100g: 20, fat_100g: 1,
      fiber_100g: null, sugars_100g: null, salt_100g: null,
    }, 100)).toMatchObject({
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
