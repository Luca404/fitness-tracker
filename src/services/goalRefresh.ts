import { format, subDays } from 'date-fns'
import type { UserGoals, UserHealthProfile } from '../types'
import * as api from './api'
import { NUTRITION_GOAL_CONFIG } from '../config/nutritionGoals'
import { calculateNutritionGoals } from '../utils/bmr'
import { shouldAutoRecalculateGoals, summarizeRollingWeight } from '../utils/goalRecalculation'
import type { RollingWeightSummary } from '../utils/goalRecalculation'

export function calculatedGoals(profile: UserHealthProfile, weight: number): Omit<UserGoals, 'updated_at'> {
  return { user_id: profile.user_id,
    ...calculateNutritionGoals({ ...profile, weight_kg: weight }).goals,
    calculation_weight_kg: weight }
}

export async function loadWeightState() {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const from = format(subDays(now, NUTRITION_GOAL_CONFIG.weightRecalculation.windowDays - 1), 'yyyy-MM-dd')
  const [latest, logs] = await Promise.all([api.getLatestWeightLog(today), api.getWeightLogs(from, today)])
  return { latestWeightKg: latest?.weight_kg ?? null, summary: summarizeRollingWeight(logs) }
}

export async function recalculateGoalsForWeight(profile: UserHealthProfile | null,
  goals: UserGoals | null, summary: RollingWeightSummary): Promise<UserGoals | null> {
  if (!profile || !goals || !shouldAutoRecalculateGoals(summary, goals.calculation_weight_kg ?? profile.weight_kg)) return goals
  const next = calculatedGoals(profile, summary.averageKg as number)
  await api.upsertUserGoals(next)
  return { ...next, updated_at: new Date().toISOString() }
}
