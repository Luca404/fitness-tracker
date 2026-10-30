import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PASSWORD_RESET_MESSAGE } from '../utils/auth'

const auth = vi.hoisted(() => ({
  session: { user: { id: 'account-1' } } as object | null,
  authError: null as string | null,
  resetPassword: vi.fn(), updatePassword: vi.fn(), finishPasswordRecovery: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }))
import ResetPasswordPage from './ResetPasswordPage'

beforeEach(() => {
  vi.resetAllMocks()
  auth.session = { user: { id: 'account-1' } }
  auth.authError = null
  auth.updatePassword.mockResolvedValue({ error: null })
  auth.resetPassword.mockResolvedValue({ error: null })
})
afterEach(cleanup)

function renderPage() { return render(<MemoryRouter initialEntries={['/reset-password']}><ResetPasswordPage /></MemoryRouter>) }

describe('ResetPasswordPage', () => {
  it('checks confirmation and keeps the success message visible before leaving recovery', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nuova password'), { target: { value: 'new-passphrase' } })
    fireEvent.change(screen.getByLabelText('Conferma nuova password'), { target: { value: 'different-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nuova password' }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(screen.getByText(/Le password non coincidono/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Conferma nuova password'), { target: { value: 'new-passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nuova password' }))
    expect(await screen.findByRole('heading', { name: 'Password aggiornata.' })).toBeTruthy()
    expect(auth.updatePassword).toHaveBeenCalledWith('new-passphrase')
    expect(auth.finishPasswordRecovery).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Vai a fitTrackr' }))
    expect(auth.finishPasswordRecovery).toHaveBeenCalledTimes(1)
  })

  it('offers a fresh recovery email when there is no session', async () => {
    auth.session = null
    renderPage()
    expect(screen.queryByLabelText('Nuova password')).toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('link è scaduto')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'account@example.it' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invia link di recupero' }))
    expect(await screen.findByText(PASSWORD_RESET_MESSAGE)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(auth.updatePassword).not.toHaveBeenCalled()
  })

  it('does not reuse a previous session when the recovery link is invalid', () => {
    auth.authError = 'Il link è scaduto.'
    renderPage()
    expect(screen.queryByLabelText('Nuova password')).toBeNull()
    expect(screen.getByRole('button', { name: 'Invia link di recupero' })).toBeTruthy()
    expect(auth.updatePassword).not.toHaveBeenCalled()
  })

  it('allows retrying after a rejected password update', async () => {
    auth.updatePassword.mockResolvedValue({ error: 'Scegli una password diversa da quella attuale.' })
    renderPage()
    fireEvent.change(screen.getByLabelText('Nuova password'), { target: { value: 'new-passphrase' } })
    fireEvent.change(screen.getByLabelText('Conferma nuova password'), { target: { value: 'new-passphrase' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva nuova password' }))
    expect((await screen.findByRole('alert')).textContent).toContain('diversa da quella attuale')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Salva nuova password' }) as HTMLButtonElement).disabled).toBe(false))
  })
})
