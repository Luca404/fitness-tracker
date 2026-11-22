// src/utils/met.ts

export interface ActivityInfo {
  label: string
  met: number
  icon: string  // emoji
}

export const MET_ACTIVITIES: Record<string, ActivityInfo> = {
  running:     { label: 'Corsa',         met: 9.8,  icon: '🏃' },
  walking:     { label: 'Camminata',     met: 3.5,  icon: '🚶' },
  cycling:     { label: 'Ciclismo',      met: 7.5,  icon: '🚴' },
  swimming:    { label: 'Nuoto',         met: 8.0,  icon: '🏊' },
  weights:     { label: 'Pesi',          met: 5.0,  icon: '🏋️' },
  // Moderate reference efforts from the 2024 Compendium (pacompendium.com).
  treadmill:   { label: 'Tapis roulant', met: 5.8,  icon: '🏃' },
  rowing_machine: { label: 'Vogatore',   met: 5.0,  icon: '🚣' },
  hiit:        { label: 'HIIT',          met: 10.0, icon: '⚡' },
  yoga:        { label: 'Yoga',          met: 2.5,  icon: '🧘' },
  pilates:     { label: 'Pilates',       met: 3.0,  icon: '🤸' },
  elliptical:  { label: 'Ellittica',     met: 5.0,  icon: '🔄' },
  rowing:      { label: 'Canottaggio',   met: 7.0,  icon: '🚣' },
  skiing:      { label: 'Sci',           met: 6.0,  icon: '⛷️' },
  tennis:      { label: 'Tennis',        met: 7.3,  icon: '🎾' },
  football:    { label: 'Calcio',        met: 7.0,  icon: '⚽' },
  basketball:  { label: 'Basket',        met: 6.5,  icon: '🏀' },
  climbing:    { label: 'Arrampicata',   met: 8.0,  icon: '🧗' },
  dancing:     { label: 'Danza',         met: 5.0,  icon: '💃' },
  boxing:      { label: 'Boxe',          met: 9.0,  icon: '🥊' },
  stretching:  { label: 'Stretching',    met: 2.3,  icon: '🙆' },
  hiking:      { label: 'Escursionismo', met: 6.0,  icon: '🥾' },
  spinning:    { label: 'Spinning',      met: 8.5,  icon: '🚴' },
}

export const BASIC_ACTIVITY_KEYS = [
  'walking', 'running', 'cycling', 'swimming', 'treadmill', 'rowing_machine',
] as const

export const DISTANCE_ACTIVITY_KEYS = ['walking', 'running', 'cycling', 'treadmill'] as const
const MAX_TREADMILL_ESTIMATE_INCLINE_PCT = 45
const TREADMILL_RUNNING_SPEED_KMH = 9.7

export function supportsWorkoutDistance(activityKey: string): boolean {
  return DISTANCE_ACTIVITY_KEYS.some(key => key === activityKey)
}

// Lower speed bounds in km/h, rounded from the 2024 Adult Compendium mph bands.
// Level ground / no extra load. No distance means the existing reference MET.
// https://pacompendium.com/walking/
// https://pacompendium.com/running/
// https://pacompendium.com/bicycling/
const SPEED_METS: Record<string, readonly (readonly [number, number])[]> = {
  walking: [[0, 2.3], [3.2, 2.8], [4, 3], [4.5, 3.8], [5.6, 4.8], [6.4, 5.5], [7.2, 7], [8, 8.5]],
  running: [[0, 3.3], [6.4, 6.5], [6.9, 7.8], [8, 8.5], [8.9, 9], [9.7, 9.3],
    [10.8, 10.5], [11.3, 11], [12.1, 11.8], [12.9, 12], [13.8, 12.5], [14.5, 13],
    [15, 14.8], [17.7, 16.8], [19.3, 18.5], [20.9, 19.8], [22.5, 23]],
  cycling: [[0, 4], [16.1, 6.8], [19.3, 8], [22.5, 10], [25.7, 12], [32.2, 16.8]],
  treadmill: [[0, 2.1], [1.6, 2.3], [1.9, 2.8], [3.2, 3], [4, 3.5], [4.8, 3.8],
    [5.6, 4.8], [6.4, 5.8], [7.2, 6.8], [8, 8.3]],
}

export function workoutDistanceError(activityKey: string, durationMin: number, distanceKm: number | null): string | null {
  if (distanceKm == null) return null
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 1000) return 'Inserisci una distanza valida oppure lascia il campo vuoto.'
  if (!Number.isFinite(durationMin) || durationMin <= 0) return null
  const speed = distanceKm * 60 / durationMin
  const maximum = activityKey === 'walking' ? 12 : activityKey === 'cycling' ? 80 : 30
  if (supportsWorkoutDistance(activityKey) && speed > maximum) return 'Distanza e durata non sembrano coerenti: controlla i valori.'
  return null
}

function activityMet(activityKey: string, durationMin: number, distanceKm: number | null): number {
  const reference = MET_ACTIVITIES[activityKey]?.met ?? 0
  if (distanceKm == null || !supportsWorkoutDistance(activityKey)) return reference
  const speed = distanceKm * 60 / durationMin
  // Above the walking treadmill table, use the level-running speed bands.
  const bands = activityKey === 'treadmill' && speed >= TREADMILL_RUNNING_SPEED_KMH ? SPEED_METS.running : SPEED_METS[activityKey]
  return [...bands].reverse().find(([minimum]) => speed >= minimum)?.[1] ?? reference
}

function treadmillInclineFactor(inclinePct: number, running: boolean): number {
  // Minetti et al. (2002), net cost per metre relative to level ground.
  // https://doi.org/10.1152/japplphysiol.01177.2001
  const grade = inclinePct / 100
  if (running) {
    const cost = 3.6 + 19.5 * grade + 46.3 * grade ** 2 - 43.3 * grade ** 3
      - 30.4 * grade ** 4 + 155.4 * grade ** 5
    return cost / 3.6
  }
  const cost = 2.5 + 19.6 * grade + 51.9 * grade ** 2 - 76.8 * grade ** 3
    - 58.7 * grade ** 4 + 280.5 * grade ** 5
  return cost / 2.5
}

export function calculateCaloriesBurned(
  activityKey: string,
  durationMin: number,
  weightKg: number,
  distanceKm: number | null = null,
  inclinePct: number | null = null,
): number {
  const activity = MET_ACTIVITIES[activityKey]
  if (!activity || !Number.isFinite(durationMin) || durationMin <= 0
    || !Number.isFinite(weightKg) || weightKg <= 0 || workoutDistanceError(activityKey, durationMin, distanceKm)) return 0
  let met = activityMet(activityKey, durationMin, distanceKm)
  if (activityKey === 'treadmill' && distanceKm != null && inclinePct != null
    && inclinePct !== 0 && Math.abs(inclinePct) <= MAX_TREADMILL_ESTIMATE_INCLINE_PCT) {
    const speed = distanceKm * 60 / durationMin
    const factor = treadmillInclineFactor(inclinePct, speed >= TREADMILL_RUNNING_SPEED_KMH)
    // The slope adjusts movement cost. The resting portion is 1 MET.
    met = 1 + (met - 1) * factor
  }
  return Math.round(met * weightKg * (durationMin / 60))
}
