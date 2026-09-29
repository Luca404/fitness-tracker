import { describe, expect, it } from 'vitest'
import { estimateCookedWeight, fractionOfPreparedDish } from './preparedDishes'
import type { DishItem } from '../types'

function ingredient(name: string, quantity_g: number, calories: number, category: DishItem['category']): DishItem {
  return { id: name, dish_id: 'dish', position: 0, food_name: name, quantity_g, calories,
    protein_g: 0, carbs_g: 0, fat_g: 0, category, food_key: null, source: 'basic', off_food_id: null, created_at: '' }
}

describe('prepared dish portions', () => {
  it('estimates the cooked weight from dry pasta and leaves sauce unchanged', () => {
    expect(estimateCookedWeight([
      ingredient('Pasta di semola', 200, 706, 'grain'),
      ingredient('Passata di pomodoro', 100, 30, 'sauce'),
    ])).toBe(600)
    expect(fractionOfPreparedDish(600, 1)).toBe(150)
    expect(fractionOfPreparedDish(600, 2)).toBe(300)
    expect(fractionOfPreparedDish(600, 3)).toBe(450)
  })

  it('does not cook an ingredient a second time when it is already cooked', () => {
    expect(estimateCookedWeight([ingredient('Pasta cotta', 200, 300, 'grain')])).toBe(200)
  })
})
