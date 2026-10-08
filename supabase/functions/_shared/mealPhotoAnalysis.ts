// Shared by the Edge Function and the client: neither side trusts model output.
export const MEAL_PHOTO_CATEGORIES = [
  'grain', 'legume', 'vegetable', 'fruit', 'meat', 'fish', 'dairy', 'egg',
  'plant_protein', 'bakery', 'nuts_seeds', 'spread', 'fat', 'sauce',
  'condiment', 'seasoning', 'sweet', 'snack', 'prepared', 'supplement',
  'alcohol', 'beverage', 'other',
] as const

export interface MealPhotoIngredient {
  food_name: string
  quantity_g: number
  category: (typeof MEAL_PHOTO_CATEGORIES)[number]
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  assumed: boolean
  note: string | null
}

export interface MealPhotoAnalysis {
  name: string
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  items: MealPhotoIngredient[]
}

export const mealPhotoSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Nome breve del piatto in italiano.' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    items: {
      type: 'array', maxItems: 20,
      description: 'Componenti della porzione fotografata; vuoto se non è riconoscibile un pasto.',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          food_name: { type: 'string', description: 'Nome del componente, specificando cotto se pertinente.' },
          quantity_g: { type: 'number', minimum: 0.1, maximum: 10000, description: 'Grammi nel piatto già pronto, non peso crudo.' },
          category: { type: 'string', enum: MEAL_PHOTO_CATEGORIES },
          calories: { type: 'number', minimum: 0, description: 'kcal della quantità indicata, non per 100 g.' },
          protein_g: { type: 'number', minimum: 0 },
          carbs_g: { type: 'number', minimum: 0 },
          fat_g: { type: 'number', minimum: 0 },
          assumed: { type: 'boolean', description: 'True per ingredienti dedotti e non distinguibili nella foto, come olio o burro.' },
          note: { type: ['string', 'null'], description: 'Breve motivazione di una supposizione o quantità incerta.' },
        },
        required: ['food_name', 'quantity_g', 'category', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'assumed', 'note'],
      },
    },
  },
  required: ['name', 'confidence', 'warnings', 'items'],
} as const

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isMealPhotoAnalysis(value: unknown): value is MealPhotoAnalysis {
  if (!record(value) || !boundedText(value.name, 160)
    || typeof value.confidence !== 'string' || !['high', 'medium', 'low'].includes(value.confidence)
    || !Array.isArray(value.warnings) || value.warnings.length > 6
    || !value.warnings.every(warning => boundedText(warning, 500))
    || !Array.isArray(value.items) || value.items.length > 20) return false

  return value.items.every(item => {
    if (!record(item) || !boundedText(item.food_name, 160)
      || !nonNegative(item.quantity_g) || item.quantity_g < 0.1 || item.quantity_g > 10000
      || !MEAL_PHOTO_CATEGORIES.includes(item.category as MealPhotoIngredient['category'])
      || !nonNegative(item.calories) || !nonNegative(item.protein_g)
      || !nonNegative(item.carbs_g) || !nonNegative(item.fat_g)
      || typeof item.assumed !== 'boolean'
      || !(item.note === null || boundedText(item.note, 500))) return false
    // Reject impossible nutrient mass or energy density, allowing for rounding.
    const macroEnergy = item.protein_g * 4 + item.carbs_g * 4 + item.fat_g * 9
    return item.protein_g + item.carbs_g + item.fat_g <= item.quantity_g * 1.1
      && item.calories <= item.quantity_g * 10
      && Math.abs(item.calories - macroEnergy) <= Math.max(15, macroEnergy * 0.3)
  })
}
