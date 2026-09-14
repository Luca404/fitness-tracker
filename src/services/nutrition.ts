import type { FoodResult } from '../types'
import { BASIC_FOODS } from '../data/basicFoods'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search'
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'

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
    countries_tags_en: 'italy',
    sort_by: 'popularity_key',
    fields: 'code,product_name,brands,nutriments',
    page_size: '20',
  })

  const res = await fetch(`${OFF_SEARCH_URL}?${params}`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  const products: Array<{
    code: string
    product_name?: string
    brands?: string
    nutriments?: Record<string, number>
  }> = json.products ?? []

  return products
    .filter(p => p.product_name && (p.nutriments?.['energy-kcal_100g'] ?? 0) > 0)
    .map(p => ({
      id: p.code,
      name: p.product_name!,
      brand: p.brands || null,
      source: 'openfoodfacts' as const,
      category: 'other' as const,
      food_key: `off:${p.code}`,
      calories_100g: p.nutriments!['energy-kcal_100g'],
      protein_100g: p.nutriments!.proteins_100g ?? 0,
      carbs_100g: p.nutriments!.carbohydrates_100g ?? 0,
      fat_100g: p.nutriments!.fat_100g ?? 0,
    }))
}

export async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  const params = new URLSearchParams({ fields: 'code,product_name,brands,nutriments' })
  const res = await fetch(`${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}.json?${params}`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  if (json.status !== 1 || !json.product) return null

  const p: {
    code: string
    product_name?: string
    brands?: string
    nutriments?: Record<string, number>
  } = json.product

  if (!p.product_name || (p.nutriments?.['energy-kcal_100g'] ?? 0) <= 0) return null

  return {
    id: p.code,
    name: p.product_name,
    brand: p.brands || null,
    source: 'openfoodfacts',
    category: 'other',
    food_key: `off:${p.code}`,
    calories_100g: p.nutriments!['energy-kcal_100g'],
    protein_100g: p.nutriments!.proteins_100g ?? 0,
    carbs_100g: p.nutriments!.carbohydrates_100g ?? 0,
    fat_100g: p.nutriments!.fat_100g ?? 0,
  }
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
