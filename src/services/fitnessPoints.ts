import { supabase } from './supabase'

export interface PointsAward {
  key: string
  kind: 'diary' | 'streak' | 'habit' | 'penalty' | 'activity' | 'gym'
  label: string
  points: number
  detail: {
    status: 'earned' | 'target' | 'incomplete' | 'pending' | 'insufficient' | 'excess' | 'missed'
    value?: number | null
    target?: number
    unit?: string
    minutes?: number
    km?: number | null
    met?: number
    kcal?: number
    capped?: boolean
    weekly?: boolean
    partial?: boolean
  }
}

export interface PointsDay {
  date: string
  meal_count: number
  registered: boolean
  streak: number
  points: number
  awards: PointsAward[]
  movement_raw: number
}

export interface ActiveFitnessPoints {
  enabled: true
  started_on: string
  timezone: string
  rules_version: number
  today: string
  selected_date: string
  sugars_target: number
  alcohol_target: number
  total: number
  net_total: number
  streak: number
  best_streak: number
  registered_days: number
  day: PointsDay | null
  history: PointsDay[]
  has_older: boolean
}

export type FitnessPoints = ActiveFitnessPoints

export async function getFitnessPoints(date: string | null = null): Promise<FitnessPoints> {
  const { data, error } = await supabase.rpc('get_fitness_points', { p_date: date })
  if (error) throw error
  if (data == null || data.enabled !== true) throw new Error('Riepilogo punti non disponibile')
  return data as FitnessPoints
}
