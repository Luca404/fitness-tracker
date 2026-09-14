import type { Dish, DishItem, PantryItem } from '../types'

const NAME_ALIASES: Record<string, string> = {
  'olio evo': 'olio extravergine oliva',
  'olio extravergine di oliva': 'olio extravergine oliva',
  'petto di pollo': 'pollo',
  'petto pollo': 'pollo',
  'pomodoro fresco': 'pomodoro',
  'pomodori freschi': 'pomodoro',
}

export function normalizeIngredientName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(cotto|cotta|cotti|cotte|crudo|cruda|fresco|fresca|freschi|fresche|sgocciolato)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return NAME_ALIASES[normalized] ?? normalized
}

function pantryHasIngredient(item: DishItem, pantry: PantryItem[]) {
  return pantry.some(pantryItem => {
    if (pantryItem.quantity <= 0) return false
    if (item.food_key && pantryItem.food_key) return item.food_key === pantryItem.food_key
    return normalizeIngredientName(item.food_name) === normalizeIngredientName(pantryItem.name)
  })
}

export interface DishAvailability {
  available: DishItem[]
  missing: DishItem[]
  ratio: number
}

export function getDishAvailability(dish: Dish, pantry: PantryItem[]): DishAvailability {
  const uniqueItems = dish.items.filter((item, index, items) => {
    const key = item.food_key ?? normalizeIngredientName(item.food_name)
    return items.findIndex(candidate =>
      (candidate.food_key ?? normalizeIngredientName(candidate.food_name)) === key
    ) === index
  })
  const available = uniqueItems.filter(item => pantryHasIngredient(item, pantry))
  const missing = uniqueItems.filter(item => !pantryHasIngredient(item, pantry))

  return {
    available,
    missing,
    ratio: uniqueItems.length > 0 ? available.length / uniqueItems.length : 0,
  }
}
