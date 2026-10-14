// src/utils/met.test.ts
import { describe, it, expect } from 'vitest'
import { BASIC_ACTIVITY_KEYS, MET_ACTIVITIES, calculateCaloriesBurned, workoutDistanceError } from './met'

describe('MET_ACTIVITIES', () => {
  it('keeps the basic activity picker focused', () => {
    expect(BASIC_ACTIVITY_KEYS).toEqual([
      'weights', 'walking', 'running', 'cycling', 'swimming', 'treadmill', 'rowing_machine',
    ])
  })

  it('each activity has label, met, icon', () => {
    for (const key of Object.keys(MET_ACTIVITIES)) {
      const a = MET_ACTIVITIES[key]
      expect(a.label).toBeTruthy()
      expect(a.met).toBeGreaterThan(0)
      expect(a.icon).toBeTruthy()
    }
  })
})

describe('calculateCaloriesBurned', () => {
  it('calculates running 30min at 80kg', () => {
    // MET=9.8, 80kg, 0.5h → 9.8 * 80 * 0.5 = 392
    expect(calculateCaloriesBurned('running', 30, 80)).toBeCloseTo(392, 0)
  })

  it('returns 0 for unknown activity', () => {
    expect(calculateCaloriesBurned('unknown_activity', 30, 80)).toBe(0)
  })

  it('keeps the old estimate when distance is omitted and uses pace when provided', () => {
    expect(calculateCaloriesBurned('walking', 60, 80)).toBe(280)
    expect(calculateCaloriesBurned('walking', 60, 80, 3)).toBe(184)
    expect(calculateCaloriesBurned('walking', 60, 80, 5)).toBe(304)
    expect(calculateCaloriesBurned('walking', 60, 80, 6)).toBe(384)
    expect(calculateCaloriesBurned('running', 60, 80, 10)).toBe(744)
    expect(calculateCaloriesBurned('cycling', 60, 80, 20)).toBe(640)
    expect(calculateCaloriesBurned('treadmill', 60, 80, 5)).toBe(304)
  })

  it('rejects invalid measurements and incoherent walking speed', () => {
    for (const invalid of [0, -1, NaN, Infinity]) {
      expect(calculateCaloriesBurned('walking', invalid, 80, 5)).toBe(0)
      expect(calculateCaloriesBurned('walking', 60, invalid, 5)).toBe(0)
      expect(calculateCaloriesBurned('walking', 60, 80, invalid)).toBe(0)
    }
    expect(workoutDistanceError('walking', 10, 5)).toContain('non sembrano coerenti')
    expect(calculateCaloriesBurned('walking', 10, 80, 5)).toBe(0)
    expect(workoutDistanceError('walking', 10, null)).toBeNull()
  })
})
