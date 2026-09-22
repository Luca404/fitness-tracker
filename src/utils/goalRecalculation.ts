import { NUTRITION_GOAL_CONFIG as CONFIG } from '../config/nutritionGoals'
import type { WeightLog } from '../types'

export interface RollingWeightSummary {
  averageKg: number | null
  sampleCount: number
}

export function summarizeRollingWeight(logs: Pick<WeightLog, 'weight_kg'>[]): RollingWeightSummary {
  const weights = logs
    .map(log => log.weight_kg)
    .filter(weight => Number.isFinite(weight) && weight > 0)

  if (weights.length === 0) return { averageKg: null, sampleCount: 0 }

  const average = weights.reduce((sum, weight) => sum + weight, 0) / weights.length
  return {
    averageKg: Math.round(average * 100) / 100,
    sampleCount: weights.length,
  }
}

export function shouldAutoRecalculateGoals(
  summary: RollingWeightSummary,
  calculationWeightKg: number | null,
): boolean {
  if (
    summary.averageKg === null
    || summary.sampleCount < CONFIG.weightRecalculation.minimumSamples
    || calculationWeightKg === null
    || !Number.isFinite(calculationWeightKg)
    || calculationWeightKg <= 0
  ) return false

  const absoluteThreshold = calculationWeightKg * CONFIG.weightRecalculation.thresholdFraction
  return Math.abs(summary.averageKg - calculationWeightKg) + Number.EPSILON * calculationWeightKg >= absoluteThreshold
}
