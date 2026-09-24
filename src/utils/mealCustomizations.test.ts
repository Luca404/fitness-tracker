import { describe, expect, it } from 'vitest'
import { splitMealItems } from './mealCustomizations'

describe('meal customizations', () => {
  it('keeps added ingredients distinct even if a base ingredient loses its recipe link', () => {
    const items = [
      { food_name: 'Pasta', dish_item_id: null, is_customization: false },
      { food_name: 'Parmigiano', dish_item_id: null, is_customization: true },
    ]
    const { baseItems, addedItems } = splitMealItems(items)
    expect(baseItems.map(item => item.food_name)).toEqual(['Pasta'])
    expect(addedItems.map(item => item.food_name)).toEqual(['Parmigiano'])
  })
})
