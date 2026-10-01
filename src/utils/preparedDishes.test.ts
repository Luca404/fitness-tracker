import { describe, expect, it } from 'vitest'
import { defaultCookingMethod, estimateCookedWeight, fractionOfPreparedDish } from './preparedDishes'
import type { DishItem } from '../types'
import { BASIC_FOODS } from '../data/basicFoods'

function ingredient(name: string, quantity_g: number, calories: number, category: DishItem['category']): DishItem {
  return { id: name, dish_id: 'dish', position: 0, food_name: name, quantity_g, calories,
    protein_g: 0, carbs_g: 0, fat_g: 0, category, food_key: null, source: 'basic', off_food_id: null, created_at: '' }
}

describe('prepared dish portions', () => {
  it('estimates water uptake in pasta and reduction of tomato sauce', () => {
    expect(estimateCookedWeight([
      { ...ingredient('Pasta di semola', 200, 706, 'grain'), food_key: 'basic:pasta-semola' },
      ingredient('Passata di pomodoro', 100, 30, 'sauce'),
    ])).toBe(478)
    expect(fractionOfPreparedDish(478, 1)).toBe(119.5)
    expect(fractionOfPreparedDish(478, 2)).toBe(239)
    expect(fractionOfPreparedDish(478, 3)).toBe(358.5)
  })

  it('does not cook an ingredient a second time when it is already cooked', () => {
    expect(estimateCookedWeight([ingredient('Pasta cotta', 200, 300, 'grain')])).toBe(200)
  })

  it('uses distinct yields for boiled and pan-cooked vegetables and poultry', () => {
    const carrots = { ...ingredient('Carote', 100, 41, 'vegetable'), food_key: 'basic:carote' }
    expect(estimateCookedWeight([carrots], ['boiled'])).toBe(87)
    expect(estimateCookedWeight([carrots], ['pan'])).toBe(38)
    expect(estimateCookedWeight([
      { ...ingredient('Petto di tacchino', 400, 428, 'meat'), food_key: 'basic:petto-tacchino' },
      { ...ingredient('Peperoni', 500, 155, 'vegetable'), food_key: 'basic:peperoni' },
      { ...ingredient('Pomodori', 300, 54, 'vegetable'), food_key: 'basic:pomodori' },
    ])).toBe(850)
  })

  it('hydrates dry legumes but never hydrates canned and drained ones again', () => {
    const dry = { ...ingredient('Ceci secchi', 100, 378, 'legume'), food_key: 'basic:ceci-secchi' }
    const canned = { ...ingredient('Ceci in scatola, scolati', 100, 111, 'legume'), food_key: 'basic:ceci-scatola-scolati' }
    expect(defaultCookingMethod(dry)).toBe('boiled')
    expect(defaultCookingMethod(canned)).toBe('raw')
    expect(estimateCookedWeight([dry])).toBe(290)
    expect(estimateCookedWeight([canned])).toBe(100)
    expect(estimateCookedWeight([canned], ['boiled'])).toBe(100)
    expect(estimateCookedWeight([canned], ['pan'])).toBe(85)
  })

  it('provides a finite cooked-weight estimate for every basic food and cooking choice', () => {
    for (const food of BASIC_FOODS) {
      const item = { ...ingredient(food.name, 100, food.calories, food.category), food_key: `basic:${food.id}` }
      expect(['raw', 'boiled', 'pan']).toContain(defaultCookingMethod(item))
      for (const method of ['raw', 'boiled', 'pan'] as const) {
        const weight = estimateCookedWeight([item], [method])
        expect(Number.isFinite(weight) && weight > 0, `${food.id}: ${method}`).toBe(true)
      }
    }
  })

  it('keeps ready to eat meat and fish at their entered weight by default', () => {
    for (const [name, key, category] of [
      ['Prosciutto crudo', 'basic:prosciutto-crudo', 'meat'],
      ['Tonno al naturale (sgocciolato)', 'basic:tonno-naturale', 'fish'],
    ] as const) {
      const item = { ...ingredient(name, 100, 150, category), food_key: key }
      expect(defaultCookingMethod(item)).toBe('raw')
      expect(estimateCookedWeight([item])).toBe(100)
    }
  })
})
