import { upsertCatalogProduct } from '../_shared/barcodeCatalog.ts'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const FOOD_CATEGORIES = [
  'grain', 'legume', 'vegetable', 'fruit', 'meat', 'fish', 'dairy', 'egg',
  'plant_protein', 'bakery', 'nuts_seeds', 'spread', 'fat', 'sauce',
  'condiment', 'seasoning', 'sweet', 'snack', 'prepared', 'supplement',
  'alcohol', 'beverage', 'other',
] as const

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

function base64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor(value.length * 3 / 4) - padding
}

async function hasValidUser(authorization: string, supabaseUrl: string, anonKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: anonKey },
    })
    return response.ok
  } catch (error) {
    console.error('Supabase Auth validation failed', error)
    return false
  }
}

function nullable(type: 'string' | 'number', description: string): JsonRecord {
  return { type: [type, 'null'], description }
}

const nutritionLabelSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    barcode: {
      anyOf: [{ type: 'string', pattern: '^(?:[0-9]{8}|[0-9]{12,14})$' }, { type: 'null' }],
      description: 'Codice a barre GTIN/EAN/UPC visibile o già fornito; null se assente.',
    },
    product_name: nullable('string', 'Nome del prodotto, senza marca; null se non leggibile.'),
    brand: nullable('string', 'Marca; null se non visibile.'),
    package_quantity_label: nullable('string', 'Quantità confezione così come stampata, ad esempio 2 x 125 g.'),
    package_quantity_value: nullable('number', 'Quantità totale normalizzata in g, ml o pezzi.'),
    package_quantity_unit: {
      anyOf: [{ type: 'string', enum: ['g', 'ml', 'pz'] }, { type: 'null' }],
      description: 'Unità della quantità totale normalizzata.',
    },
    serving_size: nullable('string', 'Porzione dichiarata in etichetta; null se assente.'),
    ingredients: nullable('string', 'Elenco ingredienti trascritto; null se non visibile.'),
    allergens: nullable('string', 'Allergeni dichiarati o chiaramente evidenziati; null se non visibili.'),
    category: { type: 'string', enum: FOOD_CATEGORIES },
    nutrition_basis: {
      type: 'string',
      enum: ['per_100g', 'per_100ml', 'normalized_from_serving', 'unavailable'],
      description: 'Origine dei valori nutrizionali restituiti.',
    },
    calories_100: nullable('number', 'kcal per 100 g o 100 ml.'),
    protein_100g: nullable('number', 'Proteine in grammi per 100 g o 100 ml.'),
    carbs_100g: nullable('number', 'Carboidrati in grammi per 100 g o 100 ml.'),
    fat_100g: nullable('number', 'Grassi in grammi per 100 g o 100 ml.'),
    fiber_100g: nullable('number', 'Fibre in grammi per 100 g o 100 ml.'),
    sugars_100g: nullable('number', 'Zuccheri in grammi per 100 g o 100 ml.'),
    saturated_fat_100g: nullable('number', 'Grassi saturi in grammi per 100 g o 100 ml.'),
    salt_100g: nullable('number', 'Sale in grammi per 100 g o 100 ml.'),
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 8 },
  },
  required: [
    'barcode', 'product_name', 'brand', 'package_quantity_label', 'package_quantity_value',
    'package_quantity_unit', 'serving_size', 'ingredients', 'allergens', 'category',
    'nutrition_basis', 'calories_100', 'protein_100g', 'carbs_100g', 'fat_100g',
    'fiber_100g', 'sugars_100g', 'saturated_fat_100g', 'salt_100g',
    'confidence', 'warnings',
  ],
} as const

