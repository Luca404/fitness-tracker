import { describe, expect, it } from 'vitest'
import type { Dish } from '../types'
import { DISH_CATEGORIES, dishCategoriesForMeal, matchesDish, orderDishesByUsage } from './dishCategories'
const recipe = { name: 'Risò al limone', categories: ['rice', 'vegetables'] } as Pick<Dish, 'name' | 'categories'>
describe('finding saved dishes', () => {
  it('combines secondary category with accent-insensitive multiword search', () => {
    expect(matchesDish(recipe, 'riso verdùre', 'rice')).toBe(true)
    expect(matchesDish(recipe, ' LIMONE ', 'vegetables')).toBe(true)
    expect(matchesDish(recipe, 'riso', 'pasta')).toBe(false)
    expect(matchesDish(recipe, 'pasta', 'all')).toBe(false)
  })
  it('retains older uncategorized dishes and lets users find them', () => {
    expect(matchesDish({ name: 'Vecchia ricetta' }, '', 'all')).toBe(true)
    expect(matchesDish({ name: 'Vecchia ricetta' }, '', 'uncategorized')).toBe(true)
    expect(matchesDish(recipe, '', 'uncategorized')).toBe(false)
  })
  it('prioritizes frequency in the recent window, then last use and name, without changing input', () => {
    const dishes = [
      { id: 'unused', name: 'A', recent_use_count: 0 },
      { id: 'recent', name: 'Riso', recent_use_count: 2, last_used_on: '2026-11-05' },
      { id: 'frequent', name: 'Toast', recent_use_count: 5, last_used_on: '2026-11-01' },
      { id: 'older', name: 'B', recent_use_count: 2, last_used_on: '2026-11-04' },
      { id: 'tie', name: 'Pasta', recent_use_count: 2, last_used_on: '2026-11-05' },
    ] as Dish[]
    expect(orderDishesByUsage(dishes).map(d => d.id)).toEqual(['frequent', 'tie', 'recent', 'older', 'unused'])
    expect(dishes[0].id).toBe('unused')
  })
})

describe('meal-aware secondary categories', () => {
  it('puts the requested categories first without hiding other types', () => {
    expect(dishCategoriesForMeal('breakfast').slice(0, 2).map(c => c.id)).toEqual(['beverages', 'toast'])
    expect(dishCategoriesForMeal('snack').slice(0, 2).map(c => c.id)).toEqual(['beverages', 'yogurt'])
    for (const meal of ['lunch', 'dinner'] as const) {
      expect(dishCategoriesForMeal(meal).slice(0, 4).map(c => c.id)).toEqual(['rice', 'pasta', 'meat', 'fish'])
      expect(dishCategoriesForMeal(meal).map(c => c.id)).toContain('vegan_main')
      expect(dishCategoriesForMeal(meal)).toHaveLength(11)
    }
  })
  it('removes ingredient-only labels and retains the new dish types in search', () => {
    expect(DISH_CATEGORIES.some(c => ['legumes', 'eggs', 'dairy', 'pizza'].includes(c.id))).toBe(false)
    expect(matchesDish({ name: 'Polpette', categories: ['vegan_main'] }, 'vegano', 'all')).toBe(true)
    expect(matchesDish({ name: 'Ciotola', categories: ['yogurt'] }, 'yogurt', 'all')).toBe(true)
  })
})
