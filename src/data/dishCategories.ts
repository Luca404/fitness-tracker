import type { Dish, DishCategory, DishMealType } from '../types'

export const DISH_CATEGORIES: { id: DishCategory; label: string }[] = [
  { id: 'pasta', label: 'Pasta' },
  { id: 'rice', label: 'Riso' },
  { id: 'vegetables', label: 'Verdure' },
  { id: 'meat', label: 'Carne' },
  { id: 'fish', label: 'Pesce' },
  { id: 'vegan_main', label: 'Secondo piatto vegano' },
  { id: 'toast', label: 'Toast' },
  { id: 'yogurt', label: 'Yogurt' },
  { id: 'soup', label: 'Zuppe' },
  { id: 'dessert', label: 'Dolci' },
  { id: 'beverages', label: 'Bevande' },
]

const priorities: Record<DishMealType, DishCategory[]> = {
  breakfast: ['beverages', 'toast'],
  lunch: ['rice', 'pasta', 'meat', 'fish'],
  dinner: ['rice', 'pasta', 'meat', 'fish'],
  snack: ['beverages', 'yogurt'],
}

export function dishCategoriesForMeal(mealType?: DishMealType) {
  const preferred = mealType ? priorities[mealType] : []
  return [...DISH_CATEGORIES].sort((a, b) => {
    const rank = (id: DishCategory) => preferred.includes(id) ? preferred.indexOf(id) : preferred.length
    return rank(a.id) - rank(b.id)
  })
}

export type DishCategoryFilter = DishCategory | 'all' | 'uncategorized'

export function dishCategoryLabels(categories: DishCategory[] = []): string {
  return DISH_CATEGORIES.filter(category => categories.includes(category.id)).map(category => category.label).join(' · ')
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT').trim()

export function matchesDish(dish: Pick<Dish, 'name' | 'categories'>, query: string, category: DishCategoryFilter): boolean {
  const categories = dish.categories ?? []
  if (category === 'uncategorized' ? categories.length > 0 : category !== 'all' && !categories.includes(category)) return false
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  const text = normalize(`${dish.name} ${dishCategoryLabels(categories)}`)
  return terms.every(term => text.includes(term))
}

export function orderDishesByUsage(dishes: Dish[]): Dish[] {
  return [...dishes].sort((a, b) => (b.recent_use_count ?? 0) - (a.recent_use_count ?? 0)
    || (b.last_used_on ?? '').localeCompare(a.last_used_on ?? '')
    || a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }) || a.id.localeCompare(b.id))
}
