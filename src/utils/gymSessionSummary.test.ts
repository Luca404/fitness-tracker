import { describe, expect, it } from 'vitest'
import type { GymSession, GymSet, WeightLog } from '../types'
import {
  estimateGymSessionCalories, formatGymDuration, sessionDurationMinutes, weightForSessionDate,
} from './gymSessionSummary'

const set: GymSet = {
  id: 'set-1', session_id: 'session-1', exercise_position: 0,
  exercise_key: 'bench-press', exercise_name: 'Panca piana', equipment: 'Bilanciere',
  set_number: 1, target_reps: 10, target_reps_max: null, per_side: false,
  weight_kg: 40, reps: 10, done: true,
}

const session: GymSession = {
  id: 'session-1', user_id: 'user-1', plan_id: 'plan-1', plan_name: 'Scheda A',
  date: '2026-10-01', started_at: '2026-10-01T10:00:00Z', completed_at: '2026-10-01T11:00:00Z',
  sets: [set],
}

function weightLog(date: string, weightKg: number): WeightLog {
  return { id: date, user_id: 'user-1', date, weight_kg: weightKg, notes: null, created_at: `${date}T08:00:00Z` }
}

describe('gym session summary', () => {
  it('uses elapsed time, body weight, exercise and recorded load', () => {
    expect(sessionDurationMinutes(session)).toBe(60)
    expect(formatGymDuration(65)).toBe('1 h 5 min')
    expect(estimateGymSessionCalories(session, 80)).toBe(304)
    expect(estimateGymSessionCalories({ ...session, sets: [{ ...set, weight_kg: 80 }] }, 80)).toBe(328)
    expect(estimateGymSessionCalories({ ...session, sets: [{ ...set, exercise_key: 'squat' }] }, 80)).toBe(424)
    expect(estimateGymSessionCalories({ ...session, sets: [{ ...set, done: false }] }, 80)).toBe(0)
  })

  it('uses the latest weight on or before the session day', () => {
    const logs = [weightLog('2026-09-01', 82), weightLog('2026-10-02', 79), weightLog('2026-10-01', 80)]
    expect(weightForSessionDate('2026-10-01', logs, 75)).toBe(80)
    expect(weightForSessionDate('2026-09-15', logs, 75)).toBe(82)
    expect(weightForSessionDate('2026-08-15', logs, 75)).toBe(75)
  })

  it('does not estimate calories without a valid duration or body weight', () => {
    expect(estimateGymSessionCalories(session, null)).toBeNull()
    expect(estimateGymSessionCalories({ ...session, completed_at: null }, 80)).toBeNull()
    expect(sessionDurationMinutes({ ...session, completed_at: '2026-10-01T09:00:00Z' })).toBeNull()
  })
})
