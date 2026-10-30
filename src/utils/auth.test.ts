import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage, isExistingAccountError, readAuthCallback } from './auth'

describe('authentication messages', () => {
  it.each([
    [{ code: 'invalid_credentials' }, 'Email o password non corrette'],
    [{ code: 'email_not_confirmed' }, 'Conferma il tuo indirizzo email'],
    [{ code: 'over_email_send_rate_limit' }, 'Troppi tentativi'],
    [{ status: 429 }, 'Troppi tentativi'],
    [new TypeError('Failed to fetch'), 'Controlla la connessione'],
    [{ code: 'same_password' }, 'diversa da quella attuale'],
    [{ code: 'otp_expired' }, 'Richiedi una nuova email'],
    [{ code: 'session_expired' }, 'Richiedi una nuova email'],
    [{ code: 'weak_password', message: 'Password should be at least 12 characters.' }, 'almeno 12 caratteri'],
  ])('explains %j without exposing raw server errors', (error, expected) => {
    expect(getAuthErrorMessage(error, 'signIn')).toContain(expected)
  })

  it('does not reflect unknown server messages or account details', () => {
    expect(getAuthErrorMessage({ message: 'Private detail for user@email.it' }, 'signIn'))
      .toBe('Non è stato possibile accedere. Riprova tra poco.')
  })

  it.each([{ code: 'user_already_exists' }, { code: 'email_exists' }, { message: 'User already registered' }])('recognizes duplicate accounts: %j', error => {
    expect(isExistingAccountError(error)).toBe(true)
  })

  it('does not hide unrelated signup errors', () => {
    expect(isExistingAccountError({ code: 'weak_password' })).toBe(false)
  })
})

describe('authentication callback', () => {
  it('detects recovery before Supabase consumes its fragment', () => {
    expect(readAuthCallback(new URL('https://fit.example/#access_token=test&type=recovery'))).toEqual({ recovery: true, error: null })
    expect(readAuthCallback(new URL('https://fit.example/reset-password'))).toEqual({ recovery: true, error: null })
  })

  it('explains expired links even when a previous session may still exist', () => {
    expect(readAuthCallback(new URL('https://fit.example/reset-password#error=access_denied&error_code=otp_expired')))
      .toEqual({ recovery: true, error: expect.stringContaining('link è scaduto') })
  })

  it('handles Google cancellation from the query without echoing the supplied description', () => {
    const callback = readAuthCallback(new URL('https://fit.example/?error=access_denied&error_description=untrusted-text'))
    expect(callback.recovery).toBe(false)
    expect(callback.error).toContain('Accesso annullato')
    expect(callback.error).not.toContain('untrusted-text')
  })
})
