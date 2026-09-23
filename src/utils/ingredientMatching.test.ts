import { describe, expect, it } from 'vitest'
import { getDishAvailability, normalizeIngredientName } from './ingredientMatching'
import type { Dish, DishItem, PantryItem } from '../types'

const item = (food_name: string, food_key: string | null = null): DishItem => ({
  id: food_name, dish_id: 'dish-1', position: 0, food_name, food_key, category: 'other', quantity_g: 100,
  calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, source: 'basic', off_food_id: null, created_at: '',
})

const pantryItem = (name: string, food_key: string | null = null): PantryItem => ({
  id: name, user_id: 'user-1', name, food_key, category: 'other', quantity: 100, unit: 'g',
  calories_100g: 0, protein_100g: 0, carbs_100g: 0, fat_100g: 0,
  source: 'basic', off_food_id: null, created_at: '',
})

describe('ingredient matching', () => {
  it('normalizes accents and preparation details', () => {
    expect(normalizeIngredientName('Caffè (nero)')).toBe('caffe')
    expect(normalizeIngredientName('Petto di pollo (cotto)')).toBe('pollo')
  })

  it('prefers stable keys and reports missing ingredients', () => {
    const dish: Dish = {
      id: 'dish-1', user_id: 'user-1', name: 'Pasta al sugo', icon: null, created_at: '', updated_at: '',
      items: [item('Pasta', 'basic:pasta-semola-cotta'), item('Sugo', 'basic:sugo-pomodoro')],
    }
    const result = getDishAvailability(dish, [pantryItem('Pasta di semola', 'basic:pasta-semola-cotta')])

    expect(result.ratio).toBe(0.5)
    expect(result.available[0].food_name).toBe('Pasta')
    expect(result.missing[0].food_name).toBe('Sugo')
  })
})
