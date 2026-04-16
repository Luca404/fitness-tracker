import type { OFFProduct } from '../types'

const BASE = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function searchFood(query: string): Promise<OFFProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    fields: 'product_name,brands,nutriments,code',
    page_size: '20',
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error('OFF unreachable')

  const json = await res.json()
  return (json.products ?? []).filter(
    (p: OFFProduct) =>
      p.product_name &&
      p.nutriments?.['energy-kcal_100g'] > 0
  ) as OFFProduct[]
}

export function calcNutrition(
  product: OFFProduct,
  quantityG: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = quantityG / 100
  return {
    calories: Math.round((product.nutriments['energy-kcal_100g'] ?? 0) * factor),
    protein_g: Math.round((product.nutriments.proteins_100g ?? 0) * factor * 10) / 10,
    carbs_g: Math.round((product.nutriments.carbohydrates_100g ?? 0) * factor * 10) / 10,
    fat_g: Math.round((product.nutriments.fat_100g ?? 0) * factor * 10) / 10,
  }
}
