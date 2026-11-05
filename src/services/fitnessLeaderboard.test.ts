import { beforeEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { rpc } }))
import { getFitnessLeaderboard, setFitnessUsername, usernameError } from './fitnessLeaderboard'
beforeEach(() => rpc.mockReset())
describe('fitness public identity API', () => {
  it('requests a bounded leaderboard page without account or score parameters', async () => {
    const data = { entries: [], me: null, total_users: 0, has_more: false }
    rpc.mockResolvedValue({ data, error: null })
    expect(await getFitnessLeaderboard(25)).toEqual(data)
    expect(rpc).toHaveBeenCalledWith('get_fitness_leaderboard', { p_limit: 25, p_offset: 25 })
  })
  it('normalizes names and only sends the chosen name', async () => {
    rpc.mockResolvedValue({ data: 'runner_1', error: null })
    expect(await setFitnessUsername(' Runner_1 ')).toBe('runner_1')
    expect(rpc).toHaveBeenCalledWith('set_fitness_username', { p_username: 'runner_1' })
  })
  it('propagates failures and rejects missing leaderboard data', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(getFitnessLeaderboard()).rejects.toThrow('non disponibile')
    rpc.mockResolvedValue({ error: { code: '23505' } })
    await expect(setFitnessUsername('duplicate')).rejects.toEqual({ code: '23505' })
    expect(usernameError({ code: '23505' })).toContain('già in uso')
    expect(usernameError({ code: '22023' })).toContain('3 a 24')
    expect(usernameError(new Error('offline'))).toContain('Riprova')
  })
})