const extractionInstructions = `Sei un trascrittore prudente di etichette alimentari.
Analizza soltanto ciò che è visibile nella foto. Non inventare valori mancanti.
Se il messaggio fornisce un barcode già scansionato, copialo esattamente nel campo barcode; altrimenti trascrivi il barcode solo se è leggibile nella foto.
Restituisci i nutrienti per 100 g o per 100 ml usando la colonna esplicitamente stampata.
Se l'etichetta mostra solo valori per porzione, normalizzali a 100 g/ml soltanto quando peso o volume della porzione è esplicito; imposta nutrition_basis a normalized_from_serving e aggiungi un avviso.
Se non puoi normalizzare con certezza, usa null per i nutrienti e nutrition_basis unavailable.
Le kcal hanno priorità; se sono visibili solo kJ, converti in kcal dividendo per 4.184 e segnala la conversione.
Non dedurre allergeni non dichiarati. Scrivi testi e avvisi in italiano.
Scegli la categoria culinaria più vicina fra quelle consentite.
La foto può contenere fronte confezione, ingredienti e/o tabella nutrizionale: estrai solo i campi effettivamente leggibili.`

function extractOutputText(response: JsonRecord): string | null {
  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text
      }
    }
  }
  return null
}

function isNullableNonNegativeNumber(value: unknown): boolean {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidAnalysis(value: unknown): value is JsonRecord {
  if (!isRecord(value)) return false
  const nullableStrings = [
    'barcode', 'product_name', 'brand', 'package_quantity_label', 'serving_size', 'ingredients', 'allergens',
  ]
  const nullableNumbers = [
    'package_quantity_value', 'calories_100', 'protein_100g', 'carbs_100g', 'fat_100g',
    'fiber_100g', 'sugars_100g', 'saturated_fat_100g', 'salt_100g',
  ]
  return nullableStrings.every(key => value[key] === null || typeof value[key] === 'string')
    && (value.barcode === null || /^(?:[0-9]{8}|[0-9]{12,14})$/.test(String(value.barcode)))
    && nullableNumbers.every(key => isNullableNonNegativeNumber(value[key]))
    && (value.package_quantity_unit === null || ['g', 'ml', 'pz'].includes(String(value.package_quantity_unit)))
    && FOOD_CATEGORIES.includes(value.category as (typeof FOOD_CATEGORIES)[number])
    && ['per_100g', 'per_100ml', 'normalized_from_serving', 'unavailable'].includes(String(value.nutrition_basis))
    && ['high', 'medium', 'low'].includes(String(value.confidence))
    && Array.isArray(value.warnings)
    && value.warnings.every(warning => typeof warning === 'string')
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const authorization = request.headers.get('Authorization')
  const apiKey = request.headers.get('apikey')
  if (!openAiKey || !supabaseUrl) {
    console.error('Missing required Edge Function secrets')
    return json({ error: 'Servizio di analisi non configurato.' }, 503)
  }
  if (!authorization || !apiKey || !await hasValidUser(authorization, supabaseUrl, apiKey)) {
    return json({ error: 'Sessione non valida.' }, 401)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400)
  }
  if (!isRecord(body) || typeof body.image_base64 !== 'string' || typeof body.mime_type !== 'string') {
    return json({ error: 'Foto mancante.' }, 400)
  }
  if (!ALLOWED_MIME_TYPES.has(body.mime_type)) {
    return json({ error: 'Formato immagine non supportato.' }, 415)
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.image_base64) || base64ByteLength(body.image_base64) > MAX_IMAGE_BYTES) {
    return json({ error: 'Foto non valida o troppo grande.' }, 413)
  }
  const suppliedBarcode = typeof body.barcode === 'string' && /^(?:[0-9]{8}|[0-9]{12,14})$/.test(body.barcode)
    ? body.barcode
    : null

  let openAiResponse: Response
  try {
    openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4o-mini',
        store: false,
        max_output_tokens: 1800,
        instructions: extractionInstructions,
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: suppliedBarcode
                ? `Estrai i dati della confezione e dell’etichetta nutrizionale da questa foto. Barcode già scansionato: ${suppliedBarcode}.`
                : 'Estrai i dati della confezione e dell’etichetta nutrizionale da questa foto.',
            },
            { type: 'input_image', image_url: `data:${body.mime_type};base64,${body.image_base64}`, detail: 'high' },
          ],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'nutrition_label',
            strict: true,
            schema: nutritionLabelSchema,
          },
        },
      }),
    })
  } catch (error) {
    console.error('OpenAI request could not be sent', error)
    return json({ error: 'Servizio di analisi temporaneamente non raggiungibile.' }, 502)
  }

  if (!openAiResponse.ok) {
    const requestId = openAiResponse.headers.get('x-request-id')
    const errorText = await openAiResponse.text()
    console.error('OpenAI request failed', openAiResponse.status, requestId, errorText.slice(0, 800))
    if (openAiResponse.status === 429) return json({ error: 'Troppe analisi in corso. Riprova tra poco.' }, 429)
    return json({ error: 'Non è stato possibile analizzare la foto.' }, 502)
  }

  const openAiBody = await openAiResponse.json() as JsonRecord
  const outputText = extractOutputText(openAiBody)
  if (!outputText) {
    console.error('OpenAI response did not include output text', openAiBody.id)
    return json({ error: 'L’etichetta non è risultata leggibile.' }, 422)
  }

  let analysis: unknown
  try {
    analysis = JSON.parse(outputText)
  } catch {
    console.error('OpenAI returned invalid JSON', openAiBody.id)
    return json({ error: 'La risposta di analisi non è valida.' }, 502)
  }
  if (!isValidAnalysis(analysis)) {
    console.error('OpenAI returned an invalid nutrition payload', openAiBody.id)
    return json({ error: 'I dati estratti non sono validi.' }, 502)
  }

  const catalogBarcode = typeof analysis.barcode === 'string' ? analysis.barcode : suppliedBarcode
  const productName = typeof analysis.product_name === 'string' ? analysis.product_name.trim() : ''
  const hasCompleteCoreNutrition = [
    analysis.calories_100,
    analysis.protein_100g,
    analysis.carbs_100g,
    analysis.fat_100g,
  ].every(value => typeof value === 'number')
  const canPopulateCatalog = catalogBarcode
    && productName
    && hasCompleteCoreNutrition
    && analysis.nutrition_basis !== 'unavailable'
    && analysis.confidence !== 'low'

  if (canPopulateCatalog) {
    const optionalNumber = (value: unknown): number | null => typeof value === 'number' ? value : null
    const optionalText = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null
    try {
      await upsertCatalogProduct({
        barcode: catalogBarcode,
        name: productName,
        brand: optionalText(analysis.brand),
        package_quantity: optionalText(analysis.package_quantity_label),
        quantity_value: typeof analysis.package_quantity_value === 'number' && analysis.package_quantity_value > 0
          ? analysis.package_quantity_value
          : null,
        quantity_unit: analysis.package_quantity_unit as 'g' | 'ml' | 'pz' | null,
        serving_size: optionalText(analysis.serving_size),
        ingredients: optionalText(analysis.ingredients),
        allergens: optionalText(analysis.allergens),
        calories_100g: analysis.calories_100 as number,
        protein_100g: analysis.protein_100g as number,
        carbs_100g: analysis.carbs_100g as number,
        fat_100g: analysis.fat_100g as number,
        fiber_100g: optionalNumber(analysis.fiber_100g),
        sugars_100g: optionalNumber(analysis.sugars_100g),
        saturated_fat_100g: optionalNumber(analysis.saturated_fat_100g),
        unsaturated_fat_100g: null,
        salt_100g: optionalNumber(analysis.salt_100g),
        category: analysis.category as string,
        source: 'ai_photo',
        off_food_id: null,
        confidence: analysis.confidence as 'high' | 'medium',
        metadata: {
          source: 'openai_nutrition_label',
          nutrition_basis: analysis.nutrition_basis,
          warnings: analysis.warnings,
        },
      })
    } catch (error) {
      // The extraction remains usable even if the shared cache is temporarily
      // unavailable. A later scan/photo can retry populating the catalog.
      console.error('Could not populate barcode catalog from photo analysis', error)
    }
  }

  return json({ analysis })
})
