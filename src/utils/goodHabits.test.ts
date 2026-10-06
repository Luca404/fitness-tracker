import { describe, expect, it } from 'vitest'
import type { Meal, MealItem } from '../types'
import { calculateHabitRows, habitExcessLabel, habitStatus, habitTileFill, habitWindow, summarizeHabitRows } from './goodHabits'

function meal(date: string, items: Array<Partial<MealItem> & Pick<MealItem, 'category' | 'quantity_g'>>): Meal {
  return {
    id: `meal-${date}`,
    user_id: 'user-1',
    date,
    meal_type: 'lunch',
    name: null,
    created_at: '',
    entries: [{ id: 'entry-1', meal_id: `meal-${date}`, name: 'Pasto', created_at: '',
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
    }],
  }
}

const targets = { vegetables: 400, fruit: 360, legumes: 450, fish: 300, fiber: 25, salt: 5, sugars: 75, alcohol: 1 }

describe('good habits calculations', () => {
  it('uses seven calendar days ending on the selected date across month and year boundaries', () => {
    expect(habitWindow('2026-10-05')).toEqual({ from: '2026-09-29', to: '2026-10-05' })
    expect(habitWindow('2027-01-03')).toEqual({ from: '2026-12-28', to: '2027-01-03' })
    expect(habitWindow('2026-03-30')).toEqual({ from: '2026-03-24', to: '2026-03-30' })
  })

  it('retains previous-week food, excludes older and future meals, and replaces the selected-day snapshot', () => {
    const weekly = [
      meal('2026-09-28', [{ category: 'legume', quantity_g: 999 }]),
      meal('2026-09-29', [{ category: 'legume', quantity_g: 150 }]),
      meal('2026-10-04', [{ category: 'fish', quantity_g: 300 }]),
      meal('2026-10-05', [{ category: 'legume', quantity_g: 999 }]),
      meal('2026-10-06', [{ category: 'fish', quantity_g: 999 }]),
    ]
    const rows = calculateHabitRows('2026-10-05', [meal('2026-10-05', [{ category: 'legume', quantity_g: 300 }])], weekly, targets)
    expect(rows.find(row => row.label === 'Legumi')).toMatchObject({ value: 450, target: 450, period: 'ultimi 7 giorni' })
    expect(rows.find(row => row.label === 'Pesce')).toMatchObject({ value: 300, target: 300, period: 'ultimi 7 giorni' })
  })
  it('shows limit multiples without misleading rounding or division by zero', () => {
    const row = { label: 'Sale', icon: '🧂', value: 10, target: 5, period: 'oggi' as const, direction: 'max' as const }
    expect(habitExcessLabel(row)).toBe('2x')
    expect(habitExcessLabel({ ...row, value: 15 })).toBe('3x')
    expect(habitExcessLabel({ ...row, value: 6 })).toBe('1.2x')
    expect(habitExcessLabel({ ...row, value: 5.01 })).toBe('>1x')
    expect(habitExcessLabel({ ...row, partial: true })).toBe('≥2x')
    expect(habitExcessLabel({ ...row, value: 5 })).toBeNull()
    expect(habitExcessLabel({ ...row, value: null })).toBeNull()
    expect(habitExcessLabel({ ...row, target: 0 })).toBe('↑')
    expect(habitExcessLabel({ ...row, target: 0, value: 0 })).toBeNull()
    expect(habitExcessLabel({ ...row, direction: 'min' })).toBeNull()
  })
  it('compares total sugars with the total-sugars target and includes them in the summary', () => {
    const low = calculateHabitRows('2026-09-21', [meal('2026-09-21', [
      { category: 'fruit', quantity_g: 360, sugars_g: 2 },
    ])], [], targets)
    const high = calculateHabitRows('2026-09-21', [meal('2026-09-21', [
      { category: 'fruit', quantity_g: 360, sugars_g: 200 },
    ])], [], targets)
    const sugarRow = high.find(row => row.label === 'Zuccheri totali')!
    expect(sugarRow).toMatchObject({ value: 200, direction: 'max', target: 75 })
    expect(habitStatus(sugarRow)).toBe('attention')
    expect(habitTileFill(sugarRow)).toBe(100)
    expect(summarizeHabitRows(high).needsAttention).toBe(summarizeHabitRows(low).needsAttention + 1)
  })

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
    expect(rows.find(row => row.label === 'Zuccheri totali')).toMatchObject({ value: null, partial: false })
    expect(rows.find(row => row.label === 'Sale')).toMatchObject({ value: null, partial: false })
  })

  it('summarizes only measurable habits as either in line or needing attention', () => {
    const rows = calculateHabitRows('2026-09-21', [meal('2026-09-21', [
      { category: 'vegetable', quantity_g: 450, salt_g: 6 },
    ])], [], targets)

    expect(summarizeHabitRows(rows)).toEqual({
      ok: 2,
      needsAttention: 4,
      incomplete: 2,
    })
  })

  it('uses a neutral tile when a partial nutrient value cannot establish the result', () => {
    expect(habitStatus({ label: 'Fibre', icon: '🌾', value: 10, target: 25, period: 'oggi', direction: 'min', partial: true })).toBe('incomplete')
    expect(habitStatus({ label: 'Fibre', icon: '🌾', value: 30, target: 25, period: 'oggi', direction: 'min', partial: true })).toBe('ok')
    expect(habitStatus({ label: 'Sale', icon: '🧂', value: 6, target: 5, period: 'oggi', direction: 'max', partial: true })).toBe('attention')
  })

  it('fills minimum goals toward the target and maximum goals only after exceeding it', () => {
    const row = { label: 'Verdura', icon: '🥬', value: 200, target: 400, period: 'oggi' as const, direction: 'min' as const }
    expect(habitTileFill(row)).toBe(50)
    expect(habitTileFill({ ...row, value: 500 })).toBe(100)
    expect(habitTileFill({ ...row, value: null })).toBe(0)

    const maximum = { ...row, label: 'Sale', target: 5, direction: 'max' as const }
    expect(habitTileFill({ ...maximum, value: 4 })).toBe(0)
    expect(habitTileFill({ ...maximum, value: 6 })).toBe(20)
    expect(habitTileFill({ ...maximum, value: 11 })).toBe(100)
  })
})
