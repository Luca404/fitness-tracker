// src/utils/met.test.ts
import { describe, it, expect } from 'vitest'
import { MET_ACTIVITIES, calculateCaloriesBurned } from './met'

describe('MET_ACTIVITIES', () => {
  it('has 20 activities', () => {
    expect(Object.keys(MET_ACTIVITIES)).toHaveLength(20)
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
})
