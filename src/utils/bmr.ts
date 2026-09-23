// src/utils/bmr.ts
import { differenceInCalendarDays } from 'date-fns'
import type { UserHealthProfile, ActivityLevel, SuggestedGoals } from '../types'
import { NUTRITION_GOAL_CONFIG as CONFIG, RECOMPOSITION_TRAINING_ADVICE } from '../config/nutritionGoals'

export type NutritionGoalWarningCode =
  | 'aggressive_target_date'
  | 'deficit_limited'
  | 'calorie_floor'
  | 'low_carbs'
  | 'recomposition_without_strength_training'

export interface NutritionGoalWarning {
  code: NutritionGoalWarningCode
  message: string
}

export interface NutritionGoalRecommendation {
  goals: SuggestedGoals
  bmr: number
  tdee: number
  calorieAdjustment: number
  requestedWeeklyLossRate: number | null
  appliedWeeklyLossRate: number | null
  proteinPerKg: number
  fatPerKg: number
  referenceWeightKg: number
  usesAdjustedWeight: boolean
  warnings: NutritionGoalWarning[]
}

export function calculateBMR(profile: UserHealthProfile): number {
  if (profile.bmr_override !== null) return profile.bmr_override
  const { weight_kg, height_cm, age, sex } = profile
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * CONFIG.activityMultipliers[activityLevel]
}

function getReferenceWeight(profile: UserHealthProfile) {
  const heightM = profile.height_cm / 100
  const bmi = profile.weight_kg / (heightM * heightM)
  if (bmi < CONFIG.protein.highBmiThreshold) {
    return { weight: profile.weight_kg, adjusted: false }
  }

  const bmiReferenceWeight = CONFIG.protein.referenceBmi * heightM * heightM
  const adjustedWeight = bmiReferenceWeight
    + (profile.weight_kg - bmiReferenceWeight) * CONFIG.protein.excessWeightFraction
  return { weight: adjustedWeight, adjusted: true }
}

function getRequestedWeeklyLossRate(profile: UserHealthProfile, referenceDate: Date) {
  if (!profile.target_weight_kg || !profile.target_date) return null
  const deltaKg = profile.weight_kg - profile.target_weight_kg
  if (deltaKg <= 0) return null
  const [targetYear, targetMonth, targetDay] = profile.target_date.split('-').map(Number)
  const targetDate = new Date(targetYear, targetMonth - 1, targetDay)
  const days = differenceInCalendarDays(targetDate, referenceDate)
  if (days <= 0) return null
  return deltaKg / profile.weight_kg / (days / 7)
}

function getProteinPerKg(profile: UserHealthProfile, appliedWeeklyLossRate: number | null) {
  const table = profile.does_resistance_training
    ? CONFIG.protein.resistanceTraining
    : CONFIG.protein.noResistanceTraining
  let perKg = table[profile.objective]

  if (
    profile.objective === 'lose_weight'
    && profile.does_resistance_training
    && appliedWeeklyLossRate !== null
    && appliedWeeklyLossRate > CONFIG.loss.defaultWeeklyRate
  ) {
    const aggressiveRange = CONFIG.loss.maxWeeklyRate - CONFIG.loss.defaultWeeklyRate
    const progress = Math.min(1, (appliedWeeklyLossRate - CONFIG.loss.defaultWeeklyRate) / aggressiveRange)
    perKg += progress * (CONFIG.protein.aggressiveCutMaxPerKg - perKg)
  }

  return perKg
}

