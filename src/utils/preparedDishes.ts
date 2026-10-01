import type { DishItem } from '../types'
import { roundToTwo } from './decimal'

type Ingredient = Pick<DishItem, 'food_name' | 'food_key' | 'category' | 'quantity_g' | 'calories'> & { unit?: 'g' | 'ml' }

function cookedWeightFactor(item: Ingredient): number {
  if (item.unit === 'ml') return 1
  const name = item.food_name.toLocaleLowerCase('it')
  if (/\b(cott[oaie]|pront[oaie]|bollit[oaie])\b/.test(name)) return 1
  const caloriesPer100g = item.quantity_g > 0 ? item.calories * 100 / item.quantity_g : 0
  if (caloriesPer100g < 250) return 1
  const key = item.food_key ?? ''
  if (item.category === 'grain' && (/\b(pasta|spaghetti|penne|fusilli|riso|rice|couscous|quinoa)\b/.test(name)
    || /basic:(pasta|riso|couscous|quinoa)/.test(key))) return 2.5
  if (item.category === 'legume' && /\b(secch[ioa]|dry)\b/.test(name)) return 2.3
  return 1
}

export function estimateCookedWeight(items: Ingredient[]): number {
  return Math.max(1, roundToTwo(items.reduce((sum, item) => sum + item.quantity_g * cookedWeightFactor(item), 0)))
}

export function fractionOfPreparedDish(totalCookedG: number, numerator: 1 | 2 | 3): number {
  return roundToTwo(totalCookedG * numerator / 4)
}
