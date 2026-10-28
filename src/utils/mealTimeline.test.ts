import { describe, expect, it } from 'vitest'
import type { Meal, MealEntry, MealType } from '../types'
import { buildMealTimeline } from './mealTimeline'

function entry(id: string, createdAt: string): MealEntry {
  return { id, meal_id: `meal-${id}`, name: id, created_at: createdAt, items: [] }
}

function meal(type: MealType, ...entries: MealEntry[]): Meal {
  return {
    id: `meal-${type}`, user_id: 'user-1', date: '2026-09-23',
    meal_type: type, name: null, created_at: entries[0]?.created_at ?? '',
    entries,
  }
}

describe('buildMealTimeline', () => {
  it('shows the day from the latest meal back to breakfast, with afternoon snacks below dinner', () => {
    const timeline = buildMealTimeline([
      meal('breakfast', entry('breakfast', '2026-09-23T08:00:00Z')),
      meal('lunch', entry('lunch', '2026-09-23T12:00:00Z')),
      meal('dinner', entry('dinner', '2026-09-23T20:00:00Z')),
      meal('snack', entry('snack', '2026-09-23T16:00:00Z')),
    ])

    expect(timeline.map(group => group.type)).toEqual(['dinner', 'snack', 'lunch', 'breakfast'])
  })

  it('places snacks around dinner with the latest registration first', () => {
    const timeline = buildMealTimeline([
      meal('dinner', entry('dinner', '2026-09-23T20:00:00Z')),
      meal('snack',
        entry('late-snack', '2026-09-23T22:00:00Z'),
        entry('early-snack', '2026-09-23T16:00:00Z'),
        entry('second-early-snack', '2026-09-23T17:00:00Z')),
    ])

    expect(timeline.map(group => [group.type, group.entries.map(item => item.id)])).toEqual([
      ['snack', ['late-snack']],
      ['dinner', ['dinner']],
      ['snack', ['second-early-snack', 'early-snack']],
    ])
  })

  it('uses a deterministic order when two entries have the same timestamp', () => {
    const timestamp = '2026-09-23T16:00:00Z'
    const timeline = buildMealTimeline([
      meal('snack', entry('snack-b', timestamp), entry('snack-a', timestamp)),
    ])

    expect(timeline[0].entries.map(item => item.id)).toEqual(['snack-b', 'snack-a'])
  })

  it('keeps meal order reversed even when a main meal is logged late', () => {
    const timeline = buildMealTimeline([
      meal('dinner', entry('dinner', '2026-09-23T12:00:00Z')),
      meal('breakfast', entry('breakfast', '2026-09-23T20:00:00Z')),
      meal('lunch', entry('lunch', '2026-09-23T21:00:00Z')),
    ])

    expect(timeline.map(group => group.type)).toEqual(['dinner', 'lunch', 'breakfast'])
  })

  it('keeps late dinner additions in one dinner below the post-dinner snack', () => {
    const timeline = buildMealTimeline([
      meal('dinner',
        entry('first-course', '2026-09-23T19:00:00Z'),
        entry('dessert', '2026-09-23T21:00:00Z')),
      meal('snack', entry('snack', '2026-09-23T20:00:00Z')),
    ])

    expect(timeline.map(group => [group.type, group.entries.map(item => item.id)])).toEqual([
      ['snack', ['snack']],
      ['dinner', ['dessert', 'first-course']],
    ])
  })

  it('does not move an afternoon snack when lunch gets a late addition or mutate stored order', () => {
    const meals = [
      meal('lunch', entry('lunch', '2026-09-23T12:00:00Z'), entry('late-lunch-addition', '2026-09-23T22:00:00Z')),
      meal('dinner', entry('dinner', '2026-09-23T20:00:00Z')),
      meal('snack', entry('afternoon-snack', '2026-09-23T16:00:00Z')),
    ]
    const original = structuredClone(meals)
    expect(buildMealTimeline(meals).map(group => [group.type, group.entries.map(item => item.id)])).toEqual([
      ['dinner', ['dinner']],
      ['snack', ['afternoon-snack']],
      ['lunch', ['late-lunch-addition', 'lunch']],
    ])
    expect(meals).toEqual(original)
    expect(buildMealTimeline([])).toEqual([])
  })
})
