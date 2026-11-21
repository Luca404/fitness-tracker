import { BASIC_FOODS } from '../../../src/data/basicFoods.ts'
import type { BasicFood } from '../../../src/data/basicFoods.ts'
import { normalizeIngredientName } from '../../../src/utils/ingredientMatching.ts'
import { cookedWeightFactor, defaultCookingMethod } from '../../../src/utils/preparedDishes.ts'
import { scaleIngredient, scaleNutrition } from '../../../src/utils/nutrition.ts'
import { roundToTwo } from '../../../src/utils/decimal.ts'
import type { DishItem, MealItemInput, PantryItem } from '../../../src/types/index.ts'
import { CHAT_FOOD_SOURCES, CHAT_FOOD_UNITS, CHAT_MEAL_TYPES } from '../_shared/fitnessChat.ts'
import type { ChatFood, ChatMealDraft, ChatMealReceipt } from '../_shared/fitnessChat.ts'

export class DiaryInputError extends Error {}

export function localDate() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function dateValue(date: unknown): number {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01') return NaN
  const value = Date.parse(date)
  return Number.isFinite(value) && new Date(value).toISOString().slice(0, 10) === date ? value : NaN
}

const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

export function rangeLength(from: unknown, to: unknown) {
  return (dateValue(to) - dateValue(from)) / 86_400_000 + 1
}

export function parseDraft(value: unknown, today: string): ChatMealDraft {
  const input = value as Partial<ChatMealDraft> | null
  if (!input || !Number.isFinite(dateValue(input.date)) || input.date! > today || !input.meal_type
    || !CHAT_MEAL_TYPES.includes(input.meal_type) || !Array.isArray(input.foods) || input.foods.length < 1 || input.foods.length > 8) {
    throw new DiaryInputError('Servono una data, il tipo di pasto e fino a otto alimenti con quantità.')
  }
  const foods = input.foods.map(food => {
    if (!food || typeof food.name !== 'string' || !food.name.trim() || food.name.trim().length > 120
      || !Number.isFinite(food.amount) || food.amount < 0.01 || food.amount > (food.unit === 'portion' ? 20 : 5000)
      || !CHAT_FOOD_UNITS.includes(food.unit) || !CHAT_FOOD_SOURCES.includes(food.source)
      || (food.item_id != null && (typeof food.item_id !== 'string' || !uuidPattern.test(food.item_id) || food.source === 'basic'))) {
      throw new DiaryInputError('Controlla nome, quantità e unità degli alimenti.')
    }
    return { name: food.name.trim(), amount: roundToTwo(food.amount), unit: food.unit, source: food.source, item_id: food.item_id ?? null }
  })
  return { date: input.date!, meal_type: input.meal_type, foods }
}

export function diaryApi(request: Request, userId: string, signal: AbortSignal) {
  const base = `${Deno.env.get('SUPABASE_URL')}/rest/v1/`
  const headers = { Authorization: request.headers.get('Authorization')!, apikey: request.headers.get('apikey')! }
  async function query<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(path, base), { ...init, signal, headers: { ...headers, 'Content-Type': 'application/json' } })
    if (!response.ok) throw new Error('Supabase diary request failed')
    return await response.json() as T
  }
  return {
    rows<T>(table: string, params: Record<string, string>, owned = true) {
      const search = new URLSearchParams(owned ? { ...params, user_id: `eq.${userId}` } : params)
      return query<T[]>(`${table}?${search}`)
    },
    rpc<T>(name: string, body: Record<string, unknown>) {
      return query<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(body) })
    },
  }
}

type DiaryApi = ReturnType<typeof diaryApi>
type Prepared = { id: string; remaining_g: number; created_at: string; dish: { name: string } }
type Recipe = { id: string; name: string }
type RecipeItem = Omit<DishItem, 'dish_id' | 'position' | 'created_at'>
type ResolvedMeal = { name: string; items: MealItemInput[]; dishId?: string; batchId?: string; grams?: number; description: string }

