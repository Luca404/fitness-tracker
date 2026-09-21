import { describe, expect, it } from 'vitest'
import { addDays, format } from 'date-fns'
import { calculateBMR, calculateNutritionGoals, calculateTDEE } from './bmr'
import { NUTRITION_GOAL_CONFIG } from '../config/nutritionGoals'
import type { UserHealthProfile } from '../types'

const baseProfile: UserHealthProfile = {
  user_id: 'x',
  age: 30,
  sex: 'male',
  height_cm: 175,
  weight_kg: 80,
  activity_level: 'moderate',
  does_resistance_training: true,
  objective: 'maintain',
  target_weight_kg: null,
  target_date: null,
  body_fat_pct: null,
  bmr_override: null,
  created_at: '',
  updated_at: '',
}

describe('energy expenditure', () => {
  it('calculates male and female BMR via Mifflin-St Jeor', () => {
    expect(calculateBMR(baseProfile)).toBeCloseTo(1748.75, 1)
    expect(calculateBMR({ ...baseProfile, sex: 'female' })).toBeCloseTo(1582.75, 1)
  })

  it('uses a BMR override and the configured activity multiplier', () => {
    expect(calculateBMR({ ...baseProfile, bmr_override: 2000 })).toBe(2000)
    expect(calculateTDEE(1748.75, 'moderate')).toBeCloseTo(2710.56, 0)
  })
})

describe('nutrition goal recommendation', () => {
  it('uses g/kg targets and assigns carbohydrates the remaining calories', () => {
    const result = calculateNutritionGoals(baseProfile)

    expect(result.goals.calorie_target).toBe(2711)
    expect(result.proteinPerKg).toBe(1.6)
    expect(result.goals.protein_g).toBe(128)
    expect(result.goals.fat_g).toBe(64)
    expect(result.goals.carbs_g).toBe(406)
    const macroCalories = result.goals.protein_g * 4 + result.goals.fat_g * 9 + result.goals.carbs_g * 4
    expect(Math.abs(macroCalories - result.goals.calorie_target)).toBeLessThanOrEqual(2)
  })

  it('uses a lower protein target without resistance training', () => {
    const trained = calculateNutritionGoals(baseProfile)
    const untrained = calculateNutritionGoals({ ...baseProfile, does_resistance_training: false })

    expect(untrained.proteinPerKg).toBe(0.9)
    expect(untrained.goals.protein_g).toBeLessThan(trained.goals.protein_g)
  })

  it('derives a moderate cut from target weight and date', () => {
    const today = new Date(2026, 0, 1)
    const profile: UserHealthProfile = {
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 85,
      target_weight_kg: 80,
      target_date: format(addDays(today, 70), 'yyyy-MM-dd'),
    }
    const result = calculateNutritionGoals(profile, today)

    expect(result.requestedWeeklyLossRate).toBeCloseTo(0.00588, 4)
    expect(result.calorieAdjustment).toBeCloseTo(-550, 0)
    expect(result.proteinPerKg).toBeGreaterThan(1.8)
    expect(result.proteinPerKg).toBeLessThan(2)
  })

  it('flags an excessive target date and limits the deficit by weekly rate and TDEE', () => {
    const today = new Date(2026, 0, 1)
    const result = calculateNutritionGoals({
      ...baseProfile,
      objective: 'lose_weight',
      weight_kg: 100,
      target_weight_kg: 70,
      target_date: format(addDays(today, 30), 'yyyy-MM-dd'),
    }, today)

    expect(result.appliedWeeklyLossRate).toBe(NUTRITION_GOAL_CONFIG.loss.maxWeeklyRate)
    expect(result.calorieAdjustment).toBeGreaterThanOrEqual(-result.tdee * NUTRITION_GOAL_CONFIG.loss.maxTdeeDeficitFraction - 1)
    expect(result.warnings.map(warning => warning.code)).toContain('aggressive_target_date')
    expect(result.warnings.map(warning => warning.code)).toContain('deficit_limited')
  })

  it('does not force a low-energy profile below its prudent floor', () => {
    const today = new Date(2026, 0, 1)
    const result = calculateNutritionGoals({
      ...baseProfile,
      sex: 'female',
      age: 70,
      height_cm: 160,
      weight_kg: 45,
      activity_level: 'sedentary',
      objective: 'lose_weight',
      target_weight_kg: 40,
      target_date: format(addDays(today, 70), 'yyyy-MM-dd'),
    }, today)

    expect(result.goals.calorie_target).toBe(Math.round(result.tdee))
    expect(result.warnings.map(warning => warning.code)).toContain('calorie_floor')
  })

  it('uses adjusted reference weight at a high BMI', () => {
    const result = calculateNutritionGoals({ ...baseProfile, weight_kg: 160 })

    expect(result.usesAdjustedWeight).toBe(true)
    expect(result.referenceWeightKg).toBeLessThan(100)
    expect(result.goals.protein_g).toBeLessThan(160)
  })

  it('warns when remaining carbohydrates are low for the activity level', () => {
    const result = calculateNutritionGoals({
      ...baseProfile,
      weight_kg: 100,
      activity_level: 'very_active',
      bmr_override: 1000,
    })

    expect(result.warnings.map(warning => warning.code)).toContain('low_carbs')
  })
})
