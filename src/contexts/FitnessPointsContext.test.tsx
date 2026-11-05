import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter } from 'react-router-dom'
import { FitnessPointsProvider, useFitnessPoints } from './FitnessPointsContext'
const mock = vi.hoisted(() => ({ user: { id: 'a' }, get: vi.fn(), mealRevision: 0, workouts: [] as { id: string }[] }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }))
vi.mock('./DataContext', () => ({ useData: () => ({ mealRevision: mock.mealRevision, workouts: mock.workouts }) }))
vi.mock('../services/fitnessPoints', () => ({ getFitnessPoints: mock.get }))
function Probe() {
  const value = useFitnessPoints()!
  return <><p>{value.loading ? 'loading' : JSON.stringify(value.data)}</p><p>{value.error}</p>
    <p data-testid="summary">{JSON.stringify(value.summary)}</p>
    <Link to="/meals">Meals</Link><Link to="/fitness">Fitness</Link><Link to="/points?date=2026-11-03">Past day</Link>
    <button onClick={() => void value.refresh()}>retry</button></>
}
function Subject({ entry = '/points?date=2026-11-04' }: { entry?: string }) { return <MemoryRouter initialEntries={[entry]}><FitnessPointsProvider><Probe /></FitnessPointsProvider></MemoryRouter> }
let account = 0
beforeEach(() => { vi.clearAllMocks(); mock.user = { id: `a-${++account}` }; mock.get.mockResolvedValue({ enabled: true, total: 0 }); mock.mealRevision = 0; mock.workouts = [] })
afterEach(cleanup)
describe('points lifecycle', () => {
  it('requests the URL-selected date and supports retry after a failed read', async () => {
    mock.get.mockRejectedValueOnce(new Error('offline'))
    render(<Subject />)
    expect(await screen.findByText('Impossible caricare i punti. Riprova.')).toBeTruthy()
    fireEvent.click(screen.getByText('retry'))
    expect(await screen.findByText('{"enabled":true,"total":0}')).toBeTruthy()
    expect(mock.get).toHaveBeenLastCalledWith('2026-11-04')
  })
  it('ignores a response from the previous account', async () => {
    let resolve!: (value: unknown) => void
    mock.get.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const { rerender } = render(<Subject />)
    mock.user = { id: 'b' }
    rerender(<Subject />)
    await screen.findByText('{"enabled":true,"total":0}')
    await act(async () => resolve({ enabled: true, total: 9999 }))
    expect(screen.queryByText(/9999/)).toBeNull()
    expect(screen.getByText('{"enabled":true,"total":0}')).toBeTruthy()
  })
  it('refreshes automatically after a diary or activity change', async () => {
    const { rerender } = render(<Subject />)
    await screen.findByText('{"enabled":true,"total":0}')
    mock.get.mockResolvedValue({ enabled: true, total: 20 })
    mock.mealRevision += 1
    rerender(<Subject />)
    await screen.findByText('{"enabled":true,"total":20}')
    mock.get.mockResolvedValue({ enabled: true, total: 58 })
    mock.workouts = [{ id: 'new' }]
    rerender(<Subject />)
    await screen.findByText('{"enabled":true,"total":58}')
  })
  it('refreshes unattended so a finished period appears without a user action', async () => {
    vi.useFakeTimers()
    try {
      await act(async () => { render(<Subject />) })
      expect(screen.getByText('{"enabled":true,"total":0}')).toBeTruthy()
      mock.get.mockResolvedValue({ enabled: true, total: 80 })
      await act(async () => { vi.advanceTimersByTime(60_000) })
      expect(screen.getByText('{"enabled":true,"total":80}')).toBeTruthy()
    } finally { vi.useRealTimers() }
  })
  it('keeps the cached counters while loading a different day', async () => {
    mock.get.mockResolvedValueOnce({ enabled: true, total: 12, streak: 4 })
    render(<Subject />)
    await screen.findByText('{"enabled":true,"total":12,"streak":4}')
    let resolve!: (value: unknown) => void
    mock.get.mockImplementationOnce(() => new Promise(r => { resolve = r }))
    fireEvent.click(screen.getByText('Past day'))
    expect(screen.getByTestId('summary').textContent).toBe('{"total":12,"streak":4}')
    expect(screen.getByText('loading')).toBeTruthy()
    await act(async () => resolve({ enabled: true, total: 13, streak: 4 }))
    expect(screen.getByTestId('summary').textContent).toBe('{"total":13,"streak":4}')
  })
  it('does not request points again when switching ordinary pages', async () => {
    render(<Subject entry="/meals" />)
    await screen.findByText('{"enabled":true,"total":0}')
    fireEvent.click(screen.getByText('Fitness'))
    fireEvent.click(screen.getByText('Meals'))
    expect(mock.get).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('loading')).toBeNull()
  })
  it('keeps the last counters after a background refresh fails', async () => {
    mock.get.mockResolvedValueOnce({ enabled: true, total: 12, streak: 4 })
    render(<Subject />)
    await screen.findByText('{"enabled":true,"total":12,"streak":4}')
    mock.get.mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(screen.getByText('retry'))
    await screen.findByText('Impossible caricare i punti. Riprova.')
    expect(screen.getByTestId('summary').textContent).toBe('{"total":12,"streak":4}')
  })
  it('hides the previous account counters immediately when the account changes', async () => {
    mock.get.mockResolvedValueOnce({ enabled: true, total: 12, streak: 4 })
    const { rerender } = render(<Subject />)
    await screen.findByText('{"enabled":true,"total":12,"streak":4}')
    mock.get.mockImplementationOnce(() => new Promise(() => {}))
    mock.user = { id: 'b' }
    rerender(<Subject />)
    expect(screen.getByTestId('summary').textContent).toBe('null')
  })
  it('retains the counters when returning from a page outside the main layout', async () => {
    mock.get.mockResolvedValueOnce({ enabled: true, total: 12, streak: 4 })
    const { unmount } = render(<Subject />)
    await screen.findByText('{"enabled":true,"total":12,"streak":4}')
    unmount()
    mock.get.mockImplementationOnce(() => new Promise(() => {}))
    render(<Subject />)
    expect(screen.getByTestId('summary').textContent).toBe('{"total":12,"streak":4}')
    expect(screen.getByText('loading')).toBeTruthy()
  })
})
