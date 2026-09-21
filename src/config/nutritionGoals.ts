import type { ActivityLevel, Objective, Sex } from '../types'

export const NUTRITION_GOAL_CONFIG = {
  activityMultipliers: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  } satisfies Record<ActivityLevel, number>,
  caloriesPerKg: 7700,
  gainSurplusKcal: 250,
  loss: {
    defaultWeeklyRate: 0.005,
    indicativeMinWeeklyRate: 0.0025,
    maxWeeklyRate: 0.0075,
    maxTdeeDeficitFraction: 0.25,
    absoluteFloorBySex: {
      male: 1500,
      female: 1200,
    } satisfies Record<Sex, number>,
  },
  protein: {
    resistanceTraining: {
      maintain: 1.6,
      gain_muscle: 1.8,
      lose_weight: 1.8,
    } satisfies Record<Objective, number>,
    noResistanceTraining: {
      maintain: 0.9,
      gain_muscle: 1.2,
      lose_weight: 1.4,
    } satisfies Record<Objective, number>,
    aggressiveCutMaxPerKg: 2,
    highBmiThreshold: 30,
    referenceBmi: 25,
    excessWeightFraction: 0.25,
  },
  fat: {
    defaultPerKg: 0.8,
    minimumPerKg: 0.6,
  },
  carbs: {
    lowPerKgByActivity: {
      sedentary: 1,
      light: 1.5,
      moderate: 2,
      active: 2.5,
      very_active: 3,
    } satisfies Record<ActivityLevel, number>,
  },
} as const

