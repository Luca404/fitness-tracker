import { FOOD_CATEGORY_BY_ID } from '../data/foodCategories'
import type { FoodCategory } from '../types'

export function getFoodIcon(items: Array<{ category: FoodCategory }>): string {
  const category = items[0]?.category ?? 'other'
  return FOOD_CATEGORY_BY_ID[category]?.icon ?? FOOD_CATEGORY_BY_ID.other.icon
}

export function getDishIcon(dish: { icon: string | null; items: Array<{ category: FoodCategory }> }): string {
  return dish.icon || getFoodIcon(dish.items)
}
