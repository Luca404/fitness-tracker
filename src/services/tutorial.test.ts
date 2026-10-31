import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { from: mocks.from } }))
import { markTutorialSeen } from './api'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockReturnValue(mocks)
  mocks.update.mockReturnValue(mocks)
  mocks.eq.mockReturnValue(mocks)
  mocks.select.mockReturnValue(mocks)
  mocks.single.mockResolvedValue({ data: { user_id: 'user-1' }, error: null })
})

describe('tutorial preference', () => {
  it('only updates the signed-in profile preference and verifies a row was saved', async () => {
    await markTutorialSeen('user-1')
    expect(mocks.from).toHaveBeenCalledWith('user_health_profiles')
    expect(mocks.update).toHaveBeenCalledWith({ tutorial_seen: true })
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.single).toHaveBeenCalledOnce()
  })

  it('rejects failed writes and a missing profile', async () => {
    mocks.single.mockResolvedValueOnce({ data: null, error: new Error('Offline') })
    await expect(markTutorialSeen('user-1')).rejects.toThrow('Offline')
    mocks.single.mockResolvedValueOnce({ data: null, error: null })
    await expect(markTutorialSeen('user-1')).rejects.toThrow('Profile not found')
  })
})
