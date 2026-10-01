import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { GymSession } from '../types'

const mocks = vi.hoisted(() => ({ getGymSession: vi.fn(), showToast: vi.fn() }))
vi.mock('../services/gymApi', () => ({
  getGymSession: mocks.getGymSession,
}))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast }) }))

import GymSessionPage from './GymSessionPage'

const session: GymSession = {
  id: 'session-1', user_id: 'user-1', plan_id: 'plan-1', plan_name: 'Scheda A',
  date: '2026-10-01', started_at: '2026-10-01T10:00:00Z', completed_at: null,
  sets: [{ id: 'set-1', session_id: 'session-1', exercise_position: 0,
    exercise_key: 'lat-pulldown', exercise_name: 'Lat machine', equipment: 'Macchina',
    set_number: 1, target_reps: 10, target_reps_max: 12, per_side: false,
    weight_kg: 40, reps: 10, done: false }],
}

afterEach(cleanup)

describe('GymSessionPage', () => {
  it('loads a session directly and returns to Fitness from the focused view', async () => {
    mocks.getGymSession.mockResolvedValue(session)
    render(<MemoryRouter initialEntries={['/fitness/session/session-1']}>
      <Routes>
        <Route path="/fitness/session/:sessionId" element={<GymSessionPage />} />
        <Route path="/fitness" element={<p>Fitness home</p>} />
      </Routes>
    </MemoryRouter>)

    await waitFor(() => expect(mocks.getGymSession).toHaveBeenCalledWith('session-1'))
    expect(await screen.findByRole('heading', { name: 'Scheda A' })).toBeTruthy()
    expect(screen.queryByText('Altre attività')).toBeNull()
    expect(screen.queryByRole('tablist', { name: 'Sezioni Fitness' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '← Allenamenti' }))
    expect(await screen.findByText('Fitness home')).toBeTruthy()
  })
})
