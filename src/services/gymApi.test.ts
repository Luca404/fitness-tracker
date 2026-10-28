import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }))
import { getCompletedGymSessions, getCustomGymExercises, getGymSessionsForRange, getGymTrainingSessions } from './gymApi'

beforeEach(() => vi.clearAllMocks())

it('loads saved personal exercises as reusable custom search results', async () => {
  const order = vi.fn().mockResolvedValue({ data: [
    { id: 'exercise-1', exercise_name: 'Croci su panca', equipment: 'Manubri' },
  ], error: null })
  mocks.from.mockReturnValue({ select: vi.fn(() => ({ order })) })
  expect(await getCustomGymExercises()).toEqual([
    { key: 'custom:exercise-1', name: 'Croci su panca', equipment: 'Manubri', muscle: 'Personalizzato', custom: true },
  ])
  expect(mocks.from).toHaveBeenCalledWith('gym_custom_exercises')
  expect(order).toHaveBeenCalledWith('exercise_name')
})

it('reports personal catalog read failures instead of returning an empty catalog', async () => {
  const error = new Error('offline')
  mocks.from.mockReturnValue({ select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: null, error }) })) })
  await expect(getCustomGymExercises()).rejects.toBe(error)
})

describe('gym history loading', () => {
  it('loads sets beyond the first API page instead of truncating exercise history', async () => {
    const range = vi.fn().mockImplementation((from: number) => Promise.resolve({ error: null,
      data: from === 0 ? Array.from({ length: 1000 }, (_, i) => ({ id: `set-${i}`, session_id: 'many' }))
        : [{ id: 'set-1000', session_id: 'many' }],
    }))
    const sets: Record<string, unknown> = { range }
    for (const key of ['select', 'in', 'order']) sets[key] = vi.fn(() => sets)
    const sessionResult = Promise.resolve({ error: null, data: [{ id: 'many', date: '2026-10-28', completed_at: '2026-10-28T11:00:00Z' }] })
    const sessions: Record<string, unknown> = { then: sessionResult.then.bind(sessionResult) }
    for (const key of ['select', 'not', 'order', 'limit']) sessions[key] = vi.fn(() => sessions)
    mocks.from.mockImplementation((table: string) => table === 'gym_sessions' ? sessions : sets)
    const result = await getCompletedGymSessions()
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]])
    expect(result[0].sets).toHaveLength(1001)
    expect(result[0].sets.at(-1)?.id).toBe('set-1000')
  })

  it('filters completed sessions before applying the progress limit and hydrates their sets', async () => {
    const filters: Record<string, ReturnType<typeof vi.fn>> = {}
    mocks.from.mockImplementation((table: string) => {
      const data = table === 'gym_sessions'
        ? [{ id: 'recent', date: '2026-10-28', completed_at: '2026-10-28T11:00:00Z' }]
        : [{ id: 'set-recent', session_id: 'recent', done: true }]
      const promise = Promise.resolve({ data, error: null })
      const query: Record<string, unknown> = { then: promise.then.bind(promise) }
      for (const key of ['select', 'not', 'order', 'limit', 'in', 'range']) query[key] = filters[`${table}:${key}`] = vi.fn(() => query)
      return query
    })
    const sessions = await getCompletedGymSessions()
    const completed = filters['gym_sessions:not']
    const limit = filters['gym_sessions:limit']
    expect(completed).toHaveBeenCalledWith('completed_at', 'is', null)
    expect(limit).toHaveBeenCalledWith(30)
    expect(completed.mock.invocationCallOrder[0]).toBeLessThan(limit.mock.invocationCallOrder[0])
    expect(filters['gym_sessions:order']).toHaveBeenCalledWith('date', { ascending: false })
    expect(filters['gym_sessions:order']).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(sessions[0].sets).toEqual([{ id: 'set-recent', session_id: 'recent', done: true }])
  })

  it('keeps an active session available outside the selected day without loading full history', async () => {
    const active = { id: 'active', date: '2026-10-27', completed_at: null }
    const query = Promise.resolve({ data: [{ id: 'set-active', session_id: 'active' }], error: null })
    const sets: Record<string, unknown> = { then: query.then.bind(query) }
    const inFilter = vi.fn(() => sets)
    sets.in = inFilter
    sets.order = vi.fn(() => sets)
    sets.range = vi.fn(() => sets)
    sets.select = vi.fn(() => sets)
    const dayFilter = vi.fn().mockResolvedValue({ data: [], error: null })
    mocks.from.mockImplementation((table: string) => table === 'gym_sets' ? sets : {
      select: vi.fn(() => ({
        is: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: active, error: null }) })),
        eq: dayFilter,
      })),
    })
    const sessions = await getGymTrainingSessions('2026-10-28')
    expect(dayFilter).toHaveBeenCalledWith('date', '2026-10-28')
    expect(sessions.map(session => session.id)).toEqual(['active'])
    expect(inFilter).toHaveBeenCalledWith('session_id', ['active'])
  })

  it('loads completed sessions for the requested range and attaches all their sets', async () => {
    const filters: Record<string, ReturnType<typeof vi.fn>> = {}
    mocks.from.mockImplementation((table: string) => {
      const data = table === 'gym_sessions'
        ? [{ id: 'session-1', date: '2026-10-14', completed_at: '2026-10-14T11:00:00Z' }]
        : [{ id: 'set-1', session_id: 'session-1', done: true }]
      const promise = Promise.resolve({ data, error: null })
      const query: Record<string, unknown> = { then: promise.then.bind(promise) }
      for (const key of ['select', 'gte', 'lte', 'not', 'order', 'in', 'range']) {
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
