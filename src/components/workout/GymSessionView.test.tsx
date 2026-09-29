import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GymSession } from '../../types'

const mocks = vi.hoisted(() => ({ saveGymSet: vi.fn(), showToast: vi.fn() }))
vi.mock('../../services/gymApi', () => ({
  saveGymSet: mocks.saveGymSet,
  addGymSet: vi.fn(), deleteGymSet: vi.fn(), completeGymSession: vi.fn(), deleteGymSession: vi.fn(),
}))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast }) }))

import GymSessionView from './GymSessionView'

const session: GymSession = {
  id: 'session-1', user_id: 'user-1', plan_id: 'plan-1', plan_name: 'Scheda A',
  date: '2026-09-29', started_at: '2026-09-29T10:00:00Z', completed_at: null,
  sets: [{ id: 'set-1', session_id: 'session-1', exercise_position: 0,
    exercise_key: 'lat-pulldown', exercise_name: 'Lat machine', equipment: 'Macchina',
    set_number: 1, target_reps: 10, target_reps_max: 12, per_side: false,
    weight_kg: 40, reps: 10, done: false }],
}

describe('GymSessionView', () => {
  it('records the performed weight and reps for an individual set', async () => {
    mocks.saveGymSet.mockResolvedValue({ ...session.sets[0], weight_kg: 45, reps: 8, done: true })
    render(<GymSessionView session={session} onBack={vi.fn()}
      onCompleted={vi.fn()} onDeleted={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '45' } })
    fireEvent.change(screen.getByLabelText('Ripetizioni'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Fatto' }))

    await waitFor(() => expect(mocks.saveGymSet).toHaveBeenCalledWith('set-1', 45, 8))
    expect(await screen.findByText('1/1 serie completate', { exact: false })).toBeTruthy()
  })

  it('shows a repetition range per side and allows free repetition goals', () => {
    render(<GymSessionView session={{ ...session, sets: [
      { ...session.sets[0], per_side: true, target_reps: 8, target_reps_max: 12 },
      { ...session.sets[0], id: 'set-2', set_number: 2, target_reps: null, target_reps_max: null, reps: null, per_side: true },
    ] }} onBack={vi.fn()} onCompleted={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.getByText(/obiettivo 8–12 rip. per lato/)).toBeTruthy()
    expect(screen.getByText(/obiettivo libero/)).toBeTruthy()
    expect(screen.getAllByLabelText('Ripetizioni per lato')).toHaveLength(2)
  })
})
