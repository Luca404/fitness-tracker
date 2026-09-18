import type { FoodResult, PantryUnit } from '../types'
import { BASIC_FOODS } from '../data/basicFoods'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search'
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'

type OpenFoodFactsProduct = {
  [key: string]: unknown
  code: string
  product_name?: string
  product_name_it?: string
  product_name_en?: string
  brands?: string
  categories_tags?: string[]
  labels_tags?: string[]
  quantity?: string
  serving_size?: string
  ingredients_text?: string
  ingredients_text_it?: string
  ingredients_text_en?: string
  ingredients_text_with_allergens_it?: string
  ingredients_text_with_allergens_en?: string
  allergens?: string
  traces?: string
  image_front_url?: string
  nutriscore_score?: number
  nutriscore_grade?: string
  nutrition_grade_fr?: string
  nova_group?: number
  ecoscore_grade?: string
  nutriments?: Record<string, number | undefined>
}

function numeric(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function productName(product: OpenFoodFactsProduct): string {
  return product.product_name_it?.trim()
    || product.product_name_en?.trim()
    || product.product_name?.trim()
    || ''
}

function localizedText(product: OpenFoodFactsProduct, italianKey: keyof OpenFoodFactsProduct, englishKey: keyof OpenFoodFactsProduct, fallbackKey: keyof OpenFoodFactsProduct): string | null {
  const italian = product[italianKey]
  const english = product[englishKey]
  const fallback = product[fallbackKey]
  return (typeof italian === 'string' && italian.trim())
    || (typeof english === 'string' && english.trim())
    || (typeof fallback === 'string' && fallback.trim())
    || null
}

function cleanTags(tags: string[] | undefined): string[] {
  return (tags ?? []).map(tag => tag.replace(/^[a-z]{2}:/i, ''))
}

export function parseProductQuantity(quantity: string | null | undefined): { value: number; unit: PantryUnit } | null {
  if (!quantity) return null
  const normalized = quantity.toLowerCase().replace(',', '.').replace(/×/g, 'x').trim()
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:x\s*(\d+(?:\.\d+)?)\s*)?(kg|g|mg|l|ml|cl|dl|unità|unita|units?|pcs?|pezzi?)\b/)
  if (!match) return null

  const count = match[2] ? Number(match[1]) : 1
  const amount = Number(match[2] ?? match[1]) * count
  const rawUnit = match[3]
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (rawUnit === 'kg') return { value: amount * 1000, unit: 'g' }
  if (rawUnit === 'mg') return { value: amount / 1000, unit: 'g' }
  if (['l', 'cl', 'dl', 'ml'].includes(rawUnit)) {
    const multiplier = rawUnit === 'l' ? 1000 : rawUnit === 'cl' ? 10 : rawUnit === 'dl' ? 100 : 1
    return { value: amount * multiplier, unit: 'ml' }
  }
  if (['unità', 'unita', 'unit', 'units', 'pc', 'pcs', 'pezzi'].includes(rawUnit)) {
    return { value: amount, unit: 'pz' }
  }
  return { value: amount, unit: 'g' }
}

function productCategory(product: OpenFoodFactsProduct): FoodResult['category'] {
  const tags = (product.categories_tags ?? []).join(' ').toLowerCase()
  const names = `${product.product_name_it ?? ''} ${product.product_name_en ?? ''} ${product.product_name ?? ''}`.toLowerCase()
  // Some products are tagged only as "condiments" or "oils". Name-based
  // overrides keep common sauces such as soy sauce in the right category.
  if (/soy sauce|salsa di soia|sauce soja|sojasaus/.test(names)) return 'sauce'
  if (/beverage|bevande|drinks|drink|bibite|juice|succo|water|acqua/.test(tags)) return 'beverage'
  if (/alcohol|alcol|wine|vino|beer|birra|spirit/.test(tags)) return 'alcohol'
  if (/dairy|lattic|milk|latte|cheese|formagg|yogurt|burro/.test(tags)) return 'dairy'
  if (/meat|carne|beef|manzo|pork|maiale|chicken|pollo|turkey|tacchino/.test(tags)) return 'meat'
  if (/fish|pesce|seafood|frutti-di-mare|salmon|tonno|tuna/.test(tags)) return 'fish'
  if (/egg|uova/.test(tags)) return 'egg'
  if (/fruit|frutta|apple|mela|banana/.test(tags)) return 'fruit'
  if (/vegetable|verdura|ortaggi|legum|beans|fagiol|lentic/.test(tags)) return 'vegetable'
  if (/grain|cereal|cereali|rice|riso|pasta|bread|pane|flour|farina/.test(tags)) return 'grain'
  if (/sauce|salsa|condiment|dressing/.test(tags)) return 'sauce'
  if (/spice|seasoning|spezie|aromat/.test(tags)) return 'seasoning'
  if (/sweet|dessert|dolci|chocolate|cioccolat|biscuit/.test(tags)) return 'sweet'
  if (/oil|olio|fat|grassi/.test(tags)) return 'fat'
  return 'other'
}

