import { getAuthenticatedUser } from '../_shared/auth.ts'
import { verifyConfirmationToken } from '../_shared/analysisConfirmation.ts'
import { upsertCatalogProduct } from '../_shared/barcodeCatalog.ts'

const BARCODE_PATTERN = /^(?:[0-9]{8}|[0-9]{12,14})$/
const FOOD_CATEGORIES = new Set([
  'grain', 'legume', 'vegetable', 'fruit', 'meat', 'fish', 'dairy', 'egg',
  'plant_protein', 'bakery', 'nuts_seeds', 'spread', 'fat', 'sauce',
  'condiment', 'seasoning', 'sweet', 'snack', 'prepared', 'supplement',
  'alcohol', 'beverage', 'other',
])
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type JsonRecord = Record<string, unknown>

function json(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function requiredNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function hasPlausibleNutrition(body: JsonRecord): boolean {
  const calories = requiredNumber(body.calories_100g)
  const protein = requiredNumber(body.protein_100g)
  const carbs = requiredNumber(body.carbs_100g)
  const fat = requiredNumber(body.fat_100g)
  if (calories === null || protein === null || carbs === null || fat === null) return false
  if (calories > 950 || protein > 100 || carbs > 100 || fat > 100) return false
  const fiber = nullableNumber(body.fiber_100g)
  const sugars = nullableNumber(body.sugars_100g)
  const saturated = nullableNumber(body.saturated_fat_100g)
  const salt = nullableNumber(body.salt_100g)
  if ([fiber, sugars, saturated, salt].some(value => value !== null && value > 100)) return false
  if (sugars !== null && sugars > carbs + 0.5) return false
  if (saturated !== null && saturated > fat + 0.5) return false
  const macroCalories = protein * 4 + carbs * 4 + fat * 9
  return macroCalories <= 20 || Math.abs(calories - macroCalories) <= Math.max(100, macroCalories * 0.45)
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  const user = await getAuthenticatedUser(request)
  if (!user) return json({ error: 'Sessione non valida.' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400)
  }
  if (!isRecord(body)) return json({ error: 'Richiesta non valida.' }, 400)

  const barcode = typeof body.barcode === 'string' && BARCODE_PATTERN.test(body.barcode) ? body.barcode : null
  const token = typeof body.confirmation_token === 'string' ? body.confirmation_token : ''
  const name = nullableText(body.name)
  if (!barcode || !name || !token || !await verifyConfirmationToken(token, user.id, barcode)) {
    return json({ error: 'Conferma scaduta o non valida: ripeti l’analisi della foto.' }, 403)
  }
  if (typeof body.category !== 'string' || !FOOD_CATEGORIES.has(body.category) || !hasPlausibleNutrition(body)) {
    return json({ error: 'I valori confermati non superano i controlli di coerenza.' }, 422)
  }

  const pieceCount = typeof body.package_piece_count === 'number'
    && Number.isInteger(body.package_piece_count)
    && body.package_piece_count > 0
    ? body.package_piece_count
    : null
  const netValue = typeof body.package_net_quantity_value === 'number'
    && Number.isFinite(body.package_net_quantity_value)
    && body.package_net_quantity_value > 0
    ? body.package_net_quantity_value
    : null
  const netUnit = body.package_net_quantity_unit === 'g' || body.package_net_quantity_unit === 'ml'
    ? body.package_net_quantity_unit
    : null
  const confirmedNetValue = netUnit ? netValue : null

  try {
    const product = await upsertCatalogProduct({
      barcode,
      name,
      brand: nullableText(body.brand),
      package_quantity: nullableText(body.package_quantity),
      quantity_value: pieceCount ?? confirmedNetValue,
      quantity_unit: pieceCount !== null ? 'pz' : netUnit,
      package_piece_count: pieceCount,
      package_net_quantity_value: confirmedNetValue,
      package_net_quantity_unit: netUnit,
      serving_size: nullableText(body.serving_size),
      ingredients: nullableText(body.ingredients),
      allergens: nullableText(body.allergens),
      calories_100g: body.calories_100g as number,
      protein_100g: body.protein_100g as number,
      carbs_100g: body.carbs_100g as number,
      fat_100g: body.fat_100g as number,
      fiber_100g: nullableNumber(body.fiber_100g),
      sugars_100g: nullableNumber(body.sugars_100g),
      saturated_fat_100g: nullableNumber(body.saturated_fat_100g),
      unsaturated_fat_100g: nullableNumber(body.unsaturated_fat_100g),
      salt_100g: nullableNumber(body.salt_100g),
      category: body.category,
      source: 'ai_photo',
      off_food_id: null,
      confidence: body.confidence === 'high' ? 'high' : 'medium',
      metadata: {
        source: 'openai_nutrition_label',
        confirmed_by_user: true,
        nutrition_basis: typeof body.nutrition_basis === 'string' ? body.nutrition_basis : 'unavailable',
        warnings: Array.isArray(body.warnings)
          ? body.warnings.filter((warning): warning is string => typeof warning === 'string')
          : [],
        raw_extraction: isRecord(body.raw_extraction) ? body.raw_extraction : null,
      },
    })
    return json({ product })
  } catch (error) {
    console.error('Could not confirm barcode catalog product', error)
    return json({ error: 'Catalogo temporaneamente non disponibile.' }, 502)
  }
})
