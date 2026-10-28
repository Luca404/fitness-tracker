import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GymSession } from '../types'

const mocks = vi.hoisted(() => ({ getCompletedGymSessions: vi.fn(), getLatestWeightLog: vi.fn(), getWeightLogs: vi.fn(), userId: 'user-1' }))
vi.mock('../services/gymApi', () => ({ getCompletedGymSessions: mocks.getCompletedGymSessions }))
vi.mock('../services/api', () => ({ getLatestWeightLog: mocks.getLatestWeightLog, getWeightLogs: mocks.getWeightLogs }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ currentWeightKg: 80 }) }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ data, children }: { data: unknown; children: ReactNode }) => <><pre data-testid="progress-chart">{JSON.stringify(data)}</pre>{children}</>,
  Line: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null,
}))
import GymProgressPage from './GymProgressPage'

function session(id: string, date: string, weight: number | null, reps = 10): GymSession {
  return { id, date, user_id: 'user-1', plan_id: null, plan_name: `Scheda ${id}`,
    started_at: `${date}T10:00:00Z`, completed_at: `${date}T11:00:00Z`,
    sets: [{ id: `set-${id}`, session_id: id, exercise_position: 0, exercise_key: 'bench',
      exercise_name: 'Panca', equipment: 'Bilanciere', bench_angle: 0, per_side: false,
      set_number: 1, target_reps: null, target_reps_max: null, weight_kg: weight, reps, done: true }] }
}

function SessionDestination() { return <p>Sessione aperta{useLocation().search}</p> }
function TestApp() {
  return <MemoryRouter initialEntries={['/fitness?tab=progress']}><Routes>
    <Route path="/fitness" element={<GymProgressPage />} />
    <Route path="/fitness/session/:id" element={<SessionDestination />} />
  </Routes></MemoryRouter>
}
function setup() { return render(<TestApp />) }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.userId = 'user-1'
  mocks.getLatestWeightLog.mockResolvedValue(null)
  mocks.getWeightLogs.mockResolvedValue([])
  mocks.getCompletedGymSessions.mockResolvedValue([
    session('old', '2026-10-01', 50, 6), session('new', '2026-10-28', 45, 10),
  ])
})
afterEach(cleanup)

describe('fitness progress', () => {
  it('shows latest versus best, plots chronological values, and opens a session with a return to progress', async () => {
    setup()
    expect(await screen.findByText('I tuoi progressi')).toBeTruthy()
    const section = screen.getByRole('region', { name: 'Progressi per esercizio' })
    expect(within(section).getByText('45 kg × 10 rip.')).toBeTruthy()
    expect(within(section).getByText('50 kg × 6 rip.')).toBeTruthy()
    expect(within(section).getByText('-5 kg')).toBeTruthy()
    const points = JSON.parse(screen.getByTestId('progress-chart').textContent!)
    expect(points.map((point: { value: number }) => point.value)).toEqual([50, 45])
    expect(mocks.getWeightLogs).toHaveBeenCalledWith('2026-10-01', '2026-10-28')
    fireEvent.click(screen.getByRole('button', { name: 'Apri ultima sessione' }))
    expect(await screen.findByText('Sessione aperta?from=progress')).toBeTruthy()
  })

  it('keeps bodyweight progress separate and plots repetitions rather than invented kilograms', async () => {
    mocks.getCompletedGymSessions.mockResolvedValue([
      session('loaded', '2026-10-28', 50), session('body-old', '2026-10-01', null, 8), session('body-new', '2026-10-28', null, 12),
    ])
    setup()
    const selector = await screen.findByRole('combobox', { name: 'Esercizio' })
    const bodyweight = within(selector).getByRole('option', { name: /corpo libero/ }) as HTMLOptionElement
    fireEvent.change(selector, { target: { value: bodyweight.value } })
    expect(screen.getByText('+4 rip.')).toBeTruthy()
    expect(JSON.parse(screen.getByTestId('progress-chart').textContent!).map((point: { value: number }) => point.value)).toEqual([8, 12])
  })

  it('lists newest sessions first, expands older sessions and excludes an unfinished session', async () => {
    mocks.getCompletedGymSessions.mockResolvedValue([
      session('one', '2026-10-01', 40), session('two', '2026-10-02', 40),
      session('three', '2026-10-03', 45), session('four', '2026-10-04', 45),
      { ...session('active', '2026-10-28', 100), completed_at: null },
    ])
    setup()
    const list = await screen.findByRole('region', { name: 'Sessioni recenti' })
    expect(within(list).getAllByRole('button').slice(0, 3).map(button => button.textContent)).toEqual([
      expect.stringContaining('Scheda four'), expect.stringContaining('Scheda three'), expect.stringContaining('Scheda two'),
    ])
    expect(within(list).queryByText('Scheda one')).toBeNull()
    fireEvent.click(within(list).getByRole('button', { name: 'Mostra tutte le 4 sessioni' }))
    expect(within(list).getByText('Scheda one')).toBeTruthy()
    expect(within(list).queryByText('Scheda active')).toBeNull()
    fireEvent.click(within(list).getByRole('button', { name: /Scheda four/ }))
    expect(await screen.findByText('Sessione aperta?from=progress')).toBeTruthy()
  })

  it('distinguishes an empty history from an error and retries loading', async () => {
    mocks.getCompletedGymSessions.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([])
    setup()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByText('Qui vedrai i tuoi allenamenti')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Qui vedrai i tuoi allenamenti')).toBeTruthy()
  })

  it('ignores an old user request after the account changes', async () => {
    let resolve!: (value: GymSession[]) => void
    mocks.getCompletedGymSessions.mockReturnValueOnce(new Promise<GymSession[]>(done => { resolve = done }))
      .mockResolvedValueOnce([])
    const view = setup()
    mocks.userId = 'user-2'
    view.rerender(<TestApp />)
    expect(await screen.findByText('Qui vedrai i tuoi allenamenti')).toBeTruthy()
    await act(async () => resolve([session('stale', '2026-10-28', 100)]))
    await waitFor(() => expect(screen.queryByText('Scheda stale')).toBeNull())
    expect(screen.getByText('Qui vedrai i tuoi allenamenti')).toBeTruthy()
  })
})
