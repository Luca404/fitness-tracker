import type { DishItemDraft, MealEntry } from '../types'
import { scaleIngredient } from './nutrition'

export function isMealPhotoEntry(entry: Pick<MealEntry, 'items'>): boolean {
  return entry.items.some(item => item.source === 'ai_meal_photo')
}

export function consumedPhotoItems(items: DishItemDraft[], percentage: number): DishItemDraft[] {
  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) return []
  return items.map(item => scaleIngredient(item, item.quantity_g * percentage / 100))
}
