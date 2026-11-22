import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Workout } from '../types'
const mocks = vi.hoisted(() => ({
  addWorkout: vi.fn().mockResolvedValue(undefined),
  workouts: [
    { id: 'legacy', user_id: 'user-1', date: '2026-10-28', activity: 'weights', duration_min: 30, calories_burned: 200, notes: null, created_at: '' },
    { id: 'rower', user_id: 'user-1', date: '2026-10-28', activity: 'rowing_machine', duration_min: 20, calories_burned: 133, notes: null, stroke_rate_spm: 26, created_at: '' },
  ] satisfies Workout[],
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ workouts: mocks.workouts, currentWeightKg: 80,
  addWorkout: mocks.addWorkout, removeWorkout: vi.fn(), showToast: vi.fn() }) }))
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-28', setSelectedDate: vi.fn() }) }))
vi.mock('../components/workout/GymTraining', () => ({ default: () => <h2>Le tue schede</h2> }))
import WorkoutPage from './WorkoutPage'
afterEach(cleanup)

describe('other activity entry', () => {
  it('opens the activity picker before the plans and saves an activity on the selected day', async () => {
    render(<WorkoutPage />)
    const add = screen.getByRole('button', { name: /Altre attività/ })
    expect(Boolean(add.compareDocumentPosition(screen.getByRole('heading', { name: 'Le tue schede' })) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(screen.getByText('Pesi')).toBeTruthy()
    expect(screen.getByText(/20 min · 26 SPM/)).toBeTruthy()
    fireEvent.click(add)
    expect(screen.queryByRole('button', { name: 'Pesi' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tapis roulant' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Inclinazione (%, facoltativa)'), { target: { value: '6,5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(mocks.addWorkout).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1', date: '2026-10-28', activity: 'treadmill', duration_min: 30, distance_km: null, incline_pct: 6.5,
    })))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
