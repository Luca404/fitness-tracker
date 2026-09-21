import {
  getCatalogProduct,
  upsertCatalogProduct,
  type CatalogProductInput,
} from '../_shared/barcodeCatalog.ts'

const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'
const BARCODE_PATTERN = /^(?:[0-9]{8}|[0-9]{12,14})$/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type JsonRecord = Record<string, unknown>
type PantryUnit = 'g' | 'ml' | 'pz'

function json(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function hasValidUser(authorization: string, supabaseUrl: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: apiKey },
    })
    return response.ok
  } catch (error) {
    console.error('Supabase Auth validation failed', error)
    return false
  }
}

function text(product: JsonRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = product[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function tags(product: JsonRecord, key: string): string[] {
  const value = product[key]
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : []
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function parseQuantity(label: string | null): { value: number; unit: PantryUnit } | null {
  if (!label) return null
  const normalized = label.toLowerCase().replace(',', '.').replace(/×/g, 'x').trim()
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

function category(product: JsonRecord): string {
  const taxonomy = [
    ...tags(product, 'categories_tags'),
    ...tags(product, 'categories_hierarchy'),
    ...tags(product, 'food_groups_tags'),
    text(product, 'pnns_groups_1') ?? '',
    text(product, 'pnns_groups_2') ?? '',
  ].join(' ').toLowerCase()
  const names = [
    text(product, 'product_name_it'), text(product, 'product_name_en'),
    text(product, 'generic_name_it'), text(product, 'generic_name_en'),
    text(product, 'product_name'), text(product, 'main_category'),
    text(product, 'main_category_it'), text(product, 'main_category_en'),
  ].filter(Boolean).join(' ').toLowerCase()
  const searchable = `${names} ${taxonomy}`

  if (/peanut butter|burro (?:di |d['’])?arachidi|nut butter|marmellat|confettur|\bjam\b|fruit spread|miele|\bhoney\b|crema spalmabile|chocolate spread|hazelnut spread|nutella/.test(searchable)) return 'spread'
  if (/tomato sauce|pasta sauce|passata|sugo|rag[uù]|tomatensauce/.test(searchable)) return 'sauce'
  if (/soy sauce|salsa di soia|ketchup|mustard|senape|mayonnaise|maionese|condiment/.test(searchable)) return 'condiment'
  if (/bread|pane|bakery|baked goods|prodotti da forno|grissin|fette biscottate|cracker|croissant|cornett[io]|focacci|toasts?/.test(searchable)) return 'bakery'
  if (/alcohol|alcol|wine|vino|beer|birra|spirit/.test(searchable)) return 'alcohol'
  if (/beverage|bevande|drinks?|bibite|juice|succo|water|acqua|plant milks?|bevande vegetali|oat drink|almond drink/.test(searchable)) return 'beverage'
  if (/protein powder|whey protein|proteine? whey|integrator[ei]|food supplement|dietary supplement|creatine|creatina/.test(searchable)) return 'supplement'
  if (/tofu|tempeh|seitan|veggie|vegetarian|vegan|meat[- ]substitutes?|meat[- ]alternatives?|plant[- ]based protein|soy protein|soya protein|pea protein|proteine vegetali/.test(searchable)) return 'plant_protein'
  if (/ready meals?|prepared meals?|piatti pronti|instant meals?|frozen meals?|pizza|lasagn|cannelloni/.test(searchable)) return 'prepared'
  if (/potato chips|crisps|patatine|popcorn|salatini|pretzel|snack salat/.test(searchable)) return 'snack'
  if (/\bnuts?\b|frutta secca|mandorl|noci|nocciol|pistacch|cashews?|anacard|peanuts?|arachidi|\bseeds?\b|semi di|chia/.test(searchable)) return 'nuts_seeds'
  if (/\bbutter\b|\bburro\b|\boils?\b|\bolio\b/.test(searchable)) return 'fat'
  if (/dairy|lattic|milk|latte|cheese|formagg|yogurt/.test(searchable)) return 'dairy'
  if (/meat|carne|beef|manzo|pork|maiale|chicken|pollo|turkey|tacchino/.test(searchable)) return 'meat'
  if (/fish|pesce|seafood|frutti-di-mare|salmon|tonno|tuna/.test(searchable)) return 'fish'
  if (/egg|uova/.test(searchable)) return 'egg'
  if (/fruit|frutta|apple|mela|banana/.test(searchable)) return 'fruit'
  if (/legume|beans?|fagiol|lentic|chickpea|ceci|piselli|peas/.test(searchable)) return 'legume'
  if (/vegetable|verdura|ortaggi/.test(searchable)) return 'vegetable'
  if (/grain|cereal|cereali|rice|riso|pasta|flour|farina/.test(searchable)) return 'grain'
  if (/spice|seasoning|spezie|aromat/.test(searchable)) return 'seasoning'
  if (/sweet|dessert|dolci|chocolate|cioccolat|biscuit/.test(searchable)) return 'sweet'
  return 'other'
}

function normalizeOffProduct(barcode: string, product: JsonRecord): CatalogProductInput | null {
  const name = text(product, 'name_it', 'product_name_it', 'name_en', 'product_name_en', 'product_name')
  if (!name) return null
  const nutriments = isRecord(product.nutriments) ? product.nutriments : {}
  const totalFat = number(nutriments.fat_100g)
  const saturatedFat = number(nutriments['saturated-fat_100g'])
  const explicitUnsaturated = number(nutriments['unsaturated-fat_100g'])
  let quantityLabel = text(product, 'quantity')
  let parsedQuantity = parseQuantity(quantityLabel)
  if (!parsedQuantity) {
    const rawValue = typeof product.product_quantity === 'number'
      ? product.product_quantity
      : Number(String(product.product_quantity ?? '').replace(',', '.'))
    const rawUnit = text(product, 'product_quantity_unit')?.toLowerCase()
    if (Number.isFinite(rawValue) && rawValue > 0 && rawUnit) {
      parsedQuantity = parseQuantity(`${rawValue} ${rawUnit}`)
      if (parsedQuantity && !quantityLabel) quantityLabel = `${rawValue} ${rawUnit}`
    }
  }
  const energyKcal = number(nutriments['energy-kcal_100g'])
    || Math.round(number(nutriments.energy_100g) / 4.184)

  return {
    barcode,
    name,
    brand: text(product, 'brands'),
    package_quantity: quantityLabel,
    quantity_value: parsedQuantity?.value ?? null,
    quantity_unit: parsedQuantity?.unit ?? null,
    serving_size: text(product, 'serving_size'),
    ingredients: text(
      product,
      'ingredients_text_it', 'ingredients_text_en', 'ingredients_text',
      'ingredients_text_with_allergens_it', 'ingredients_text_with_allergens_en',
    ),
    allergens: text(product, 'allergens'),
    calories_100g: energyKcal,
    protein_100g: number(nutriments.proteins_100g),
    carbs_100g: number(nutriments.carbohydrates_100g),
    fat_100g: totalFat,
    fiber_100g: number(nutriments.fiber_100g),
    sugars_100g: number(nutriments.sugars_100g),
    saturated_fat_100g: saturatedFat,
    unsaturated_fat_100g: explicitUnsaturated || Math.max(0, totalFat - saturatedFat),
    salt_100g: number(nutriments.salt_100g),
    category: category(product),
    source: 'openfoodfacts',
    off_food_id: barcode,
    confidence: 'high',
    metadata: product,
  }
}

async function fetchOpenFoodFacts(barcode: string): Promise<CatalogProductInput | null> {
  const response = await fetch(`${OFF_PRODUCT_URL}/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': 'FitTrackr/1.0' },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Open Food Facts returned ${response.status}`)
  const body = await response.json() as unknown
  if (!isRecord(body) || body.status !== 1 || !isRecord(body.product)) return null
  return normalizeOffProduct(barcode, body.product)
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const authorization = request.headers.get('Authorization')
  const apiKey = request.headers.get('apikey')
  if (!supabaseUrl) return json({ error: 'Servizio non configurato.' }, 503)
  if (!authorization || !apiKey || !await hasValidUser(authorization, supabaseUrl, apiKey)) {
    return json({ error: 'Sessione non valida.' }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400)
  }
  if (!isRecord(body) || typeof body.barcode !== 'string' || !BARCODE_PATTERN.test(body.barcode)) {
    return json({ error: 'Codice a barre non valido.' }, 400)
  }

  try {
    const existing = await getCatalogProduct(body.barcode)
    if (existing?.source === 'openfoodfacts') return json({ product: existing, cache_hit: true })

    let openFoodFactsProduct: CatalogProductInput | null
    try {
      openFoodFactsProduct = await fetchOpenFoodFacts(body.barcode)
    } catch (error) {
      // An existing AI record is still useful if Open Food Facts is temporarily
      // offline; it can be upgraded on a later scan.
      if (existing) {
        console.error('Open Food Facts refresh failed; using cached AI product', error)
        return json({ product: existing, cache_hit: true })
      }
      throw error
    }
    if (openFoodFactsProduct) {
      const saved = await upsertCatalogProduct(openFoodFactsProduct)
      return json({ product: saved, cache_hit: false })
    }
    if (existing) return json({ product: existing, cache_hit: true })
    return json({ product: null, cache_hit: false })
  } catch (error) {
    console.error('Barcode resolution failed', error)
    return json({ error: 'Servizio prodotti temporaneamente non disponibile.' }, 502)
  }
})
