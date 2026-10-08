import { prepareImage, functionErrorMessage } from './photoUpload'
import { supabase } from './supabase'
import { detectBarcodeInImage, getBarcodeProduct, normalizeBarcode } from './barcodeProducts'
import { parseProductQuantity } from './nutrition'
import type { BarcodeProduct, FoodCategory, FoodSource, PantryUnit } from '../types'

export type NutritionBasis = 'per_100g' | 'per_100ml' | 'normalized_from_serving' | 'unavailable'
export type AnalysisConfidence = 'high' | 'medium' | 'low'

export interface NutritionLabelAnalysis {
  barcode: string | null
  product_name: string | null
  brand: string | null
  package_quantity_label: string | null
  package_quantity_value: number | null
  package_quantity_unit: PantryUnit | null
  package_piece_count?: number | null
  package_net_quantity_value?: number | null
  package_net_quantity_unit?: 'g' | 'ml' | null
  serving_size: string | null
  ingredients: string | null
  allergens: string | null
  category: FoodCategory
  nutrition_basis: NutritionBasis
  calories_100: number | null
  protein_100g: number | null
  carbs_100g: number | null
  fat_100g: number | null
  fiber_100g: number | null
  sugars_100g: number | null
  saturated_fat_100g: number | null
  unsaturated_fat_100g?: number | null
  salt_100g: number | null
  confidence: AnalysisConfidence
  warnings: string[]
  validation_errors?: string[]
  requires_review?: boolean
  confirmation_token?: string
  raw_extraction?: Record<string, unknown>
  cache_hit?: boolean
  source?: FoodSource
  off_food_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface NutritionLabelDraft {
  barcode: string | null
  name: string
  brand: string | null
  quantityLabel: string | null
  quantityValue: number | null
  quantityUnit: PantryUnit | null
  packagePieceCount: number | null
  packageNetQuantityValue: number | null
  packageNetQuantityUnit: 'g' | 'ml' | null
  servingSize: string | null
  ingredients: string | null
  allergens: string | null
  category: FoodCategory
  calories100: number
  protein100g: number
  carbs100g: number
  fat100g: number
  fiber100g: number | null
  sugars100g: number | null
  saturatedFat100g: number | null
  unsaturatedFat100g: number | null
  salt100g: number | null
  nutritionBasis: NutritionBasis
  confidence: AnalysisConfidence
  warnings: string[]
  validationErrors: string[]
  requiresReview: boolean
  confirmationToken: string | null
  rawExtraction: Record<string, unknown> | null
  cacheHit: boolean
  source: FoodSource
  offFoodId: string | null
  metadata: Record<string, unknown> | null
}

function positiveOrNull(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function analysisToPantryDraft(analysis: NutritionLabelAnalysis): NutritionLabelDraft {
  const packagePieceCount = positiveOrNull(analysis.package_piece_count ?? null)
  const parsedPackageQuantity = packagePieceCount === null
    ? parseProductQuantity(analysis.package_quantity_label)
    : null
  const parsedMetricQuantity: { value: number; unit: 'g' | 'ml' } | null = (
    parsedPackageQuantity?.unit === 'g' || parsedPackageQuantity?.unit === 'ml'
  )
    ? { value: parsedPackageQuantity.value, unit: parsedPackageQuantity.unit }
    : null
  const packageNetQuantityValue = parsedMetricQuantity?.value
    ?? positiveOrNull(analysis.package_net_quantity_value ?? null)
  const packageNetQuantityUnit = parsedMetricQuantity?.unit
    ?? analysis.package_net_quantity_unit
    ?? null
  return {
    barcode: normalizeBarcode(analysis.barcode),
    name: analysis.product_name?.trim() || 'Prodotto da etichetta',
    brand: analysis.brand?.trim() || null,
    quantityLabel: analysis.package_quantity_label?.trim() || null,
    quantityValue: packagePieceCount ?? packageNetQuantityValue ?? positiveOrNull(analysis.package_quantity_value),
    quantityUnit: packagePieceCount !== null
      ? 'pz'
      : packageNetQuantityUnit ?? analysis.package_quantity_unit,
    packagePieceCount,
    packageNetQuantityValue,
    packageNetQuantityUnit,
    servingSize: analysis.serving_size?.trim() || null,
    ingredients: analysis.ingredients?.trim() || null,
    allergens: analysis.allergens?.trim() || null,
    category: analysis.category,
    calories100: positiveOrNull(analysis.calories_100) ?? 0,
    protein100g: positiveOrNull(analysis.protein_100g) ?? 0,
    carbs100g: positiveOrNull(analysis.carbs_100g) ?? 0,
    fat100g: positiveOrNull(analysis.fat_100g) ?? 0,
    fiber100g: positiveOrNull(analysis.fiber_100g),
    sugars100g: positiveOrNull(analysis.sugars_100g),
    saturatedFat100g: positiveOrNull(analysis.saturated_fat_100g),
    unsaturatedFat100g: positiveOrNull(analysis.unsaturated_fat_100g ?? null),
    salt100g: positiveOrNull(analysis.salt_100g),
    nutritionBasis: analysis.nutrition_basis,
    confidence: analysis.confidence,
    warnings: analysis.warnings,
    validationErrors: analysis.validation_errors ?? [],
    requiresReview: analysis.requires_review === true,
    confirmationToken: analysis.confirmation_token ?? null,
    rawExtraction: analysis.raw_extraction ?? null,
    cacheHit: analysis.cache_hit === true,
    source: analysis.source ?? 'ai_photo',
    offFoodId: analysis.off_food_id ?? null,
    metadata: analysis.metadata ?? null,
  }
}

export function barcodeProductToAnalysis(product: BarcodeProduct): NutritionLabelAnalysis {
  const parsedQuantity = parseProductQuantity(product.package_quantity)
  const basis = product.metadata?.nutrition_basis
  const confidence = product.confidence ?? product.metadata?.confidence
  const warnings = product.metadata?.warnings
  return {
    barcode: product.barcode,
    product_name: product.name,
    brand: product.brand,
    package_quantity_label: product.package_quantity,
    package_quantity_value: product.quantity_value ?? parsedQuantity?.value ?? null,
    package_quantity_unit: product.quantity_unit ?? parsedQuantity?.unit ?? null,
    package_piece_count: product.package_piece_count,
    package_net_quantity_value: product.package_net_quantity_value,
    package_net_quantity_unit: product.package_net_quantity_unit,
    serving_size: product.serving_size,
    ingredients: product.ingredients,
    allergens: product.allergens,
    category: product.category,
    nutrition_basis: ['per_100g', 'per_100ml', 'normalized_from_serving', 'unavailable'].includes(String(basis))
      ? basis as NutritionBasis
      : product.quantity_unit === 'ml' ? 'per_100ml' : 'per_100g',
    calories_100: product.calories_100g,
    protein_100g: product.protein_100g,
    carbs_100g: product.carbs_100g,
    fat_100g: product.fat_100g,
    fiber_100g: product.fiber_100g,
    sugars_100g: product.sugars_100g,
    saturated_fat_100g: product.saturated_fat_100g,
    unsaturated_fat_100g: product.unsaturated_fat_100g,
    salt_100g: product.salt_100g,
    confidence: ['high', 'medium', 'low'].includes(String(confidence))
      ? confidence as AnalysisConfidence
      : 'high',
    warnings: Array.isArray(warnings)
      ? warnings.filter((warning): warning is string => typeof warning === 'string')
      : [],
    validation_errors: [],
    requires_review: false,
    cache_hit: product.cache_hit !== false,
    source: product.source,
    off_food_id: product.off_food_id,
    metadata: product.metadata,
  }
}

export type ConfirmedBarcodeProduct = {
  confirmation_token: string
  barcode: string
  name: string
  brand: string | null
  package_quantity: string | null
  package_piece_count: number | null
  package_net_quantity_value: number | null
  package_net_quantity_unit: 'g' | 'ml' | null
  serving_size: string | null
  ingredients: string | null
  allergens: string | null
  calories_100g: number
  protein_100g: number
  carbs_100g: number
  fat_100g: number
  fiber_100g: number | null
  sugars_100g: number | null
  saturated_fat_100g: number | null
  unsaturated_fat_100g: number | null
  salt_100g: number | null
  category: FoodCategory
  nutrition_basis: NutritionBasis
  confidence: AnalysisConfidence
  warnings: string[]
  raw_extraction: Record<string, unknown> | null
}

export async function confirmBarcodeProduct(product: ConfirmedBarcodeProduct): Promise<void> {
  const { error } = await supabase.functions.invoke('confirm-barcode-product', { body: product })
  if (error) {
    throw new Error(await functionErrorMessage(error, 'Prodotto salvato tra gli ingredienti, ma non nel catalogo condiviso.'))
  }
}

export async function analyzeNutritionLabel(file: File, knownBarcode?: string | null): Promise<NutritionLabelAnalysis> {
  const barcode = normalizeBarcode(knownBarcode) ?? await detectBarcodeInImage(file)
  if (barcode) {
    const cached = await getBarcodeProduct(barcode)
    if (cached) return barcodeProductToAnalysis(cached)
  }

  const image = await prepareImage(file)
  const { data, error } = await supabase.functions.invoke('analyze-nutrition-label', {
    body: { image_base64: image.base64, mime_type: image.mimeType, barcode },
  })
  if (error) throw new Error(await functionErrorMessage(error))
  if (!data || typeof data !== 'object' || !('analysis' in data)) {
    throw new Error('La risposta ricevuta non è valida.')
  }
  const analysis = (data as { analysis: NutritionLabelAnalysis }).analysis
  return {
    ...analysis,
    barcode: normalizeBarcode(analysis.barcode) ?? barcode,
    source: 'ai_photo',
  }
}
