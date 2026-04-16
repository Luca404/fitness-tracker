// src/utils/bmr.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateBMR,
  calculateTDEE,
  calculateDeficit,
  suggestGoals,
} from './bmr'
import type { UserHealthProfile } from '../types'

const baseProfile: UserHealthProfile = {
  user_id: 'x',
  age: 30,
  sex: 'male',
  height_cm: 175,
  weight_kg: 80,
  activity_level: 'moderate',
  objective: 'maintain',
  target_weight_kg: null,
  target_date: null,
  body_fat_pct: null,
  bmr_override: null,
  created_at: '',
  updated_at: '',
}

describe('calculateBMR', () => {
  it('calculates male BMR via Mifflin-St Jeor', () => {
    // 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75
    expect(calculateBMR(baseProfile)).toBeCloseTo(1748.75, 1)
  })

  it('calculates female BMR', () => {
    const f = { ...baseProfile, sex: 'female' as const }
    // 1748.75 - 5 - 161 = 1582.75
    expect(calculateBMR(f)).toBeCloseTo(1582.75, 1)
  })

  it('uses bmr_override when set', () => {
    expect(calculateBMR({ ...baseProfile, bmr_override: 2000 })).toBe(2000)
  })
})

describe('calculateTDEE', () => {
  it('applies moderate multiplier 1.55', () => {
    expect(calculateTDEE(1748.75, 'moderate')).toBeCloseTo(2710.56, 0)
  })
})

describe('calculateDeficit', () => {
  it('returns 0 for maintain', () => {
    expect(calculateDeficit(baseProfile)).toBe(0)
  })

  it('returns +250 for gain_muscle', () => {
    expect(calculateDeficit({ ...baseProfile, objective: 'gain_muscle' })).toBe(250)
  })

  it('calculates deficit for lose_weight', () => {
    const profile: UserHealthProfile = {
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 85,
      target_weight_kg: 80,
      // 70 days from now
      target_date: new Date(Date.now() + 70 * 86400000).toISOString().split('T')[0],
    }
    // 5kg * 7700 / 70 days = 550 kcal/day deficit
    const deficit = calculateDeficit(profile)
    expect(deficit).toBeCloseTo(-550, 0)
  })

  it('caps deficit at -1000', () => {
    const profile: UserHealthProfile = {
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 100,
      target_weight_kg: 70,
      target_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }
    expect(calculateDeficit(profile)).toBe(-1000)
  })
})

describe('suggestGoals', () => {
  it('splits macros 30/40/30 from calorie target', () => {
    const goals = suggestGoals(2000, 0)
    expect(goals.calorie_target).toBe(2000)
    // protein: 30% of 2000 = 600 kcal / 4 = 150g
    expect(goals.protein_g).toBeCloseTo(150, 0)
    // carbs: 40% of 2000 = 800 kcal / 4 = 200g
    expect(goals.carbs_g).toBeCloseTo(200, 0)
    // fat: 30% of 2000 = 600 kcal / 9 = 66.7g
    expect(goals.fat_g).toBeCloseTo(66.7, 0)
  })
})
