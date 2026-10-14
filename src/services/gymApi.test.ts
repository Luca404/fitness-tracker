import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }))
import { getGymSessionsForRange } from './gymApi'

beforeEach(() => vi.clearAllMocks())

describe('gym history loading', () => {
  it('loads completed sessions for the requested range and attaches all their sets', async () => {
    const filters: Record<string, ReturnType<typeof vi.fn>> = {}
    mocks.from.mockImplementation((table: string) => {
      const data = table === 'gym_sessions'
        ? [{ id: 'session-1', date: '2026-10-14', completed_at: '2026-10-14T11:00:00Z' }]
        : [{ id: 'set-1', session_id: 'session-1', done: true }]
      const promise = Promise.resolve({ data, error: null })
      const query: Record<string, unknown> = { then: promise.then.bind(promise) }
      for (const key of ['select', 'gte', 'lte', 'not', 'order', 'in']) {
        query[key] = filters[`${table}:${key}`] = vi.fn(() => query)
      }
      return query
    })
    const sessions = await getGymSessionsForRange('2026-10-01', '2026-10-30')
    expect(filters['gym_sessions:gte']).toHaveBeenCalledWith('date', '2026-10-01')
    expect(filters['gym_sessions:lte']).toHaveBeenCalledWith('date', '2026-10-30')
    expect(filters['gym_sessions:not']).toHaveBeenCalledWith('completed_at', 'is', null)
    expect(filters['gym_sets:in']).toHaveBeenCalledWith('session_id', ['session-1'])
    expect(sessions[0].sets).toEqual([{ id: 'set-1', session_id: 'session-1', done: true }])
  })
})
