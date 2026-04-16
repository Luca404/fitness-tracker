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

export function calculateCaloriesBurned(
  activityKey: string,
  durationMin: number,
  weightKg: number
): number {
  const activity = MET_ACTIVITIES[activityKey]
  if (!activity) return 0
  return Math.round(activity.met * weightKg * (durationMin / 60))
}
