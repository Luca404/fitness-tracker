import { describe, expect, it } from 'vitest'
import type { GymSession, Meal, Workout } from '../types'
import { buildHistoryData, historyAverage, historyWindow } from './history'

const session: GymSession = {
  id: 'gym-1', user_id: 'user', date: '2026-10-14', plan_id: null, plan_name: 'Scheda A',
  started_at: '2026-10-14T10:00:00Z', completed_at: '2026-10-14T11:00:00Z',
  sets: [{ id: 'set', session_id: 'gym-1', exercise_position: 0, exercise_key: 'bench-press',
    exercise_name: 'Panca', equipment: 'Bilanciere', set_number: 1, target_reps: 10,
    target_reps_max: null, per_side: false, weight_kg: 40, reps: 10, done: true }],
}
const walking: Workout = { id: 'walk-1', user_id: 'user', date: '2026-10-14', activity: 'walking',
  duration_min: 30, distance_km: null, calories_burned: 100.25, notes: null, created_at: '' }

describe('history calories', () => {
  it('adds completed gym sessions and ordinary activities without counting active sessions', () => {
    const result = buildHistoryData('2026-10-13', '2026-10-14', [], [walking], [session,
      { ...session, id: 'active', completed_at: null },
      { ...session, id: 'empty', sets: [] }], [], 80)
    expect(result).toEqual([
      { date: '13/10', Mangiato: null, Bruciato: null },
      { date: '14/10', Mangiato: null, Bruciato: 404.25 },
    ])
  })

  it('uses the historical body weight and supports gym-only days across the full range', () => {
    const result = buildHistoryData('2026-10-01', '2026-10-30', [], [], [session], [
      { id: 'old', user_id: 'user', date: '2026-09-30', weight_kg: 80, notes: null, created_at: '' },
      { id: 'future', user_id: 'user', date: '2026-10-15', weight_kg: 60, notes: null, created_at: '' },
    ], 60)
    expect(result).toHaveLength(30)
    expect(result.find(day => day.date === '14/10')?.Bruciato).toBe(304)
    expect(historyAverage(result, 'Bruciato')).toEqual({ value: 304, days: 1 })
    expect(historyAverage(result, 'Mangiato')).toEqual({ value: null, days: 0 })
  })

  it('excludes zero-calorie food days from intake averages and wholly empty days from both averages', () => {
    const meals = [
      { date: '2026-10-11', entries: [] },
      { date: '2026-10-12', entries: [{ items: [{ calories: 0 }] }] },
      { date: '2026-10-13', entries: [{ items: [{ calories: 1800 }] }] },
      { date: '2026-10-14', entries: [{ items: [{ calories: 2000 }, { calories: 200 }] }] },
    ] as Meal[]
    const result = buildHistoryData('2026-10-10', '2026-10-14', meals, [walking], [], [], 80)
    expect(result.slice(0, 3).every(day => day.Mangiato === null && day.Bruciato === null)).toBe(true)
    expect(historyAverage(result, 'Mangiato')).toEqual({ value: 2000, days: 2 })
    expect(result[3].Bruciato).toBe(0)
    expect(historyAverage(result, 'Bruciato')).toEqual({ value: 50.125, days: 2 })
  })

  it('does not count active or unestimable gym sessions as recorded activity', () => {
    const result = buildHistoryData('2026-10-14', '2026-10-14', [], [], [
      { ...session, id: 'active', completed_at: null }, session,
    ], [], null)
    expect(result[0]).toEqual({ date: '14/10', Mangiato: null, Bruciato: null })
  })

  it('retains an explicitly recorded zero-calorie activity', () => {
    const result = buildHistoryData('2026-10-14', '2026-10-14', [], [{ ...walking, calories_burned: 0 }], [], [], null)
    expect(historyAverage(result, 'Bruciato')).toEqual({ value: 0, days: 1 })
  })

  it.each([
    ['2026-10-16', 7, '2026-10-09', '2026-10-15'],
    ['2026-10-16', 30, '2026-09-16', '2026-10-15'],
    ['2026-01-01', 7, '2025-12-25', '2025-12-31'],
    ['2024-03-01', 7, '2024-02-23', '2024-02-29'],
    ['2026-10-26', 7, '2026-10-19', '2026-10-25'],
  ] as const)('uses complete calendar days before %s for a %s-day window', (today, days, from, to) => {
    expect(historyWindow(today, days)).toEqual({ from, to })
  })
})
