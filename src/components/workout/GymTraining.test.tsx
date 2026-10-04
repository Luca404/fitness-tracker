import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { GymPlan, GymSession } from '../../types'

const mocks = vi.hoisted(() => ({
  selectedDate: '2026-10-01', getGymPlans: vi.fn(), getRecentGymSessions: vi.fn(), reorderGymPlans: vi.fn(),
  getLatestWeightLog: vi.fn(), getWeightLogs: vi.fn(), showToast: vi.fn(),
}))
vi.mock('../../services/gymApi', () => ({
  getGymPlans: mocks.getGymPlans, getRecentGymSessions: mocks.getRecentGymSessions, reorderGymPlans: mocks.reorderGymPlans,
}))
vi.mock('../../services/api', () => ({
  getLatestWeightLog: mocks.getLatestWeightLog, getWeightLogs: mocks.getWeightLogs,
}))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast, currentWeightKg: 80 }) }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: mocks.selectedDate }) }))

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
  mocks.selectedDate = '2026-10-01'
  mocks.reorderGymPlans.mockReset().mockResolvedValue(undefined)
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

const plans: GymPlan[] = ['A', 'B', 'C'].map((letter, position) => ({
  id: `plan-${letter}`, name: `Scheda ${letter}`, position, user_id: 'user-1', created_at: '', updated_at: '', exercises: [],
}))
function planNames() { return screen.getAllByRole('heading', { level: 3 }).map(heading => heading.textContent).filter(name => name?.startsWith('Scheda ')) }
it('persists plan moves and reloads the saved order', async () => {
  mocks.getGymPlans.mockResolvedValue(plans)
  const view = render(<MemoryRouter><GymTraining /></MemoryRouter>)
  await screen.findByText('Scheda B')
  expect((screen.getByRole('button', { name: 'Sposta su Scheda A' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Sposta giù Scheda C' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Sposta su Scheda B' }))
  await waitFor(() => expect(mocks.reorderGymPlans).toHaveBeenCalledWith(['plan-B', 'plan-A', 'plan-C']))
  expect(planNames()).toEqual(['Scheda B', 'Scheda A', 'Scheda C'])
  view.unmount()
  mocks.getGymPlans.mockResolvedValue([plans[1], plans[0], plans[2]])
  render(<MemoryRouter><GymTraining /></MemoryRouter>)
  await screen.findByText('Scheda B')
  expect(planNames()).toEqual(['Scheda B', 'Scheda A', 'Scheda C'])
})
it('blocks further moves during a save and restores the previous order after an error', async () => {
  let reject!: (error: Error) => void
  mocks.getGymPlans.mockResolvedValue(plans)
  mocks.reorderGymPlans.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail }))
  render(<MemoryRouter><GymTraining /></MemoryRouter>)
  await screen.findByText('Scheda B')
  fireEvent.click(screen.getByRole('button', { name: 'Sposta su Scheda B' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sposta giù Scheda B' }))
  expect(mocks.reorderGymPlans).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button', { name: '+ Nuova scheda' }) as HTMLButtonElement).disabled).toBe(true)
  await act(async () => reject(new Error('offline')))
  expect(planNames()).toEqual(['Scheda A', 'Scheda B', 'Scheda C'])
  expect(mocks.showToast).toHaveBeenCalledWith('Errore salvataggio ordine delle schede. Riprova.')
  expect((screen.getByRole('button', { name: 'Sposta su Scheda B' }) as HTMLButtonElement).disabled).toBe(false)
})

it('keeps a pending plan order when changing date refreshes the plans', async () => {
  let resolve!: () => void
  mocks.getGymPlans.mockResolvedValue(plans)
  mocks.reorderGymPlans.mockImplementationOnce(() => new Promise<void>(done => { resolve = done }))
  const view = render(<MemoryRouter><GymTraining /></MemoryRouter>)
  await screen.findByText('Scheda B')
  fireEvent.click(screen.getByRole('button', { name: 'Sposta su Scheda B' }))
  mocks.selectedDate = '2026-10-02'
  view.rerender(<MemoryRouter><GymTraining /></MemoryRouter>)
  await waitFor(() => expect(mocks.getGymPlans).toHaveBeenCalledTimes(2))
  await screen.findByRole('button', { name: 'Sposta su Scheda A' })
  expect(planNames()).toEqual(['Scheda B', 'Scheda A', 'Scheda C'])
  await act(async () => resolve())
  expect(planNames()).toEqual(['Scheda B', 'Scheda A', 'Scheda C'])
})
