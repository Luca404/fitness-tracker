import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ today: '2026-10-16', getMealsForRange: vi.fn(), getWorkoutsForRange: vi.fn(), getLatestWeightLog: vi.fn(),
  getWeightLogs: vi.fn(), getGymSessionsForRange: vi.fn(), showToast: vi.fn() }))
vi.mock('../services/api', () => mocks)
vi.mock('../services/gymApi', () => mocks)
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ today: mocks.today }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ currentWeightKg: 60, goals: null, showToast: mocks.showToast }) }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ data, children }: { data: unknown; children: ReactNode }) => <><pre data-testid="chart-data">{JSON.stringify(data)}</pre>{children}</>,
  Line: () => null, XAxis: () => null, YAxis: () => null, Legend: () => null,
  Tooltip: ({ filterNull, formatter }: { filterNull: boolean; formatter: (value: unknown) => string }) => (
    <div data-testid="missing-tooltip">{!filterNull && formatter(null)}</div>
  ),
}))
import HistoryPage from './HistoryPage'

function meal(date: string, calories: number) {
  return { date, entries: [{ items: [{ calories }] }] }
}
function chartData() { return JSON.parse(screen.getByTestId('chart-data').textContent!) }
function consumedCard() { return screen.getByText('Media kcal/giorno').parentElement! }
function burnedCard() { return screen.getByText('Media bruciate/giorno').parentElement! }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.today = '2026-10-16'
  mocks.getMealsForRange.mockResolvedValue([])
  mocks.getWorkoutsForRange.mockResolvedValue([{ date: '2026-10-15', calories_burned: 100.25 }])
  mocks.getWeightLogs.mockResolvedValue([])
  mocks.getLatestWeightLog.mockResolvedValue({ date: '2026-01-01', weight_kg: 80 })
  mocks.getGymSessionsForRange.mockResolvedValue([{
    id: 'gym', date: '2026-10-15', started_at: '2026-10-15T10:00:00Z', completed_at: '2026-10-15T11:00:00Z',
    sets: [{ exercise_key: 'bench-press', exercise_name: 'Panca', equipment: 'Bilanciere',
      weight_kg: 40, per_side: false, done: true }],
  }])
})
afterEach(cleanup)

describe('history page', () => {
  it('loads seven or thirty concluded days including gym and historical weight, ending yesterday', async () => {
    render(<HistoryPage />)
    await waitFor(() => {
      expect(chartData()).toHaveLength(7)
      expect(chartData()[0].date).toBe('09/10')
      expect(chartData().at(-1).Bruciato).toBe(404.25)
    })
    expect(mocks.getMealsForRange).toHaveBeenCalledWith('2026-10-09', '2026-10-15')
    expect(mocks.getWorkoutsForRange).toHaveBeenCalledWith('2026-10-09', '2026-10-15')
    expect(mocks.getGymSessionsForRange).toHaveBeenCalledWith('2026-10-09', '2026-10-15')
    expect(mocks.getLatestWeightLog).toHaveBeenCalledWith('2026-10-09')
    expect(mocks.getWeightLogs).toHaveBeenCalledWith('2026-10-09', '2026-10-15')
    expect(within(burnedCard()).getByText('404')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '30 giorni' }))
    await waitFor(() => {
      expect(chartData()).toHaveLength(30)
      expect(chartData()[0].date).toBe('16/09')
      expect(chartData().at(-1).Bruciato).toBe(404.25)
    })
    expect(mocks.getMealsForRange).toHaveBeenLastCalledWith('2026-09-16', '2026-10-15')
    expect(mocks.getGymSessionsForRange).toHaveBeenLastCalledWith('2026-09-16', '2026-10-15')
  })

  it('excludes missing days and current-day records from the chart and averages, retaining rest-day zeros', async () => {
    mocks.getMealsForRange.mockResolvedValue([meal('2026-10-14', 1800), meal('2026-10-15', 2200), meal('2026-10-16', 500)])
    mocks.getGymSessionsForRange.mockResolvedValue([])
    mocks.getWorkoutsForRange.mockResolvedValue([{ date: '2026-10-15', calories_burned: 400 }, { date: '2026-10-16', calories_burned: 1000 }])
    render(<HistoryPage />)
    await screen.findByTestId('chart-data')
    expect(chartData().some((day: { date: string }) => day.date === '16/10')).toBe(false)
    expect(chartData()[0]).toEqual({ date: '09/10', Mangiato: null, Bruciato: null })
    expect(chartData().at(-2)).toEqual({ date: '14/10', Mangiato: 1800, Bruciato: 0 })
    expect(within(consumedCard()).getByText('2000')).toBeTruthy()
    expect(within(consumedCard()).getByText('Giorni conteggiati: 2')).toBeTruthy()
    expect(within(burnedCard()).getByText('200')).toBeTruthy()
    expect(within(burnedCard()).getByText('Giorni conteggiati: 2')).toBeTruthy()
    expect(screen.getByText('Dati mancanti · 5 giorni')).toBeTruthy()
    expect(screen.getByTestId('missing-tooltip').textContent).toBe('Dati mancanti')
  })

  it('marks gym-only days as missing meals while retaining their burned calories', async () => {
    render(<HistoryPage />)
    await screen.findByTestId('chart-data')
    expect(chartData().at(-1).Mangiato).toBeNull()
    expect(screen.getByText('15/10 · Pasti: dati mancanti')).toBeTruthy()
    expect(within(consumedCard()).getByText('—')).toBeTruthy()
    expect(within(consumedCard()).getByText('Giorni conteggiati: 0')).toBeTruthy()
    expect(within(burnedCard()).getByText('Giorni conteggiati: 1')).toBeTruthy()
  })

  it('shows no average for a wholly empty period, including today-only records', async () => {
    mocks.getMealsForRange.mockResolvedValue([meal('2026-10-16', 1000)])
    mocks.getWorkoutsForRange.mockResolvedValue([])
    mocks.getGymSessionsForRange.mockResolvedValue([])
    render(<HistoryPage />)
    await screen.findByTestId('chart-data')
    expect(within(consumedCard()).getByText('—')).toBeTruthy()
    expect(within(burnedCard()).getByText('—')).toBeTruthy()
    expect(screen.getByText('Dati mancanti · 7 giorni')).toBeTruthy()
  })

  it('advances the window when the local day changes', async () => {
    mocks.getMealsForRange.mockResolvedValue([meal('2026-10-16', 1800)])
    const view = render(<HistoryPage />)
    await screen.findByTestId('chart-data')
    mocks.today = '2026-10-17'
    view.rerender(<HistoryPage />)
    await waitFor(() => expect(chartData().at(-1)).toEqual({ date: '16/10', Mangiato: 1800, Bruciato: 0 }))
    expect(mocks.getMealsForRange).toHaveBeenLastCalledWith('2026-10-10', '2026-10-16')
  })

  it('distinguishes a failed load from missing records and supports retrying', async () => {
    mocks.getMealsForRange.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([meal('2026-10-15', 2000)])
    render(<HistoryPage />)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByText(/Dati mancanti ·/)).toBeNull()
    expect(within(consumedCard()).getByText('Dati non disponibili')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    await screen.findByTestId('chart-data')
    expect(within(consumedCard()).getByText('2000')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