export function calculateNutritionGoals(
  profile: UserHealthProfile,
  referenceDate = new Date(),
): NutritionGoalRecommendation {
  const bmr = calculateBMR(profile)
  const tdee = calculateTDEE(bmr, profile.activity_level)
  const warnings: NutritionGoalWarning[] = []
  let requestedWeeklyLossRate: number | null = null
  let appliedWeeklyLossRate: number | null = null
  let calorieAdjustment = 0

  if (profile.objective === 'gain_muscle') {
    calorieAdjustment = CONFIG.gainSurplusKcal
  } else if (profile.objective === 'recomposition') {
    calorieAdjustment = -tdee * CONFIG.recompositionDeficitFraction
    if (!profile.does_resistance_training) {
      warnings.push({
        code: 'recomposition_without_strength_training',
        message: RECOMPOSITION_TRAINING_ADVICE,
      })
    }
  } else if (profile.objective === 'lose_weight') {
    requestedWeeklyLossRate = getRequestedWeeklyLossRate(profile, referenceDate)
    const requestedOrDefault = requestedWeeklyLossRate ?? CONFIG.loss.defaultWeeklyRate
    appliedWeeklyLossRate = Math.min(requestedOrDefault, CONFIG.loss.maxWeeklyRate)

    if (requestedWeeklyLossRate !== null && requestedWeeklyLossRate > CONFIG.loss.maxWeeklyRate) {
      warnings.push({
        code: 'aggressive_target_date',
        message: `La data obiettivo richiederebbe circa ${(requestedWeeklyLossRate * 100).toFixed(2)}% del peso a settimana. Il calcolo usa il limite prudenziale dello ${(CONFIG.loss.maxWeeklyRate * 100).toFixed(2)}%: valuta una data più lontana.`,
      })
    }

    const rateDeficit = profile.weight_kg * appliedWeeklyLossRate * CONFIG.caloriesPerKg / 7
    const relativeDeficitLimit = tdee * CONFIG.loss.maxTdeeDeficitFraction
    const deficit = Math.min(rateDeficit, relativeDeficitLimit)
    if (rateDeficit > relativeDeficitLimit) {
      warnings.push({
        code: 'deficit_limited',
        message: `Il deficit è stato limitato al ${CONFIG.loss.maxTdeeDeficitFraction * 100}% del TDEE.`,
      })
    }
    calorieAdjustment = -deficit
  }

  const absoluteFloor = CONFIG.loss.absoluteFloorBySex[profile.sex]
  const relativeFloor = tdee * (1 - CONFIG.loss.maxTdeeDeficitFraction)
  const prudentFloor = Math.min(tdee, Math.max(absoluteFloor, relativeFloor))
  let calorieTarget = Math.round(tdee + calorieAdjustment)
  if ((profile.objective === 'lose_weight' || profile.objective === 'recomposition') && calorieTarget < prudentFloor) {
    calorieTarget = Math.round(prudentFloor)
    calorieAdjustment = calorieTarget - tdee
    warnings.push({
      code: 'calorie_floor',
      message: `Il target è stato portato a ${calorieTarget} kcal per rispettare i limiti calorici prudenziali.`,
    })
  }

  const referenceWeight = getReferenceWeight(profile)
  const proteinPerKg = getProteinPerKg(profile, appliedWeeklyLossRate)
  const fatPerKg = CONFIG.fat.defaultPerKg
  const protein_g = Math.round(referenceWeight.weight * proteinPerKg)
  let fat_g = Math.round(referenceWeight.weight * fatPerKg)
  let carbs_g = Math.round((calorieTarget - protein_g * 4 - fat_g * 9) / 4)

  if (carbs_g < 0) {
    fat_g = Math.round(referenceWeight.weight * CONFIG.fat.minimumPerKg)
    carbs_g = Math.max(0, Math.round((calorieTarget - protein_g * 4 - fat_g * 9) / 4))
  }

  const carbsPerKg = carbs_g / referenceWeight.weight
  const lowCarbThreshold = CONFIG.carbs.lowPerKgByActivity[profile.activity_level]
  if (carbsPerKg < lowCarbThreshold) {
    warnings.push({
      code: 'low_carbs',
      message: `I carboidrati risultano bassi (${carbsPerKg.toFixed(1)} g/kg) rispetto al livello di attività indicato. Valuta energia, recupero e volume di allenamento.`,
    })
  }

  return {
    goals: {
      calorie_target: calorieTarget,
      protein_g,
      carbs_g,
      fat_g,
    },
    bmr,
    tdee,
    calorieAdjustment,
    requestedWeeklyLossRate,
    appliedWeeklyLossRate,
    proteinPerKg,
    fatPerKg: fat_g / referenceWeight.weight,
    referenceWeightKg: referenceWeight.weight,
    usesAdjustedWeight: referenceWeight.adjusted,
    warnings,
  }
}
