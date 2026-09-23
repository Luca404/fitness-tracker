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
    entries, items: [],
  }
}

describe('buildMealTimeline', () => {
  it('places a snack before dinner when it was registered earlier', () => {
    const timeline = buildMealTimeline([
      meal('breakfast', entry('breakfast', '2026-09-23T08:00:00Z')),
      meal('lunch', entry('lunch', '2026-09-23T12:00:00Z')),
      meal('dinner', entry('dinner', '2026-09-23T20:00:00Z')),
      meal('snack', entry('snack', '2026-09-23T16:00:00Z')),
    ])

    expect(timeline.map(group => group.type)).toEqual(['breakfast', 'lunch', 'snack', 'dinner'])
  })

  it('splits snacks around dinner and keeps each registration in time order', () => {
    const timeline = buildMealTimeline([
      meal('dinner', entry('dinner', '2026-09-23T20:00:00Z')),
      meal('snack',
        entry('late-snack', '2026-09-23T22:00:00Z'),
        entry('early-snack', '2026-09-23T16:00:00Z'),
        entry('second-early-snack', '2026-09-23T17:00:00Z')),
    ])

    expect(timeline.map(group => [group.type, group.entries.map(item => item.id)])).toEqual([
      ['snack', ['early-snack', 'second-early-snack']],
      ['dinner', ['dinner']],
      ['snack', ['late-snack']],
    ])
  })

  it('uses a deterministic order when two entries have the same timestamp', () => {
    const timestamp = '2026-09-23T16:00:00Z'
    const timeline = buildMealTimeline([
      meal('snack', entry('snack-b', timestamp), entry('snack-a', timestamp)),
    ])

    expect(timeline[0].entries.map(item => item.id)).toEqual(['snack-a', 'snack-b'])
  })

  it('keeps breakfast, lunch and dinner in their usual order if logged late', () => {
    const timeline = buildMealTimeline([
      meal('dinner', entry('dinner', '2026-09-23T12:00:00Z')),
      meal('breakfast', entry('breakfast', '2026-09-23T20:00:00Z')),
      meal('lunch', entry('lunch', '2026-09-23T21:00:00Z')),
    ])

    expect(timeline.map(group => group.type)).toEqual(['breakfast', 'lunch', 'dinner'])
  })

  it('can place a snack between two dinner registrations', () => {
    const timeline = buildMealTimeline([
      meal('dinner',
        entry('first-course', '2026-09-23T19:00:00Z'),
        entry('dessert', '2026-09-23T21:00:00Z')),
      meal('snack', entry('snack', '2026-09-23T20:00:00Z')),
    ])

    expect(timeline.map(group => [group.type, group.entries.map(item => item.id)])).toEqual([
      ['dinner', ['first-course']],
      ['snack', ['snack']],
      ['dinner', ['dessert']],
    ])
  })
})
