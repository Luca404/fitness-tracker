import { FOOD_CATEGORY_BY_ID } from '../data/foodCategories'
import type { FoodCategory } from '../types'

export function getFoodIcon(items: Array<{ category: FoodCategory }>): string {
  const category = items[0]?.category ?? 'other'
  return FOOD_CATEGORY_BY_ID[category]?.icon ?? FOOD_CATEGORY_BY_ID.other.icon
}
