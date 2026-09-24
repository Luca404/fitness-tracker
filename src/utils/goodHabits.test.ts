import { describe, expect, it } from 'vitest'
import type { Meal, MealItem } from '../types'
import { calculateHabitRows, habitStatus, summarizeHabitRows } from './goodHabits'

function meal(date: string, items: Array<Partial<MealItem> & Pick<MealItem, 'category' | 'quantity_g'>>): Meal {
  return {
    id: `meal-${date}`,
    user_id: 'user-1',
    date,
    meal_type: 'lunch',
    name: null,
    created_at: '',
    entries: [],
    items: items.map((item, index) => ({
      id: `item-${index}`,
      meal_id: `meal-${date}`,
      entry_id: 'entry-1',
      food_name: `Food ${index}`,
      unit: 'g',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      source: 'manual',
      off_food_id: null,
      food_key: null,
      created_at: '',
      ...item,
    })),
  }
}

const targets = { vegetables: 400, fruit: 360, legumes: 450, fish: 300, fiber: 25, sugars: 75, salt: 5 }

describe('good habits calculations', () => {
  it('combines daily nutrient totals with weekly food categories', () => {
    const current = meal('2026-09-21', [
      { category: 'vegetable', quantity_g: 200, fiber_g: 5, sugars_g: 4, salt_g: 0.3 },
      { category: 'grain', quantity_g: 100, fiber_g: 2, sugars_g: 1, salt_g: 0.1 },
    ])
    const previous = meal('2026-09-20', [{ category: 'legume', quantity_g: 150 }])
    const rows = calculateHabitRows('2026-09-21', [current], [previous], targets)

    expect(rows.find(row => row.label === 'Verdura')?.value).toBe(200)
    expect(rows.find(row => row.label === 'Legumi')?.value).toBe(150)
    expect(rows.find(row => row.label === 'Fibre')).toMatchObject({ value: 7, partial: false, direction: 'min' })
    expect(rows.find(row => row.label === 'Sale')).toMatchObject({ value: 0.4, partial: false, direction: 'max' })
  })

  it('marks incomplete nutrient totals as partial and never converts unknown to zero', () => {
    const current = meal('2026-09-21', [
      { category: 'vegetable', quantity_g: 100, fiber_g: 3 },
      { category: 'grain', quantity_g: 100 },
    ])
    const rows = calculateHabitRows('2026-09-21', [current], [], targets)

    expect(rows.find(row => row.label === 'Fibre')).toMatchObject({ value: 3, partial: true })
    expect(rows.find(row => row.label === 'Zuccheri')).toMatchObject({ value: null, partial: false })
    expect(rows.find(row => row.label === 'Sale')).toMatchObject({ value: null, partial: false })
  })

  it('summarizes only measurable habits as either in line or needing attention', () => {
    const rows = calculateHabitRows('2026-09-21', [meal('2026-09-21', [
      { category: 'vegetable', quantity_g: 450, salt_g: 6 },
    ])], [], targets)

    expect(summarizeHabitRows(rows)).toEqual({
      ok: 1,
      needsAttention: 4,
      incomplete: 2,
    })
  })

  it('uses a neutral tile when a partial nutrient value cannot establish the result', () => {
    expect(habitStatus({ label: 'Fibre', icon: '🌾', value: 10, target: 25, period: 'oggi', direction: 'min', partial: true })).toBe('incomplete')
    expect(habitStatus({ label: 'Fibre', icon: '🌾', value: 30, target: 25, period: 'oggi', direction: 'min', partial: true })).toBe('ok')
    expect(habitStatus({ label: 'Sale', icon: '🧂', value: 6, target: 5, period: 'oggi', direction: 'max', partial: true })).toBe('attention')
  })
})
