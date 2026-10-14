import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { format } from 'date-fns'

const mocks = vi.hoisted(() => ({ getMealsForRange: vi.fn(), getWorkoutsForRange: vi.fn(), getLatestWeightLog: vi.fn(),
  getWeightLogs: vi.fn(), getGymSessionsForRange: vi.fn(), showToast: vi.fn() }))
vi.mock('../services/api', () => mocks)
vi.mock('../services/gymApi', () => mocks)
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({ currentWeightKg: 60, goals: null, showToast: mocks.showToast }) }))
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  LineChart: ({ data }: { data: unknown }) => <pre data-testid="chart-data">{JSON.stringify(data)}</pre>,
  Line: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null,
}))
import HistoryPage from './HistoryPage'

beforeEach(() => {
  vi.clearAllMocks()
  const date = format(new Date(), 'yyyy-MM-dd')
  mocks.getMealsForRange.mockResolvedValue([])
  mocks.getWorkoutsForRange.mockResolvedValue([{ date, calories_burned: 100.25 }])
  mocks.getWeightLogs.mockResolvedValue([])
  mocks.getLatestWeightLog.mockResolvedValue({ date: '2026-01-01', weight_kg: 80 })
  mocks.getGymSessionsForRange.mockResolvedValue([{
    id: 'gym', date, started_at: `${date}T10:00:00Z`, completed_at: `${date}T11:00:00Z`,
    sets: [{ exercise_key: 'bench-press', exercise_name: 'Panca', equipment: 'Bilanciere',
      weight_kg: 40, per_side: false, done: true }],
  }])
})
afterEach(cleanup)

describe('history page', () => {
  it('loads gym sets and historical weight into both graph ranges', async () => {
    render(<HistoryPage />)
    await waitFor(() => {
      const data = JSON.parse(screen.getByTestId('chart-data').textContent!)
      expect(data).toHaveLength(7)
      expect(data.at(-1).Bruciato).toBe(404.25)
    })
    expect(mocks.getGymSessionsForRange).toHaveBeenCalledWith(expect.any(String), format(new Date(), 'yyyy-MM-dd'))
    fireEvent.click(screen.getByRole('button', { name: '30 giorni' }))
    await waitFor(() => {
      const data = JSON.parse(screen.getByTestId('chart-data').textContent!)
      expect(data).toHaveLength(30)
      expect(data.at(-1).Bruciato).toBe(404.25)
    })
  })
})
