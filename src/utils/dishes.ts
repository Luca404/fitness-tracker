import type { Dish, DishItem, DishItemDraft } from '../types'
import { nutritionTotals } from './nutrition'

export function dishTotals(dish: Dish) { return nutritionTotals(dish.items) }

export function dishItemToDraft(item: DishItem): DishItemDraft {
  return {
    id: item.id,
    food_name: item.food_name,
    quantity_g: item.quantity_g,
    unit: item.unit ?? 'g',
    piece_count: item.piece_count ?? null,
    piece_size: item.piece_size ?? null,
    calories: item.calories,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fiber_g: item.fiber_g ?? null,
    sugars_g: item.sugars_g ?? null,
    salt_g: item.salt_g ?? null,
    source: item.source,
    off_food_id: item.off_food_id,
    category: item.category,
    food_key: item.food_key,
    pantry_item_id: item.pantry_item_id ?? null,
  }
}
