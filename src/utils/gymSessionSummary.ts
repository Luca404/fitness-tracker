import type { GymSession, GymSet, WeightLog } from '../types'

// 2024 Adult Compendium: resistance training 3.5 MET, body-weight work 3.0 MET,
// squats/deadlifts 5.0 MET, vigorous lifting 6.0 MET.
// https://pacompendium.com/conditioning-exercise/
function exerciseMet(set: GymSet, bodyWeightKg: number): number {
  const key = (set.exercise_key ?? set.exercise_name).toLowerCase()
  const equipment = set.equipment.toLowerCase()
  const isSquatOrDeadlift = /squat|deadlift|stacco/.test(key)
  const isBodyWeight = equipment === 'corpo libero' || equipment === 'sbarra'
  const baseMet = isBodyWeight ? 3 : isSquatOrDeadlift ? 5 : 3.5

  // Absolute kilograms do not reveal relative effort. Keep their contribution
  // deliberately small and bounded; a dumbbell entry is per dumbbell.
  const multiplier = set.per_side || equipment === 'manubri' ? 2 : 1
  const loadRatio = set.weight_kg == null ? 0 : Math.max(0, set.weight_kg * multiplier / bodyWeightKg)
  const loadBonus = Math.min(0.75, loadRatio * 0.6)
  return Math.min(6, baseMet + loadBonus)
}

export function sessionDurationMinutes(session: GymSession): number | null {
  if (!session.completed_at) return null
  const started = Date.parse(session.started_at)
  const completed = Date.parse(session.completed_at)
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) return null
  return (completed - started) / 60_000
}

export function formatGymDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  if (minutes > 0 && rounded === 0) return '<1 min'
  const hours = Math.floor(rounded / 60)
  const remaining = rounded % 60
  if (hours === 0) return `${remaining} min`
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`
}

export function estimateGymSessionCalories(session: GymSession, bodyWeightKg: number | null): number | null {
  const minutes = sessionDurationMinutes(session)
  if (minutes === null || bodyWeightKg === null || !Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0) return null
  const doneSets = session.sets.filter(set => set.done)
  if (doneSets.length === 0) return 0
  const averageMet = doneSets.reduce((sum, set) => sum + exerciseMet(set, bodyWeightKg), 0) / doneSets.length
  // MET ≈ kcal per kg per hour. Using the whole elapsed session, including
  // pauses, is an approximation because individual set timings are unavailable.
  return Math.round(averageMet * bodyWeightKg * minutes / 60)
}

export function weightForSessionDate(date: string, logs: WeightLog[], fallbackKg: number | null): number | null {
  const latest = logs.filter(log => log.date <= date && Number.isFinite(log.weight_kg) && log.weight_kg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  return latest?.weight_kg ?? (fallbackKg && Number.isFinite(fallbackKg) && fallbackKg > 0 ? fallbackKg : null)
}