function label(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

const catalog = BASIC_FOODS.flatMap(food => [food.name, ...(food.aliases ?? [])].map(name => ({ food, name: label(name) })))
const cooked = /\b(cott[oaie]|bollit[oaie]|lessat[oaie]|less[oaie]|in padella)\b/
const raw = /\b(crud[oaie]|secc[oaie])\b/

function findBasic(name: string) {
  const exact = catalog.filter(entry => entry.name === label(name))
  if (exact.length) return [...new Set(exact.map(entry => entry.food))]
  const unqualified = label(name).replace(cooked, '').replace(raw, '').trim()
  const normalized = normalizeIngredientName(unqualified)
  return [...new Set(catalog.filter(entry => normalizeIngredientName(entry.name) === normalized).map(entry => entry.food))]
}

function nameFilter(name: string, exact = true) {
  const escaped = name.replace(/[\\%*_]/g, '\\$&')
  return `ilike.${exact ? escaped : `%${escaped}%`}`
}

function preparedDate(batch: Prepared) {
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(batch.created_at))
}

export async function findFoods(db: DiaryApi, name: string) {
  const term = label(name)
  if (term.length < 2 || name.length > 120) throw new DiaryInputError('Indica almeno due caratteri del nome.')
  const filter = nameFilter(name.trim(), false)
  const [pantry, dishes, prepared] = await Promise.all([
    db.rows<{ id: string; name: string }>('pantry_items', { name: filter, limit: '8', select: 'id,name', order: 'name' }),
    db.rows<Recipe>('dishes', { name: filter, is_preparation: 'eq.false', limit: '8', select: 'id,name', order: 'name' }),
    db.rows<Prepared>('prepared_batches', { 'dish.name': filter, closed_at: 'is.null', remaining_g: 'gt.0', limit: '8',
      select: 'id,remaining_g,created_at,dish:dishes!prepared_batches_snapshot_dish_id_fkey!inner(name)' }),
  ])
  const basic = [...new Set(catalog.filter(entry => entry.name.includes(term)).map(entry => entry.food.name))].slice(0, 8)
  return { basic, pantry, dishes, prepared: prepared.map(batch => ({
    id: batch.id, name: batch.dish.name, remaining_g: batch.remaining_g, prepared_on: preparedDate(batch),
  })) }
}

function scaledBasic(food: BasicFood, requested: ChatFood): { item: MealItemInput; estimate: boolean } {
  const unit = ['alcohol', 'beverage'].includes(food.category) ? 'ml' : 'g'
  if (requested.unit !== unit) throw new DiaryInputError(`Per ${food.name} indica la quantità in ${unit}.`)
  const item = { food_name: food.name, food_key: `basic:${food.id}`, category: food.category, quantity_g: requested.amount, unit } as const
  const name = label(requested.name)
  const method = defaultCookingMethod(item)
  const alreadyCooked = cooked.test(label(food.name)) || label(food.name).includes('in scatola')
  if (method !== 'raw' && ['grain', 'legume', 'meat', 'fish'].includes(food.category) && !alreadyCooked && !cooked.test(name) && !raw.test(name)) {
    throw new DiaryInputError(`Per ${food.name} il peso era a crudo/secco o dopo la cottura?`)
  }
  const estimated = cooked.test(name) && !alreadyCooked
  const yieldFactor = estimated ? cookedWeightFactor(item, /bollit|less/.test(name) ? 'boiled' : name.includes('in padella') ? 'pan' : method) : 1
  return {
    estimate: estimated && yieldFactor !== 1,
    item: { ...item, food_name: estimated ? requested.name : food.name, source: 'basic', off_food_id: null,
      alcohol_abv: food.alcohol_abv ?? null, ...scaleNutrition(food, requested.amount / (100 * yieldFactor)) },
  }
}

