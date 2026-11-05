import { supabase } from './supabase'

export interface LeaderboardEntry {
  username: string
  total: number
  rank: number
  is_me: boolean
}

export interface FitnessLeaderboard {
  entries: LeaderboardEntry[]
  me: LeaderboardEntry | null
  total_users: number
  has_more: boolean
}

export const LEADERBOARD_PAGE_SIZE = 25

export async function getFitnessLeaderboard(offset = 0): Promise<FitnessLeaderboard> {
  const { data, error } = await supabase.rpc('get_fitness_leaderboard', {
    p_limit: LEADERBOARD_PAGE_SIZE, p_offset: offset,
  })
  if (error) throw error
  if (!data || !Array.isArray(data.entries)) throw new Error('Classifica non disponibile')
  return data as FitnessLeaderboard
}

export async function getFitnessUsername(): Promise<string> {
  const { data, error } = await supabase.from('fitness_usernames').select('username').single()
  if (error) throw error
  return data.username
}

export async function setFitnessUsername(username: string): Promise<string> {
  const { data, error } = await supabase.rpc('set_fitness_username', { p_username: username.trim().toLowerCase() })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('Nome utente non disponibile')
  return data
}

export function usernameError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null
  if (code === '23505') return 'Nome utente già in uso. Scegline un altro.'
  if (code === '22023') return 'Usa da 3 a 24 caratteri: lettere, numeri e underscore.'
  return 'Impossibile salvare il nome utente. Riprova.'
}
