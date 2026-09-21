import { getAuthenticatedUser } from '../_shared/auth.ts'
import { createConfirmationToken } from '../_shared/analysisConfirmation.ts'
import {
  NUTRIENT_KEYS,
  normalizeNutritionExtraction,
  type RawNutrients,
} from '../_shared/nutritionAnalysis.ts'

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const BARCODE_PATTERN = /^(?:[0-9]{8}|[0-9]{12,14})$/
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

function nullable(type: 'string' | 'number' | 'integer', description: string): JsonRecord {
  return { type: [type, 'null'], description }
}

const nutrientSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    energy_kj: nullable('number', 'Energia in kJ trascritta dalla colonna; null se assente.'),
    calories_kcal: nullable('number', 'Energia in kcal trascritta dalla colonna; null se assente.'),
    protein_g: nullable('number', 'Proteine in g trascritte dalla colonna.'),
    carbs_g: nullable('number', 'Carboidrati in g trascritti dalla colonna.'),
    fat_g: nullable('number', 'Grassi in g trascritti dalla colonna.'),
    fiber_g: nullable('number', 'Fibre in g trascritte dalla colonna.'),
    sugars_g: nullable('number', 'Zuccheri in g trascritti dalla colonna.'),
    saturated_fat_g: nullable('number', 'Grassi saturi in g trascritti dalla colonna.'),
    salt_g: nullable('number', 'Sale in g trascritto dalla colonna.'),
  },
  required: NUTRIENT_KEYS,
} as const

const nutritionLabelSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    barcode: {
      anyOf: [{ type: 'string', pattern: '^(?:[0-9]{8}|[0-9]{12,14})$' }, { type: 'null' }],
      description: 'Barcode visibile o fornito nel testo; null se assente.',
    },
    product_name: nullable('string', 'Nome del prodotto senza marca.'),
    brand: nullable('string', 'Marca visibile.'),
    package_quantity_label: nullable('string', 'Quantità confezione esattamente come stampata.'),
    package_piece_count: {
      anyOf: [
        { type: 'integer', minimum: 1 },
        { type: 'null' },
      ],
      description: 'Numero di pezzi dichiarato, senza moltiplicarlo per il peso della porzione.',
    },
    package_net_quantity_value: nullable('number', 'Peso o volume netto totale solo se esplicitamente stampato.'),
    package_net_quantity_unit: { anyOf: [{ type: 'string', enum: ['g', 'ml'] }, { type: 'null' }] },
    serving_size: nullable('string', 'Porzione così come stampata.'),
    serving_quantity_value: nullable('number', 'Peso o volume numerico della porzione.'),
    serving_quantity_unit: { anyOf: [{ type: 'string', enum: ['g', 'ml'] }, { type: 'null' }] },
    ingredients: nullable('string', 'Ingredienti visibili; non dedurli.'),
    allergens: nullable('string', 'Allergeni dichiarati o evidenziati; non dedurli.'),
    category: { type: 'string', enum: FOOD_CATEGORIES },
    nutrition_per_100_basis: {
      anyOf: [{ type: 'string', enum: ['g', 'ml'] }, { type: 'null' }],
      description: 'g se la colonna è per 100 g, ml se è per 100 ml, null se non esiste.',
    },
    nutrition_per_100: { anyOf: [nutrientSchema, { type: 'null' }] },
    nutrition_per_serving: { anyOf: [nutrientSchema, { type: 'null' }] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 8 },
  },
  required: [
    'barcode', 'product_name', 'brand', 'package_quantity_label', 'package_piece_count',
    'package_net_quantity_value', 'package_net_quantity_unit', 'serving_size',
    'serving_quantity_value', 'serving_quantity_unit', 'ingredients', 'allergens',
    'category', 'nutrition_per_100_basis', 'nutrition_per_100',
    'nutrition_per_serving', 'confidence', 'warnings',
  ],
} as const

const extractionInstructions = `Sei un trascrittore rigoroso di confezioni ed etichette nutrizionali multilingue.
Il tuo compito è TRASCRIVERE i valori visibili, non calcolare o stimare valori finali.

Regole obbligatorie:
1. Identifica separatamente la colonna "per 100 g/ml" e la colonna "per porzione" anche se le intestazioni non sono in italiano.
2. Copia ogni numero nella colonna corretta. Non spostare valori tra righe o colonne e conserva gli zero espliciti come 0, non null.
3. Se esiste una colonna per 100 g/ml, compilala sempre: non normalizzare la porzione e non aggiungere avvisi di normalizzazione.
4. Non convertire kJ in kcal: trascrivi entrambi nei rispettivi campi. Il server farà conversioni e controlli.
5. Se sono dichiarati pezzi e peso della porzione, mantienili separati. Non moltiplicare mai il numero dei pezzi per il peso di una porzione.
6. package_piece_count contiene solo il numero di pezzi stampato. package_net_quantity contiene solo peso/volume netto esplicitamente stampato: non stimarlo.
7. Non dedurre ingredienti, allergeni, marca o quantità non visibili. Usa null quando un dato non è leggibile.
8. Prima di rispondere verifica visivamente intestazioni, separatori decimali e allineamento di ogni riga.

Esempio: una confezione con "10 uova", porzione "58 g" e una colonna "per 100 g" deve produrre package_piece_count=10, package_net_quantity_value=null, serving_quantity_value=58 e i nutrienti copiati da nutrition_per_100. Non deve produrre 580 pezzi o normalizzare la porzione.

Scrivi nome, testi e avvisi in italiano quando è necessaria una traduzione, ma non alterare i numeri.`

