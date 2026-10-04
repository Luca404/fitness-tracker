import type { NutritionBasis, AnalysisConfidence } from '../services/nutritionLabel'
import type { PantryItem, PantryUnit, FoodSource, FoodCategory } from '../types'
import { normalizeBarcode } from '../services/barcodeProducts'

export interface PendingFood {
  barcode?: string | null
  name: string
  brand?: string | null
  quantity?: string | null
  quantity_value?: number | null
  quantity_unit?: PantryUnit | null
  package_piece_count?: number | null
  package_net_quantity_value?: number | null
  package_net_quantity_unit?: 'g' | 'ml' | null
  serving_size?: string | null
  image_url?: string | null
  ingredients?: string | null
  allergens?: string | null
  traces?: string | null
  labels?: string[]
  categories?: string[]
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  alcohol_abv?: number | null
  category: FoodCategory
  food_key: string | null
  source: FoodSource
  off_food_id: string | null
  off_data?: Record<string, unknown> | null
  fiber_100g?: number | null
  sugars_100g?: number | null
  saturated_fat_100g?: number | null
  unsaturated_fat_100g?: number | null
  salt_100g?: number | null
  nutrition_score?: number | null
  nutrition_grade?: string | null
  nova_group?: number | null
  ecoscore_grade?: string | null
  nutrition_basis?: NutritionBasis
  analysis_confidence?: AnalysisConfidence
  analysis_warnings?: string[]
  analysis_validation_errors?: string[]
  analysis_requires_review?: boolean
  analysis_confirmation_token?: string | null
  analysis_raw_extraction?: Record<string, unknown> | null
}

export const PHOTO_NUTRIENT_FIELDS = [
  { key: 'calories_100g', label: 'Calorie', unit: 'kcal' },
  { key: 'protein_100g', label: 'Proteine', unit: 'g' },
  { key: 'carbs_100g', label: 'Carboidrati', unit: 'g' },
  { key: 'sugars_100g', label: 'Zuccheri', unit: 'g' },
  { key: 'fat_100g', label: 'Grassi', unit: 'g' },
  { key: 'saturated_fat_100g', label: 'di cui grassi saturi', unit: 'g' },
  { key: 'fiber_100g', label: 'Fibre', unit: 'g' },
  { key: 'salt_100g', label: 'Sale', unit: 'g' },
] as const

export type NutrientFieldKey = (typeof PHOTO_NUTRIENT_FIELDS)[number]['key']
export function manualNutritionError(food: Pick<PendingFood,
  'calories_100g' | 'protein_100g' | 'carbs_100g' | 'fat_100g'
  | 'fiber_100g' | 'sugars_100g' | 'saturated_fat_100g' | 'salt_100g'>): string | null {
  if (PHOTO_NUTRIENT_FIELDS.some(({ key }) => {
    const value = food[key]
    return value != null && (!Number.isFinite(value) || value < 0)
  })) return 'I valori nutrizionali devono essere numeri non negativi'
  if ((food.saturated_fat_100g != null && food.saturated_fat_100g > food.fat_100g)
    || (food.sugars_100g != null && food.sugars_100g > food.carbs_100g)) {
    return 'Grassi saturi e zuccheri non possono superare i rispettivi totali'
  }
  return null
}

function aiPhotoMetadata(food: PendingFood): Record<string, unknown> {
  return {
    source: 'openai_nutrition_label',
    confirmed_by_user: true,
    barcode: normalizeBarcode(food.barcode),
    brand: food.brand ?? null,
    package_quantity: food.quantity ?? null,
    package_piece_count: food.package_piece_count ?? null,
    package_net_quantity_value: food.package_net_quantity_value ?? null,
    package_net_quantity_unit: food.package_net_quantity_unit ?? null,
    serving_size: food.serving_size ?? null,
    ingredients: food.ingredients ?? null,
    allergens: food.allergens ?? null,
    nutrition_basis: food.nutrition_basis ?? 'unavailable',
    confidence: food.analysis_confidence ?? 'low',
    warnings: food.analysis_warnings ?? [],
    validation_errors: food.analysis_validation_errors ?? [],
    raw_extraction: food.analysis_raw_extraction ?? null,
  }
}

