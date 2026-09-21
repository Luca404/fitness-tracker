import { supabase } from './supabase'
import { detectBarcodeInImage, getBarcodeProduct, normalizeBarcode } from './barcodeProducts'
import { parseProductQuantity } from './nutrition'
import type { BarcodeProduct, FoodCategory, FoodSource, PantryUnit } from '../types'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600

export type NutritionBasis = 'per_100g' | 'per_100ml' | 'normalized_from_serving' | 'unavailable'
export type AnalysisConfidence = 'high' | 'medium' | 'low'

export interface NutritionLabelAnalysis {
  barcode: string | null
  product_name: string | null
  brand: string | null
  package_quantity_label: string | null
  package_quantity_value: number | null
  package_quantity_unit: PantryUnit | null
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
  cacheHit: boolean
  source: FoodSource
  offFoodId: string | null
  metadata: Record<string, unknown> | null
}

type PreparedImage = {
  base64: string
  mimeType: 'image/jpeg'
}

function positiveOrNull(value: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

export function analysisToPantryDraft(analysis: NutritionLabelAnalysis): NutritionLabelDraft {
  return {
    barcode: normalizeBarcode(analysis.barcode),
    name: analysis.product_name?.trim() || 'Prodotto da etichetta',
    brand: analysis.brand?.trim() || null,
    quantityLabel: analysis.package_quantity_label?.trim() || null,
    quantityValue: positiveOrNull(analysis.package_quantity_value),
    quantityUnit: analysis.package_quantity_unit,
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
    cache_hit: product.cache_hit !== false,
    source: product.source,
    off_food_id: product.off_food_id,
    metadata: product.metadata,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Non riesco a leggere questa immagine.'))
    }
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Non riesco a preparare la foto.')),
      'image/jpeg',
      quality,
    )
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      if (comma < 0) reject(new Error('Non riesco a codificare la foto.'))
      else resolve(result.slice(comma + 1))
    }
    reader.onerror = () => reject(new Error('Non riesco a leggere la foto.'))
    reader.readAsDataURL(blob)
  })
}

async function prepareImage(file: File): Promise<PreparedImage> {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    throw new Error('Formato non supportato. Usa una foto JPEG, PNG o WebP.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La foto è troppo grande. Scegline una inferiore a 15 MB.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Il browser non può preparare la foto.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  let blob = await canvasToBlob(canvas, 0.84)
  if (blob.size > MAX_UPLOAD_BYTES) blob = await canvasToBlob(canvas, 0.68)
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('La foto resta troppo grande dopo la compressione. Prova a ritagliarla.')
  }

  return { base64: await blobToBase64(blob), mimeType: 'image/jpeg' }
}

async function functionErrorMessage(error: unknown): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json() as { error?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return body.error
    } catch {
      // The function may have returned a non-JSON gateway error.
    }
  }
  return 'Analisi non riuscita. Riprova tra poco.'
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
