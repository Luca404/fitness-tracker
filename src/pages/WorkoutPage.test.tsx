import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ addWorkout: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ workouts: [], currentWeightKg: 80,
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
    fireEvent.click(add)
    fireEvent.click(screen.getByRole('button', { name: 'Camminata' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Salva workout' }))
    await waitFor(() => expect(mocks.addWorkout).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1', date: '2026-10-28', activity: 'walking', duration_min: 30, distance_km: null,
    })))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