function scaledPantry(item: PantryItem, requested: ChatFood): MealItemInput {
  const unit = item.nutrition_unit ?? 'g'
  if (requested.unit !== unit) throw new DiaryInputError(`Per ${item.name} indica la quantità in ${unit}.`)
  return { food_name: item.name, food_key: item.food_key, category: item.category, pantry_item_id: item.id,
    quantity_g: requested.amount, unit, source: 'pantry', off_food_id: item.off_food_id, alcohol_abv: item.alcohol_abv,
    ...scaleNutrition({ calories: item.calories_100g, protein_g: item.protein_100g, carbs_g: item.carbs_100g, fat_g: item.fat_100g,
      fiber_g: item.fiber_100g, sugars_g: item.sugars_100g, salt_g: item.salt_100g }, requested.amount / 100) }
}

async function resolveFood(db: DiaryApi, food: ChatFood): Promise<ResolvedMeal> {
  const matchesSource = (source: ChatFood['source']) => food.source === 'auto' || food.source === source
  const selectedId: Record<string, string> = food.item_id ? { id: `eq.${food.item_id}` } : {}
  const [pantry, recipes, batches] = await Promise.all([
    matchesSource('pantry') ? db.rows<PantryItem>('pantry_items', {
      ...selectedId, name: nameFilter(food.name), limit: '6', select: 'id,name,nutrition_unit,category,food_key,off_food_id,alcohol_abv,calories_100g,protein_100g,carbs_100g,fat_100g,fiber_100g,sugars_100g,salt_100g',
    }) : [],
    matchesSource('dish') ? db.rows<Recipe>('dishes', { ...selectedId, name: nameFilter(food.name), is_preparation: 'eq.false', limit: '6', select: 'id,name' }) : [],
    matchesSource('prepared') ? db.rows<Prepared>('prepared_batches', {
      ...selectedId, 'dish.name': nameFilter(food.name), closed_at: 'is.null', remaining_g: 'gt.0', limit: '6',
      select: 'id,remaining_g,created_at,dish:dishes!prepared_batches_snapshot_dish_id_fkey!inner(name)',
    }) : [],
  ])
  const basic = !food.item_id && matchesSource('basic') && pantry.length === 0 && recipes.length === 0 && batches.length === 0 ? findBasic(food.name) : []
  const count = pantry.length + recipes.length + batches.length + basic.length
  if (!count) throw new DiaryInputError(`Non trovo «${food.name}» tra le voci disponibili. Chiedi il nome esatto o un alimento alternativo.`)
  if (count > 1) {
    const choices = [...pantry.map(item => `${item.name} (dispensa)`), ...recipes.map(item => `${item.name} (ricetta)`),
      ...batches.map(item => `${item.dish.name} (preparato il ${preparedDate(item)}, ${item.remaining_g} g rimasti)`), ...basic.map(item => item.name)]
    throw new DiaryInputError(`Più voci corrispondono a «${food.name}»: ${choices.slice(0, 6).join(', ')}. Chiedi di scegliere.`)
  }
  const quantity = `${food.amount.toLocaleString('it-IT')} ${food.unit === 'portion' ? (food.amount === 1 ? 'porzione' : 'porzioni') : food.unit}`
  if (batches.length) {
    const batch = batches[0]
    if (food.unit !== 'g' || food.amount > batch.remaining_g) {
      throw new DiaryInputError(`Per ${batch.dish.name} indica una quantità in grammi, fino a ${batch.remaining_g} g disponibili.`)
    }
    return { name: batch.dish.name, batchId: batch.id, grams: food.amount, items: [], description: `${quantity} di ${batch.dish.name} (preparato il ${preparedDate(batch)})` }
  }
  if (recipes.length) {
    const recipe = recipes[0]
    if (food.unit !== 'portion') throw new DiaryInputError(`Per la ricetta ${recipe.name} indica quante porzioni hai mangiato. Per il peso cotto usa un piatto pronto.`)
    const items = await db.rows<RecipeItem>('dish_items', { dish_id: `eq.${recipe.id}`, order: 'position.asc',
      select: 'id,food_name,food_key,quantity_g,unit,category,calories,protein_g,carbs_g,fat_g,fiber_g,sugars_g,salt_g,pantry_item_id,piece_count,piece_size,source,off_food_id,alcohol_abv' }, false)
    if (!items.length) throw new DiaryInputError(`La ricetta ${recipe.name} non contiene ingredienti registrabili.`)
    return { name: recipe.name, dishId: recipe.id, items: items.map(item => {
      const { id, ...values } = item
      return { ...scaleIngredient(values, item.quantity_g * food.amount), dish_item_id: id,
        piece_count: item.piece_count == null ? null : roundToTwo(item.piece_count * food.amount) }
    }), description: `${quantity} di ${recipe.name} (ricetta)` }
  }
  const single = pantry.length ? { item: scaledPantry(pantry[0], food), estimate: false } : scaledBasic(basic[0], food)
  return { name: single.item.food_name, items: [single.item],
    description: `${quantity} di ${single.item.food_name}${single.estimate ? ' (valori stimati dopo la cottura)' : ''}` }
}

