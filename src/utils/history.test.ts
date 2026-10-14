import { describe, expect, it } from 'vitest'
import type { GymSession, Workout } from '../types'
import { buildHistoryData } from './history'

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
      { date: '13/10', Mangiato: 0, Bruciato: 0 },
      { date: '14/10', Mangiato: 0, Bruciato: 404.25 },
    ])
  })

  it('uses the historical body weight and supports gym-only days across the full range', () => {
    const result = buildHistoryData('2026-10-01', '2026-10-30', [], [], [session], [
      { id: 'old', user_id: 'user', date: '2026-09-30', weight_kg: 80, notes: null, created_at: '' },
      { id: 'future', user_id: 'user', date: '2026-10-15', weight_kg: 60, notes: null, created_at: '' },
    ], 60)
    expect(result).toHaveLength(30)
    expect(result.find(day => day.date === '14/10')?.Bruciato).toBe(304)
    expect(result.reduce((sum, day) => sum + day.Bruciato, 0) / result.length).toBeCloseTo(304 / 30)
  })
})
