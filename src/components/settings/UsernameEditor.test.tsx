import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ getFitnessUsername: vi.fn(), setFitnessUsername: vi.fn() }))
vi.mock('../../services/fitnessLeaderboard', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/fitnessLeaderboard')>(), ...api,
}))
import UsernameEditor from './UsernameEditor'
beforeEach(() => { vi.clearAllMocks(); api.getFitnessUsername.mockResolvedValue('user123456789') })
afterEach(cleanup)
describe('username settings', () => {
  it('loads the assigned name, validates, and saves a normalized new name', async () => {
    api.setFitnessUsername.mockResolvedValue('runner_1')
    render(<UsernameEditor />)
    const input = await screen.findByLabelText('Il tuo nome in classifica')
    expect((input as HTMLInputElement).value).toBe('user123456789')
    fireEvent.change(input, { target: { value: 'a b' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome utente' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(api.setFitnessUsername).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: ' Runner_1 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome utente' }))
    await screen.findByText('Nome utente aggiornato')
    expect(api.setFitnessUsername).toHaveBeenCalledWith('runner_1')
    expect((input as HTMLInputElement).value).toBe('runner_1')
  })
  it('preserves the draft after a duplicate error and allows correction', async () => {
    api.setFitnessUsername.mockRejectedValue({ code: '23505' })
    render(<UsernameEditor />)
    const input = await screen.findByLabelText('Il tuo nome in classifica')
    fireEvent.change(input, { target: { value: 'duplicate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nome utente' }))
    expect((await screen.findByRole('alert')).textContent).toContain('già in uso')
    expect((input as HTMLInputElement).value).toBe('duplicate')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(input, { target: { value: 'another' } })
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('retries a failed initial read', async () => {
    api.getFitnessUsername.mockRejectedValueOnce(new Error('offline'))
    render(<UsernameEditor />)
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    await screen.findByLabelText('Il tuo nome in classifica')
    await waitFor(() => expect(api.getFitnessUsername).toHaveBeenCalledTimes(2))
  })
})