export async function resolveMeal(db: DiaryApi, draft: ChatMealDraft): Promise<ResolvedMeal> {
  const foods = await Promise.all(draft.foods.map(food => resolveFood(db, food)))
  if (foods.length === 1) return foods[0]
  if (foods.some(food => food.dishId || food.batchId)) throw new DiaryInputError('Registra la ricetta o il piatto pronto separatamente dagli altri alimenti.')
  return { name: foods.map(food => food.name).join(', ').slice(0, 160), items: foods.flatMap(food => food.items),
    description: foods.map(food => food.description).join(' · ') }
}

export async function recipeRevision(meal: ResolvedMeal) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(meal)))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function receiptFor(db: DiaryApi, id: string) {
  const [receipt] = await db.rows<ChatMealReceipt>('fitness_chat_meal_receipts', {
    request_id: `eq.${id}`, select: 'entry_id,date,meal_type,name', limit: '1',
  })
  return receipt
}

export function recordMeal(db: DiaryApi, id: string, draft: ChatMealDraft, meal: ResolvedMeal) {
  return db.rpc<ChatMealReceipt>('record_fitness_chat_meal', {
    p_request_id: id, p_date: draft.date, p_meal_type: draft.meal_type, p_name: meal.name, p_items: meal.items,
    p_dish_id: meal.dishId ?? null, p_batch_id: meal.batchId ?? null, p_grams: meal.grams ?? null,
  })
}

// Direct save is available only for a single fully specified statement using
// the current message. Tool arguments and earlier assistant text cannot authorize it.
export function canSaveDirectly(message: string, draft: ChatMealDraft, today: string) {
  if (draft.foods.length !== 1 || draft.foods[0].source !== 'auto' || draft.foods[0].item_id) return false
  const match = /^(?:(oggi|ieri)\s+)?(a colazione|a pranzo|a cena|come spuntino)\s+ho (?:mangiato|bevuto)\s+(\d+(?:[.,]\d+)?)\s*(g|grammi|ml|millilitri|porzion[ei])\s+di\s+([^\n?!:;,]+)\.?$/i.exec(message.trim())
  if (!match || /\b(?:oppure|forse|ipoteticamente|non|o|se|e)\b/i.test(match[5])) return false
  const [, day, meal, amount, unit, name] = match
  const actualDate = day?.toLowerCase() === 'ieri' ? new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10) : today
  const mealTypes: Record<string, ChatMealDraft['meal_type']> = {
    'a colazione': 'breakfast', 'a pranzo': 'lunch', 'a cena': 'dinner', 'come spuntino': 'snack',
  }
  const actualMeal = mealTypes[meal.toLowerCase()]
  const actualUnit = /^(g|grammi)$/i.test(unit) ? 'g' : /^(ml|millilitri)$/i.test(unit) ? 'ml' : 'portion'
  const food = draft.foods[0]
  return draft.date === actualDate && draft.meal_type === actualMeal && food.unit === actualUnit
    && food.amount === Number(amount.replace(',', '.')) && label(food.name) === label(name)
}
