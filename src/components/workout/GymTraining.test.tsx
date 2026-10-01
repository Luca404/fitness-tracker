import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { GymSession } from '../../types'

const mocks = vi.hoisted(() => ({
  getGymPlans: vi.fn(), getRecentGymSessions: vi.fn(),
  getLatestWeightLog: vi.fn(), getWeightLogs: vi.fn(), showToast: vi.fn(),
}))
vi.mock('../../services/gymApi', () => ({
  getGymPlans: mocks.getGymPlans, getRecentGymSessions: mocks.getRecentGymSessions,
}))
vi.mock('../../services/api', () => ({
  getLatestWeightLog: mocks.getLatestWeightLog, getWeightLogs: mocks.getWeightLogs,
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast, currentWeightKg: 80 }) }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-01' }) }))

import GymTraining from './GymTraining'

const session: GymSession = {
  id: 'session-1', user_id: 'user-1', plan_id: 'plan-1', plan_name: 'Scheda A',
  date: '2026-10-01', started_at: '2026-10-01T10:00:00Z', completed_at: '2026-10-01T11:00:00Z',
  sets: [{ id: 'set-1', session_id: 'session-1', exercise_position: 0,
    exercise_key: 'bench-press', exercise_name: 'Panca piana', equipment: 'Bilanciere',
    set_number: 1, target_reps: 10, target_reps_max: null, per_side: false,
    weight_kg: 40, reps: 10, done: true }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getGymPlans.mockResolvedValue([])
  mocks.getRecentGymSessions.mockResolvedValue([session])
  mocks.getLatestWeightLog.mockResolvedValue({ date: '2026-10-01', weight_kg: 78 })
  mocks.getWeightLogs.mockResolvedValue([])
})
afterEach(cleanup)

describe('GymTraining completed sessions', () => {
  it('shows duration and calorie estimate using the weight logged that day', async () => {
    render(<MemoryRouter><GymTraining /></MemoryRouter>)

    expect(await screen.findByText('1 h')).toBeTruthy()
    expect(await screen.findByText('≈ 297 kcal')).toBeTruthy()
    expect(screen.getByText(/78 kg/)).toBeTruthy()
    await waitFor(() => expect(mocks.getLatestWeightLog).toHaveBeenCalledWith('2026-10-01'))
  })
})
