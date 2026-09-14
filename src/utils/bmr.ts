// src/utils/bmr.ts
import { differenceInCalendarDays } from 'date-fns'
import type { UserHealthProfile, ActivityLevel, SuggestedGoals } from '../types'

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateBMR(profile: UserHealthProfile): number {
  if (profile.bmr_override !== null) return profile.bmr_override
  const { weight_kg, height_cm, age, sex } = profile
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel]
}

export function calculateDeficit(profile: UserHealthProfile): number {
  if (profile.objective === 'maintain') return 0
  if (profile.objective === 'gain_muscle') return 250

  // lose_weight
  if (!profile.target_weight_kg || !profile.target_date) return 0
  const deltaKg = profile.weight_kg - profile.target_weight_kg
  const [targetYear, targetMonth, targetDay] = profile.target_date.split('-').map(Number)
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay)
  const daysTotal = Math.max(1, differenceInCalendarDays(targetDate, new Date()))
  const dailyDeficit = (deltaKg * 7700) / daysTotal
  return -Math.min(dailyDeficit, 1000)
}

export function suggestGoals(tdee: number, deficit: number): SuggestedGoals {
  const calorie_target = Math.round(tdee + deficit)
  return {
    calorie_target,
    protein_g: Math.round((calorie_target * 0.30) / 4),
    carbs_g: Math.round((calorie_target * 0.40) / 4),
    fat_g: Math.round((calorie_target * 0.30) / 9),
  }
}
