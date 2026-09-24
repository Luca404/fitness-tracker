import type { Dish, DishMealType } from '../types'

export const DISH_MEAL_TYPES: { id: DishMealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Colazione', icon: '☀️' },
  { id: 'lunch', label: 'Pranzo', icon: '🍽️' },
  { id: 'dinner', label: 'Cena', icon: '🌙' },
  { id: 'snack', label: 'Spuntino', icon: '🍎' },
]

export function dishMealTypeLabels(types: DishMealType[]): string {
  return DISH_MEAL_TYPES.filter(type => types.includes(type.id)).map(type => type.label).join(' · ')
}

export function dishesForMeal<T extends Pick<Dish, 'meal_types'>>(dishes: T[], mealType: DishMealType): T[] {
  return dishes.filter(dish => dish.meal_types.includes(mealType))
}