function toFoodResult(product: OpenFoodFactsProduct): FoodResult | null {
  const name = productName(product)
  const nutriments = product.nutriments ?? {}
  const energyKcal = numeric(nutriments['energy-kcal_100g'])
    || Math.round(numeric(nutriments.energy_100g) / 4.184)
  const saturatedFat = numeric(nutriments['saturated-fat_100g'])
  const totalFat = numeric(nutriments.fat_100g)
  const unsaturatedFat = numeric(nutriments['unsaturated-fat_100g'])
    || Math.max(0, totalFat - saturatedFat)
  const parsedQuantity = parseProductQuantity(product.quantity)
  if (!name || energyKcal <= 0) return null

  return {
    id: product.code,
    name,
    brand: product.brands || null,
    source: 'openfoodfacts',
    category: productCategory(product),
    food_key: `off:${product.code}`,
    calories_100g: energyKcal,
    protein_100g: numeric(nutriments.proteins_100g),
    carbs_100g: numeric(nutriments.carbohydrates_100g),
    fat_100g: numeric(nutriments.fat_100g),
    fiber_100g: numeric(nutriments.fiber_100g),
    sugars_100g: numeric(nutriments.sugars_100g),
    saturated_fat_100g: saturatedFat,
    unsaturated_fat_100g: unsaturatedFat,
    salt_100g: numeric(nutriments.salt_100g),
    nutrition_score: product.nutriscore_score ?? null,
    nutrition_grade: product.nutriscore_grade || product.nutrition_grade_fr || null,
    nova_group: product.nova_group ?? null,
    ecoscore_grade: product.ecoscore_grade || null,
    quantity: product.quantity || null,
    quantity_value: parsedQuantity?.value ?? null,
    quantity_unit: parsedQuantity?.unit ?? null,
    serving_size: product.serving_size || null,
    ingredients: localizedText(product, 'ingredients_text_it', 'ingredients_text_en', 'ingredients_text_with_allergens_it')
      || product.ingredients_text_with_allergens_en || product.ingredients_text || null,
    allergens: product.allergens || null,
    traces: product.traces || null,
    labels: cleanTags(product.labels_tags),
    categories: cleanTags(product.categories_tags),
    image_url: product.image_front_url || null,
    off_data: product,
  }
}

export function searchBasicFoods(query: string): FoodResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return BASIC_FOODS
    .filter(f => f.name.toLowerCase().includes(q))
    .map(f => ({
      id: f.id,
      name: f.name,
      brand: null,
      source: 'basic' as const,
      category: f.category,
      food_key: `basic:${f.id}`,
      calories_100g: f.calories,
      protein_100g: f.protein_g,
      carbs_100g: f.carbs_g,
      fat_100g: f.fat_g,
    }))
}

export async function searchFood(query: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    sort_by: 'popularity_key',
    fields: 'code,product_name,product_name_it,product_name_en,brands,categories_tags,nutriments,quantity,serving_size,ingredients_text,ingredients_text_it,ingredients_text_en,ingredients_text_with_allergens_it,ingredients_text_with_allergens_en,allergens,traces,labels_tags,image_front_url,nutriscore_score,nutriscore_grade,nutrition_grade_fr,nova_group,ecoscore_grade',
    page_size: '20',
  })

  const res = await fetch(`${OFF_SEARCH_URL}?${params}`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  return (json.products ?? [])
    .map((product: OpenFoodFactsProduct) => toFoodResult(product))
    .filter((product: FoodResult | null): product is FoodResult => product !== null)
}

export async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  // Omitting `fields` intentionally keeps the complete OFF product payload
  // available to the normalizer, including localized names and product data.
  const res = await fetch(`${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}.json`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  if (json.status !== 1 || !json.product) return null
  return toFoodResult(json.product as OpenFoodFactsProduct)
}

export function calcNutrition(
  food: FoodResult,
  quantityG: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = quantityG / 100
  return {
    calories: Math.round(food.calories_100g * factor),
    protein_g: Math.round(food.protein_100g * factor * 10) / 10,
    carbs_g: Math.round(food.carbs_100g * factor * 10) / 10,
    fat_g: Math.round(food.fat_100g * factor * 10) / 10,
  }
}
