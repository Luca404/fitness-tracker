import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PASSWORD_RESET_MESSAGE, SIGN_UP_MESSAGE } from '../utils/auth'

const auth = vi.hoisted(() => ({
  signIn: vi.fn(), signUp: vi.fn(), resetPassword: vi.fn(), signInWithGoogle: vi.fn(),
  googleEnabled: false, authError: null as string | null, clearAuthError: vi.fn(),
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }))
import LoginPage from './LoginPage'

beforeEach(() => {
  vi.resetAllMocks()
  auth.googleEnabled = false
  auth.authError = null
  for (const method of [auth.signIn, auth.signUp, auth.resetPassword, auth.signInWithGoogle]) method.mockResolvedValue({ error: null })
})
afterEach(cleanup)

function enterCredentials(password = 'long-passphrase') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' account@example.it ' } })
  fireEvent.change(screen.getByLabelText('Password', { exact: true }), { target: { value: password } })
}
function submitForm() { fireEvent.submit(screen.getByLabelText('Email').closest('form')!) }

describe('LoginPage', () => {
  it('validates invalid email locally and focuses the field', () => {
    render(<LoginPage />)
    enterCredentials()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'invalid' } })
    submitForm()
    expect(auth.signIn).not.toHaveBeenCalled()
    expect(screen.getByText(/Inserisci un indirizzo email valido/)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Email'))
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true')
  })

  it('allows existing accounts with shorter passwords and shows actionable login errors', async () => {
    auth.signIn.mockResolvedValue({ error: 'Email o password non corrette. Controlla i dati oppure recupera la password.' })
    render(<LoginPage />)
    enterCredentials('old123')
    submitForm()
    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('account@example.it', 'old123'))
    expect((await screen.findByRole('alert')).textContent).toContain('Email o password non corrette')
  })

  it('requires matching passwords before sending a signup request', async () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrati' }))
    enterCredentials()
    fireEvent.change(screen.getByLabelText('Conferma password'), { target: { value: 'different-password' } })
    submitForm()
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(screen.getByText(/Le password non coincidono/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Conferma password'), { target: { value: 'long-passphrase' } })
    submitForm()
    expect(await screen.findByText(SIGN_UP_MESSAGE)).toBeTruthy()
    expect(auth.signUp).toHaveBeenCalledWith('account@example.it', 'long-passphrase')
    expect(screen.getByRole('button', { name: 'Recupera password' })).toBeTruthy()
    expect((screen.getByLabelText('Password', { exact: true }) as HTMLInputElement).value).toBe('')
  })

  it('rejects weak new passwords but supports showing and hiding their contents', () => {
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrati' }))
    enterCredentials('1234567')
    fireEvent.change(screen.getByLabelText('Conferma password'), { target: { value: '1234567' } })
    submitForm()
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(screen.getByText('Usa almeno 8 caratteri per la password.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Mostra password' }))
    expect(screen.getByLabelText('Password', { exact: true }).getAttribute('type')).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Nascondi password' }))
    expect(screen.getByLabelText('Password', { exact: true }).getAttribute('type')).toBe('password')
  })

  it('sends a recovery request without asking for a password and preserves the email', async () => {
    render(<LoginPage />)
    enterCredentials()
    fireEvent.click(screen.getByRole('button', { name: 'Password dimenticata?' }))
    expect(screen.queryByLabelText('Password', { exact: true })).toBeNull()
    submitForm()
    expect(await screen.findByText(PASSWORD_RESET_MESSAGE)).toBeTruthy()
    expect(auth.resetPassword).toHaveBeenCalledWith('account@example.it')
    fireEvent.click(screen.getByRole('button', { name: 'Torna ad accedere' }))
    expect((screen.getByLabelText('Password', { exact: true }) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value.trim()).toBe('account@example.it')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('prevents duplicate submissions while a request is pending', async () => {
    let resolve!: (value: { error: null }) => void
    auth.signIn.mockReturnValue(new Promise(done => { resolve = done }))
    render(<LoginPage />)
    enterCredentials()
    submitForm()
    submitForm()
    expect(auth.signIn).toHaveBeenCalledTimes(1)
    expect((screen.getByRole('button', { name: 'Attendi…' }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => resolve({ error: null }))
    expect(screen.queryByRole('button', { name: 'Attendi…' })).toBeNull()
  })

  it('offers Google only when the server enables it', async () => {
    const { rerender } = render(<LoginPage />)
    expect(screen.queryByRole('button', { name: 'Continua con Google' })).toBeNull()
    auth.googleEnabled = true
    rerender(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Continua con Google' }))
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalledTimes(1))
  })
})
