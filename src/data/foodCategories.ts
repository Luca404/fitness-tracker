import type { FoodCategory } from '../types'

export const FOOD_CATEGORIES: Array<{
  id: FoodCategory
  label: string
  icon: string
}> = [
  { id: 'grain', label: 'Pasta, riso e cereali', icon: '🍝' },
  { id: 'legume', label: 'Legumi', icon: '🫘' },
  { id: 'vegetable', label: 'Verdure', icon: '🥬' },
  { id: 'fruit', label: 'Frutta', icon: '🍎' },
  { id: 'meat', label: 'Carne', icon: '🥩' },
  { id: 'fish', label: 'Pesce', icon: '🐟' },
  { id: 'egg', label: 'Uova', icon: '🥚' },
  { id: 'dairy', label: 'Latte e formaggi', icon: '🧀' },
  { id: 'sauce', label: 'Sughi', icon: '🍅' },
  { id: 'condiment', label: 'Oli, salse e condimenti', icon: '🥫' },
  { id: 'fat', label: 'Altri grassi', icon: '🫒' },
  { id: 'seasoning', label: 'Spezie ed erbe', icon: '🌿' },
  { id: 'sweet', label: 'Dolci', icon: '🍫' },
  { id: 'beverage', label: 'Bevande', icon: '🥤' },
  { id: 'alcohol', label: 'Alcolici', icon: '🍷' },
  { id: 'other', label: 'Altro', icon: '📦' },
]

export const FOOD_CATEGORY_BY_ID = Object.fromEntries(
  FOOD_CATEGORIES.map(category => [category.id, category])
) as Record<FoodCategory, (typeof FOOD_CATEGORIES)[number]>
