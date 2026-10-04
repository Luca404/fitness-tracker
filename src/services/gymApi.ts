import { supabase } from './supabase'
import { groupBy } from '../utils/groupBy'
import type { GymPlan, GymPlanExercise, GymSession, GymSet } from '../types'

export type GymPlanExerciseInput = Pick<GymPlanExercise,
  'exercise_key' | 'exercise_name' | 'equipment' | 'target_sets' | 'target_reps' | 'target_reps_max' | 'per_side'>

export async function getGymPlans(): Promise<GymPlan[]> {
  const { data: plans, error } = await supabase.from('gym_plans').select('*').order('position').order('created_at').order('id')
  if (error) throw error
  if (!plans?.length) return []
  const { data: exercises, error: exerciseError } = await supabase.from('gym_plan_exercises')
    .select('*').in('plan_id', plans.map(plan => plan.id)).order('position')
  if (exerciseError) throw exerciseError
  const exercisesByPlan = groupBy(exercises ?? [], exercise => exercise.plan_id)
  return plans.map(plan => ({
    ...plan,
    exercises: exercisesByPlan.get(plan.id) ?? [],
  })) as GymPlan[]
}

export async function saveGymPlan(userId: string, planId: string | null, name: string,
  exercises: GymPlanExerciseInput[]): Promise<string> {
  const { data, error } = await supabase.rpc('save_gym_plan', {
    p_user_id: userId, p_plan_id: planId, p_name: name, p_exercises: exercises,
  })
  if (error) throw error
  return data as string
}

export async function reorderGymPlans(planIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_gym_plans', { p_plan_ids: planIds })
  if (error) throw error
}

export async function deleteGymPlan(id: string): Promise<void> {
  const { error } = await supabase.from('gym_plans').delete().eq('id', id)
  if (error) throw error
}

async function hydrateGymSessions(rows: Omit<GymSession, 'sets'>[]): Promise<GymSession[]> {
  if (rows.length === 0) return []
  const { data: sets, error } = await supabase.from('gym_sets').select('*')
    .in('session_id', rows.map(row => row.id))
    .order('exercise_position').order('set_number')
  if (error) throw error
  const setsBySession = groupBy(sets ?? [], set => set.session_id)
  return rows.map(row => ({
    ...row,
    sets: setsBySession.get(row.id) ?? [],
  })) as GymSession[]
}

export async function getGymSessionsForDate(date: string): Promise<GymSession[]> {
  const { data, error } = await supabase.from('gym_sessions').select('*').eq('date', date)
  if (error) throw error
  return hydrateGymSessions((data ?? []) as Omit<GymSession, 'sets'>[])
}

export async function getRecentGymSessions(date: string): Promise<GymSession[]> {
  const [recentResult, activeResult, dateResult] = await Promise.all([
    supabase.from('gym_sessions').select('*').order('started_at', { ascending: false }).limit(30),
    supabase.from('gym_sessions').select('*').is('completed_at', null).maybeSingle(),
    supabase.from('gym_sessions').select('*').eq('date', date),
  ])
  if (recentResult.error) throw recentResult.error
  if (activeResult.error) throw activeResult.error
  if (dateResult.error) throw dateResult.error
  const rows = [...new Map([
    ...(activeResult.data ? [activeResult.data] : []),
    ...(dateResult.data ?? []),
    ...(recentResult.data ?? []),
  ].map(row => [row.id, row])).values()]
  return hydrateGymSessions(rows as Omit<GymSession, 'sets'>[])
}

export async function getGymSession(id: string): Promise<GymSession> {
  const { data, error } = await supabase.from('gym_sessions').select('*').eq('id', id).single()
  if (error) throw error
  const [session] = await hydrateGymSessions([data as Omit<GymSession, 'sets'>])
  return session
}

export async function startGymSession(userId: string, planId: string, date: string): Promise<GymSession> {
  const { data, error } = await supabase.rpc('start_gym_session', {
    p_user_id: userId, p_plan_id: planId, p_date: date,
  })
  if (error) throw error
  return getGymSession(data as string)
}

export async function saveGymSet(id: string, weightKg: number | null, reps: number): Promise<GymSet> {
  const { data, error } = await supabase.from('gym_sets')
    .update({ weight_kg: weightKg, reps, done: true }).eq('id', id).select().single()
  if (error) throw error
  return data as GymSet
}

export async function addGymSet(set: Omit<GymSet, 'id'>): Promise<GymSet> {
  const { data, error } = await supabase.from('gym_sets').insert(set).select().single()
  if (error) throw error
  return data as GymSet
}

export async function deleteGymSet(id: string): Promise<void> {
  const { error } = await supabase.from('gym_sets').delete().eq('id', id)
  if (error) throw error
}

export async function completeGymSession(id: string): Promise<void> {
  const { error } = await supabase.from('gym_sessions').update({ completed_at: new Date().toISOString() })
    .eq('id', id).is('completed_at', null)
  if (error) throw error
}

export async function deleteGymSession(id: string): Promise<void> {
  const { error } = await supabase.from('gym_sessions').delete().eq('id', id)
  if (error) throw error
}