function base64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  return Math.floor(value.length * 3 / 4) - padding
}

function extractOutputText(response: JsonRecord): string | null {
  const output = Array.isArray(response.output) ? response.output : []
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }
  return null
}

function isNullableNonNegativeNumber(value: unknown): boolean {
  return value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNutrients(value: unknown): value is RawNutrients {
  return isRecord(value) && NUTRIENT_KEYS.every(key => isNullableNonNegativeNumber(value[key]))
}

function isValidExtraction(value: unknown): value is JsonRecord {
  if (!isRecord(value)) return false
  const nullableStrings = ['barcode', 'product_name', 'brand', 'package_quantity_label', 'serving_size', 'ingredients', 'allergens']
  return nullableStrings.every(key => value[key] === null || typeof value[key] === 'string')
    && (value.barcode === null || BARCODE_PATTERN.test(String(value.barcode)))
    && isNullableNonNegativeNumber(value.package_piece_count)
    && (value.package_piece_count === null || Number.isInteger(value.package_piece_count) && value.package_piece_count > 0)
    && isNullableNonNegativeNumber(value.package_net_quantity_value)
    && (value.package_net_quantity_unit === null || ['g', 'ml'].includes(String(value.package_net_quantity_unit)))
    && isNullableNonNegativeNumber(value.serving_quantity_value)
    && (value.serving_quantity_unit === null || ['g', 'ml'].includes(String(value.serving_quantity_unit)))
    && (value.nutrition_per_100_basis === null || ['g', 'ml'].includes(String(value.nutrition_per_100_basis)))
    && (value.nutrition_per_100 === null || isNutrients(value.nutrition_per_100))
    && (value.nutrition_per_serving === null || isNutrients(value.nutrition_per_serving))
    && FOOD_CATEGORIES.includes(value.category as (typeof FOOD_CATEGORIES)[number])
    && ['high', 'medium', 'low'].includes(String(value.confidence))
    && Array.isArray(value.warnings)
    && value.warnings.every(warning => typeof warning === 'string')
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)

  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const user = await getAuthenticatedUser(request)
  if (!openAiKey) return json({ error: 'Servizio di analisi non configurato.' }, 503)
  if (!user) return json({ error: 'Sessione non valida.' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Richiesta non valida.' }, 400)
  }
  if (!isRecord(body) || typeof body.image_base64 !== 'string' || typeof body.mime_type !== 'string') {
    return json({ error: 'Foto mancante.' }, 400)
  }
  if (!ALLOWED_MIME_TYPES.has(body.mime_type)) return json({ error: 'Formato immagine non supportato.' }, 415)
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.image_base64) || base64ByteLength(body.image_base64) > MAX_IMAGE_BYTES) {
    return json({ error: 'Foto non valida o troppo grande.' }, 413)
  }
  const suppliedBarcode = typeof body.barcode === 'string' && BARCODE_PATTERN.test(body.barcode) ? body.barcode : null
  const model = Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4.1-mini'

  let openAiResponse: Response
  try {
    openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 3000,
        ...(model.startsWith('gpt-5') ? { reasoning: { effort: 'low' } } : { temperature: 0 }),
        instructions: extractionInstructions,
        input: [{
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: suppliedBarcode
                ? `Trascrivi con precisione questa etichetta. Il barcode già verificato è ${suppliedBarcode}: copialo senza modificarlo. Dai priorità alla colonna per 100 g/ml e mantieni separati pezzi, peso netto e porzione.`
                : 'Trascrivi con precisione questa etichetta. Dai priorità alla colonna per 100 g/ml e mantieni separati pezzi, peso netto e porzione.',
            },
            { type: 'input_image', image_url: `data:${body.mime_type};base64,${body.image_base64}`, detail: 'high' },
          ],
        }],
        text: {
          format: { type: 'json_schema', name: 'nutrition_label_transcription', strict: true, schema: nutritionLabelSchema },
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
  if (!outputText) return json({ error: 'L’etichetta non è risultata leggibile.' }, 422)

  let extraction: unknown
  try {
    extraction = JSON.parse(outputText)
  } catch {
    return json({ error: 'La risposta di analisi non è valida.' }, 502)
  }
  if (!isValidExtraction(extraction)) {
    console.error('OpenAI returned an invalid nutrition transcription', openAiBody.id)
    return json({ error: 'I dati estratti non sono validi.' }, 502)
  }

  const barcode = suppliedBarcode ?? (typeof extraction.barcode === 'string' ? extraction.barcode : null)
  const analysis: JsonRecord = { ...normalizeNutritionExtraction(extraction), barcode }
  if (barcode) analysis.confirmation_token = await createConfirmationToken(user.id, barcode)
  return json({ analysis })
})
