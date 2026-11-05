import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ get: vi.fn(), user: { id: 'a' } as { id: string } | null }))
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mock.user }) }))
vi.mock('../../services/fitnessLeaderboard', () => ({ getFitnessLeaderboard: mock.get, LEADERBOARD_PAGE_SIZE: 25 }))
import Leaderboard from './Leaderboard'
const me = { username: 'my_name', total: 12, rank: 50, is_me: true }
const data = { entries: [{ username: 'leader', total: 90, rank: 1, is_me: false }], me, total_users: 51, has_more: true }
function Subject() { return <MemoryRouter><Leaderboard /></MemoryRouter> }
beforeEach(() => { vi.clearAllMocks(); mock.user = { id: 'a' }; mock.get.mockResolvedValue(data) })
afterEach(cleanup)
describe('leaderboard', () => {
  it('keeps my position visible outside the page and loads the next page', async () => {
    render(<Subject />)
    await screen.findByText('leader')
    expect(screen.getByText('my_name')).toBeTruthy()
    expect(screen.getByText('51 partecipanti')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Modifica nome utente →' }).getAttribute('href')).toBe('/settings')
    mock.get.mockResolvedValueOnce({ ...data, entries: [{ username: 'next_user', total: 70, rank: 26, is_me: false }], has_more: false })
    fireEvent.click(screen.getByRole('button', { name: 'Successivi →' }))
    await screen.findByText('next_user')
    expect(mock.get).toHaveBeenLastCalledWith(25)
    expect(screen.getByText('my_name')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Successivi →' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('handles read errors and retry without inventing a score', async () => {
    mock.get.mockRejectedValueOnce(new Error('offline'))
    render(<Subject />)
    await screen.findByRole('alert')
    expect(screen.queryByText('my_name')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    await screen.findByText('my_name')
  })
  it('ignores stale responses after an account switch', async () => {
    let resolve!: (value: typeof data) => void
    mock.get.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const { rerender } = render(<Subject />)
    mock.user = { id: 'b' }
    mock.get.mockResolvedValueOnce({ entries: [], me: null, total_users: 0, has_more: false })
    rerender(<Subject />)
    await screen.findByText('La classifica è ancora vuota.')
    resolve(data)
    expect(screen.queryByText('my_name')).toBeNull()
  })
})