export function storedAiPhotoFields(item: PantryItem): Partial<PendingFood> {
  if (item.source !== 'ai_photo' || !item.off_data) return {}
  const data = item.off_data
  const nutritionBasis = ['per_100g', 'per_100ml', 'normalized_from_serving', 'unavailable']
    .includes(String(data.nutrition_basis)) ? data.nutrition_basis as NutritionBasis : undefined
  const confidence = ['high', 'medium', 'low'].includes(String(data.confidence))
    ? data.confidence as AnalysisConfidence : undefined
  return {
    brand: typeof data.brand === 'string' ? data.brand : null,
    quantity: typeof data.package_quantity === 'string' ? data.package_quantity : null,
    package_piece_count: typeof data.package_piece_count === 'number' ? data.package_piece_count : null,
    package_net_quantity_value: typeof data.package_net_quantity_value === 'number' ? data.package_net_quantity_value : null,
    package_net_quantity_unit: data.package_net_quantity_unit === 'g' || data.package_net_quantity_unit === 'ml'
      ? data.package_net_quantity_unit
      : null,
    serving_size: typeof data.serving_size === 'string' ? data.serving_size : null,
    ingredients: typeof data.ingredients === 'string' ? data.ingredients : null,
    allergens: typeof data.allergens === 'string' ? data.allergens : null,
    nutrition_basis: nutritionBasis,
    analysis_confidence: confidence,
    analysis_warnings: Array.isArray(data.warnings)
      ? data.warnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
  }
}

export function openFoodFactsMetadata(metadata: Record<string, unknown> | null): Partial<PendingFood> {
  if (!metadata) return {}
  const stringValue = (key: string): string | null => {
    const value = metadata[key]
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }
  const numberValue = (key: string): number | null => {
    const value = metadata[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const tagValues = (key: string): string[] => {
    const value = metadata[key]
    return Array.isArray(value)
      ? value.filter((tag): tag is string => typeof tag === 'string').map(tag => tag.replace(/^[a-z]{2}:/i, ''))
      : []
  }
  return {
    image_url: stringValue('image_front_url'),
    traces: stringValue('traces'),
    labels: tagValues('labels_tags'),
    categories: tagValues('categories_tags'),
    nutrition_score: numberValue('nutriscore_score'),
    nutrition_grade: stringValue('nutriscore_grade') ?? stringValue('nutrition_grade_fr'),
    nova_group: numberValue('nova_group'),
    ecoscore_grade: stringValue('ecoscore_grade'),
  }
}

export function pantryValues(food: PendingFood): Omit<PantryItem, 'id' | 'user_id' | 'created_at'> {
  return {
    name: food.name.trim(),
    nutrition_unit: food.nutrition_basis === 'per_100ml'
      || (food.category === 'beverage' || food.category === 'alcohol') ? 'ml' : 'g',
    calories_100g: food.calories_100g,
    protein_100g: food.protein_100g,
    carbs_100g: food.carbs_100g,
    fat_100g: food.fat_100g,
    category: food.category,
    alcohol_abv: food.alcohol_abv ?? null,
    food_key: food.food_key,
    source: food.source,
    off_food_id: food.off_food_id,
    barcode: normalizeBarcode(food.barcode),
    off_data: food.source === 'ai_photo' ? aiPhotoMetadata(food) : food.off_data ?? null,
    fiber_100g: food.fiber_100g ?? null,
    sugars_100g: food.sugars_100g ?? null,
    saturated_fat_100g: food.saturated_fat_100g ?? null,
    unsaturated_fat_100g: food.unsaturated_fat_100g ?? null,
    salt_100g: food.salt_100g ?? null,
    nutrition_score: food.nutrition_score ?? null,
    nutrition_grade: food.nutrition_grade ?? null,
    nova_group: food.nova_group ?? null,
    ecoscore_grade: food.ecoscore_grade ?? null,
  }
}
