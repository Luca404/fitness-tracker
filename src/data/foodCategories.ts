import type { FoodCategory } from '../types'

export const FOOD_CATEGORIES: Array<{
  id: FoodCategory
  label: string
  icon: string
}> = [
  { id: 'grain', label: 'Pasta, riso e cereali', icon: '🍚' },
  { id: 'bakery', label: 'Pane e prodotti da forno', icon: '🥖' },
  { id: 'legume', label: 'Legumi', icon: '🫘' },
  { id: 'vegetable', label: 'Verdure', icon: '🥬' },
  { id: 'fruit', label: 'Frutta', icon: '🍎' },
  { id: 'nuts_seeds', label: 'Frutta secca e semi', icon: '🥜' },
  { id: 'meat', label: 'Carne', icon: '🥩' },
  { id: 'fish', label: 'Pesce', icon: '🐟' },
  { id: 'egg', label: 'Uova', icon: '🥚' },
  { id: 'plant_protein', label: 'Proteine vegetali', icon: '🌱' },
  { id: 'dairy', label: 'Latte, yogurt e formaggi', icon: '🧀' },
  { id: 'spread', label: 'Creme spalmabili e confetture', icon: '🍯' },
  { id: 'sauce', label: 'Sughi e basi da cucina', icon: '🍅' },
  { id: 'condiment', label: 'Salse e condimenti', icon: '🥫' },
  { id: 'fat', label: 'Oli e grassi', icon: '🫒' },
  { id: 'seasoning', label: 'Spezie ed erbe', icon: '🌿' },
  { id: 'sweet', label: 'Dolci e dessert', icon: '🍫' },
  { id: 'snack', label: 'Snack salati', icon: '🍿' },
  { id: 'prepared', label: 'Piatti pronti', icon: '🥘' },
  { id: 'supplement', label: 'Integratori', icon: '💊' },
  { id: 'beverage', label: 'Bevande', icon: '🥤' },
  { id: 'alcohol', label: 'Alcolici', icon: '🍷' },
  { id: 'other', label: 'Altro', icon: '📦' },
]

export const FOOD_CATEGORY_BY_ID = Object.fromEntries(
  FOOD_CATEGORIES.map(category => [category.id, category])
) as Record<FoodCategory, (typeof FOOD_CATEGORIES)[number]>
