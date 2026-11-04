import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FitnessPointsProvider, useFitnessPoints } from './FitnessPointsContext'
const mock = vi.hoisted(() => ({ user: { id: 'a' }, get: vi.fn(), mealRevision: 0, workouts: [] as { id: string }[] }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }))
vi.mock('./DataContext', () => ({ useData: () => ({ mealRevision: mock.mealRevision, workouts: mock.workouts }) }))
vi.mock('../services/fitnessPoints', () => ({ getFitnessPoints: mock.get }))
function Probe() {
  const value = useFitnessPoints()!
  return <><p>{value.loading ? 'loading' : JSON.stringify(value.data)}</p><p>{value.error}</p>
    <button onClick={() => void value.refresh()}>retry</button></>
}
function Subject() { return <MemoryRouter initialEntries={['/points?date=2026-11-04']}><FitnessPointsProvider><Probe /></FitnessPointsProvider></MemoryRouter> }
beforeEach(() => { vi.clearAllMocks(); mock.user = { id: 'a' }; mock.get.mockResolvedValue({ enabled: true, total: 0 }); mock.mealRevision = 0 })
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
})
