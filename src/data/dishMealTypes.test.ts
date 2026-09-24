import { describe, expect, it } from 'vitest'
import { dishesForMeal } from './dishMealTypes'
import type { DishMealType } from '../types'

describe('saved dish meal categories', () => {
  it('shows a dish in every selected meal and hides it elsewhere', () => {
    const dishes: { name: string; meal_types: DishMealType[] }[] = [
      { name: 'Yogurt', meal_types: ['breakfast', 'snack'] },
      { name: 'Pasta', meal_types: ['lunch', 'dinner'] },
    ]
    expect(dishesForMeal(dishes, 'breakfast').map(dish => dish.name)).toEqual(['Yogurt'])
    expect(dishesForMeal(dishes, 'snack').map(dish => dish.name)).toEqual(['Yogurt'])
    expect(dishesForMeal(dishes, 'dinner').map(dish => dish.name)).toEqual(['Pasta'])
  })
})
