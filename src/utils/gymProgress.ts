import type { GymSession, GymSet } from '../types'
import { formatDecimal } from './decimal'

export interface ExerciseSessionPoint {
  sessionId: string
  date: string
  startedAt: string
  best: GymSet
  sets: number
}

export interface ExerciseProgress {
  key: string
  name: string
  equipment: string
  benchAngle: number | null
  perSide: boolean
  bodyweight: boolean
  points: ExerciseSessionPoint[]
  best: ExerciseSessionPoint
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ')

function exerciseKey(set: GymSet): string {
  return JSON.stringify([
    set.exercise_key ?? normalize(set.exercise_name), normalize(set.equipment),
    set.bench_angle ?? null, set.per_side, set.weight_kg === null,
  ])
}

// Compare recorded sets without inventing a one-rep maximum: higher load,
// then more repetitions at the same load. Bodyweight sets compare repetitions.
function compareSets(a: GymSet, b: GymSet): number {
  return (a.weight_kg ?? 0) - (b.weight_kg ?? 0) || (a.reps ?? 0) - (b.reps ?? 0)
}

export function formatGymPerformance(set: GymSet): string {
  return `${set.weight_kg == null ? 'Corpo libero' : `${formatDecimal(set.weight_kg)} kg`} × ${set.reps} rip.${set.per_side ? ' per lato' : ''}`
}

export function exerciseDescription(exercise: ExerciseProgress): string {
  return `${exercise.equipment}${exercise.benchAngle != null ? ` · panca ${exercise.benchAngle}°` : ''}${exercise.perSide ? ' · per lato' : ''}${exercise.bodyweight ? ' · corpo libero' : ''}`
}

export function buildGymProgress(sessions: GymSession[]): ExerciseProgress[] {
  const history = new Map<string, ExerciseProgress>()
  const completed = sessions.filter(session => session.completed_at)
    .sort((a, b) => a.date.localeCompare(b.date) || a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id))
  for (const session of completed) {
    const perSession = new Map<string, { best: GymSet; sets: number }>()
    for (const set of session.sets) {
      if (!set.done || set.reps == null || !Number.isFinite(set.reps) || set.reps <= 0
        || (set.weight_kg !== null && (!Number.isFinite(set.weight_kg) || set.weight_kg < 0))) continue
      const key = exerciseKey(set)
      const previous = perSession.get(key)
      perSession.set(key, {
        best: !previous || compareSets(set, previous.best) > 0 ? set : previous.best,
        sets: (previous?.sets ?? 0) + 1,
      })
    }
    for (const [key, { best, sets }] of perSession) {
      const point = { sessionId: session.id, date: session.date, startedAt: session.started_at, best, sets }
      const previous = history.get(key)
      if (previous) {
        previous.name = best.exercise_name
        previous.equipment = best.equipment
        previous.points.push(point)
        // A tied record is represented by its most recent occurrence.
        if (compareSets(best, previous.best.best) >= 0) previous.best = point
      } else {
        history.set(key, { key, name: best.exercise_name, equipment: best.equipment,
          benchAngle: best.bench_angle ?? null, perSide: best.per_side, bodyweight: best.weight_kg === null,
          points: [point], best: point })
      }
    }
  }
  return [...history.values()].sort((a, b) => a.name.localeCompare(b.name, 'it') || a.key.localeCompare(b.key))
}
