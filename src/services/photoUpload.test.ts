import { describe, expect, it } from 'vitest'
import { functionErrorMessage } from './photoUpload'

describe('photo analysis error messages', () => {
  it('preserves the actionable server error', async () => {
    const error = { context: new Response(JSON.stringify({ error: 'Chiave OpenAI non valida.' }), { status: 503 }) }
    expect(await functionErrorMessage(error)).toBe('Chiave OpenAI non valida.')
  })
  it.each([
    [401, 'Accedi di nuovo'], [413, 'troppo grande'], [429, 'Attendi un minuto'],
    [504, 'troppo tempo'], [502, 'temporaneamente non disponibile'],
  ])('explains non-JSON gateway status %s', async (status, expected) => {
    expect(await functionErrorMessage({ context: new Response('<html>Error</html>', { status }) })).toContain(expected)
  })
  it('distinguishes connection failures and keeps a caller fallback for unknown errors', async () => {
    expect(await functionErrorMessage({ name: 'FunctionsFetchError' })).toContain('connessione a Internet')
    expect(await functionErrorMessage(null, 'Errore di conferma.')).toBe('Errore di conferma.')
  })
})
