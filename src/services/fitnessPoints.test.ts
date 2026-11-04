import { beforeEach, describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { rpc } }))
import { getFitnessPoints } from './fitnessPoints'

beforeEach(() => rpc.mockReset())
describe('server-authoritative points', () => {
  it('loads a selected day without sending account or score values', async () => {
    rpc.mockResolvedValue({ data: { enabled: true, total: 0 }, error: null })
    expect(await getFitnessPoints('2026-11-04')).toEqual({ enabled: true, total: 0 })
    expect(rpc).toHaveBeenCalledWith('get_fitness_points', { p_date: '2026-11-04' })
  })
  it('propagates errors and rejects empty responses', async () => {
    const error = new Error('offline')
    rpc.mockResolvedValue({ data: null, error })
    await expect(getFitnessPoints()).rejects.toBe(error)
    rpc.mockResolvedValue({ data: { enabled: false }, error: null })
    await expect(getFitnessPoints()).rejects.toThrow('non disponibile')
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(getFitnessPoints()).rejects.toThrow('non disponibile')
  })
})
