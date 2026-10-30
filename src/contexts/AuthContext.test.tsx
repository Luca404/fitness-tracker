import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), onAuthStateChange: vi.fn(), unsubscribe: vi.fn(),
  signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
  isGoogleAuthEnabled: vi.fn(), initialAuthCallback: { recovery: false, error: null as string | null },
}))
vi.mock('../services/supabase', () => ({
  supabase: { auth: mocks },
  initialAuthCallback: mocks.initialAuthCallback,
  isGoogleAuthEnabled: mocks.isGoogleAuthEnabled,
}))

import { AuthProvider, useAuth } from './AuthContext'

const session = { user: { id: 'account-1' }, access_token: 'test-token' } as Session
let authChanged: (event: AuthChangeEvent, session: Session | null) => void
function Wrapper({ children }: { children: ReactNode }) { return <AuthProvider>{children}</AuthProvider> }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.initialAuthCallback.recovery = false
  mocks.initialAuthCallback.error = null
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  mocks.isGoogleAuthEnabled.mockResolvedValue(false)
  mocks.onAuthStateChange.mockImplementation(callback => {
    authChanged = callback
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
  })
  for (const method of [mocks.signInWithPassword, mocks.signUp, mocks.resetPasswordForEmail, mocks.updateUser, mocks.signInWithOAuth]) {
    method.mockResolvedValue({ data: {}, error: null })
  }
})
afterEach(cleanup)

describe('AuthProvider', () => {
  it('does not let a late getSession overwrite a newer login event', async () => {
    let resolve!: (value: { data: { session: null } }) => void
    mocks.getSession.mockReturnValue(new Promise(done => { resolve = done }))
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    act(() => authChanged('SIGNED_IN', session))
    await act(async () => resolve({ data: { session: null } }))
    expect(result.current.user?.id).toBe('account-1')
    expect(result.current.loading).toBe(false)
  })

  it('keeps recovery active through token and user updates', async () => {
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => authChanged('PASSWORD_RECOVERY', session))
    act(() => authChanged('TOKEN_REFRESHED', session))
    act(() => authChanged('USER_UPDATED', session))
    expect(result.current.isPasswordRecovery).toBe(true)
    act(() => result.current.finishPasswordRecovery())
    expect(result.current.isPasswordRecovery).toBe(false)
  })

  it('returns the same signup result for a new user, an obfuscated user and a duplicate error', async () => {
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const outcomes = []
    for (const response of [
      { data: { user: { id: 'new-user' }, session: null }, error: null },
      { data: { user: { id: 'fake-user', identities: [] }, session: null }, error: null },
      { data: { user: null, session: null }, error: { code: 'user_already_exists', message: 'User already registered' } },
    ]) {
      mocks.signUp.mockResolvedValueOnce(response)
      outcomes.push(await result.current.signUp('  account@example.it  ', 'long-passphrase'))
    }
    expect(outcomes).toEqual([{ error: null }, { error: null }, { error: null }])
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'account@example.it', password: 'long-passphrase',
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
  })

  it('sends recovery emails back to this app and trims the address', async () => {
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await result.current.resetPassword('  account@example.it ')
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('account@example.it', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  })

  it('returns a translated network error instead of leaving a rejected request', async () => {
    mocks.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(await result.current.signIn('account@example.it', 'secret')).toEqual({ error: expect.stringContaining('Controlla la connessione') })
  })

  it('blocks password updates without a session', async () => {
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect((await result.current.updatePassword('new-passphrase')).error).toContain('link non è più valido')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('blocks an expired callback even with a previous valid session', async () => {
    mocks.initialAuthCallback.error = 'Il link è scaduto.'
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.session).toBe(session))
    expect((await result.current.updatePassword('new-passphrase')).error).toBeTruthy()
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('updates a recovered account without prematurely leaving the reset screen', async () => {
    const { result } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => authChanged('PASSWORD_RECOVERY', session))
    expect(await result.current.updatePassword('new-passphrase')).toEqual({ error: null })
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-passphrase' })
    expect(result.current.isPasswordRecovery).toBe(true)
  })

  it('discovers Google from server settings and redirects back to this origin', async () => {
    mocks.isGoogleAuthEnabled.mockResolvedValue(true)
    const { result, unmount } = renderHook(useAuth, { wrapper: Wrapper })
    await waitFor(() => expect(result.current.googleEnabled).toBe(true))
    await result.current.signInWithGoogle()
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } })
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalled()
    expect(mocks.isGoogleAuthEnabled.mock.calls[0][0].aborted).toBe(true)
  })
})
