import { describe, expect, it } from 'vitest'
import type { GymSession, GymSet } from '../types'
import { buildGymProgress, formatGymPerformance } from './gymProgress'

const baseSet: GymSet = {
  id: 'set', session_id: 'session', exercise_position: 0, exercise_key: 'bench',
  exercise_name: 'Panca', equipment: 'Bilanciere', bench_angle: 0,
  set_number: 1, target_reps: 10, target_reps_max: null, per_side: false,
  weight_kg: 40, reps: 10, done: true,
}
function session(id: string, date: string, sets: Partial<GymSet>[], hour = '10'): GymSession {
  return { id, user_id: 'user', plan_id: null, plan_name: id, date,
    started_at: `${date}T${hour}:00:00Z`, completed_at: `${date}T${hour}:45:00Z`,
    sets: sets.map((set, i) => ({ ...baseSet, id: `${id}-${i}`, session_id: id, set_number: i + 1, ...set })) }
}

describe('gym progress', () => {
  it('uses the best set in each session, keeps chronology and distinguishes latest from period best', () => {
    const sessions = [
      session('latest', '2026-10-28', [{ weight_kg: 45, reps: 8 }, { weight_kg: 40, reps: 12 }]),
      session('first', '2026-10-01', [{ weight_kg: 50, reps: 6 }, { weight_kg: 50, reps: 8 }, { weight_kg: 40, reps: 15 }]),
    ]
    const original = structuredClone(sessions)
    const [progress] = buildGymProgress(sessions)
    expect(progress.points.map(point => point.sessionId)).toEqual(['first', 'latest'])
    expect(progress.points[0].best).toMatchObject({ weight_kg: 50, reps: 8 })
    expect(progress.points.at(-1)!.best).toMatchObject({ weight_kg: 45, reps: 8 })
    expect(progress.best.sessionId).toBe('first')
    expect(progress.points[0].sets).toBe(3)
    expect(sessions).toEqual(original)
  })

  it('does not turn unfinished or invalid sets and active sessions into progress', () => {
    expect(buildGymProgress([
      { ...session('active', '2026-10-28', [{}]), completed_at: null },
      session('completed', '2026-10-27', [{ done: false }, { reps: null }, { reps: 0 },
        { weight_kg: NaN }, { weight_kg: -1 }, { reps: Infinity }]),
    ])).toEqual([])
  })

  it('separates equipment, bench angles, per-side repetitions and bodyweight from loaded sets', () => {
    const groups = buildGymProgress([session('variants', '2026-10-28', [
      {}, { equipment: 'Manubri' }, { bench_angle: null }, { bench_angle: 30 },
      { per_side: true }, { weight_kg: null },
    ])])
    expect(groups).toHaveLength(6)
    expect(new Set(groups.map(group => group.key)).size).toBe(6)
    expect(groups.every(group => group.points.length === 1)).toBe(true)
  })

  it('compares bodyweight repetitions and keeps separate sessions on the same date', () => {
    const [progress] = buildGymProgress([
      session('evening', '2026-10-28', [{ weight_kg: null, reps: 12 }, { weight_kg: null, reps: 10 }], '18'),
      session('morning', '2026-10-28', [{ weight_kg: null, reps: 8 }], '08'),
    ])
    expect(progress.bodyweight).toBe(true)
    expect(progress.points.map(point => point.sessionId)).toEqual(['morning', 'evening'])
    expect(progress.best.best.reps).toBe(12)
    expect(formatGymPerformance({ ...progress.best.best, per_side: true })).toBe('Corpo libero × 12 rip. per lato')
  })

  it('treats a recorded zero load as known and normalizes equipment for comparison', () => {
    const [progress] = buildGymProgress([session('same', '2026-10-28', [
      { weight_kg: 0, reps: 10 }, { equipment: ' bilanciere ', weight_kg: 0, reps: 12 },
    ])])
    expect(progress.bodyweight).toBe(false)
    expect(progress.points).toHaveLength(1)
    expect(formatGymPerformance(progress.best.best)).toBe('0 kg × 12 rip.')
  })
})
