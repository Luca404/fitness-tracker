import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const auth = vi.fn()
  const env = vi.fn()
  vi.stubGlobal('Deno', { serve: vi.fn(), env: { get: env } })
  return { auth, env }
})
vi.mock('../_shared/auth.ts', () => ({ getAuthenticatedUser: mocks.auth }))
import { handleRequest } from './index'

const fetchMock = vi.fn()
const estimate = {
  name: 'Riso', confidence: 'medium', warnings: [],
  items: [{ food_name: 'Riso cotto', quantity_g: 200, category: 'grain', calories: 260, protein_g: 5, carbs_g: 56, fat_g: 1, assumed: false, note: null }],
}
const body = { image_base64: 'YQ==', mime_type: 'image/jpeg', description: 'Riso al ristorante' }
const request = (payload: unknown = body) => new Request('https://example.test/analyze-meal-photo', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
})
const responseFor = (analysis: unknown) => new Response(JSON.stringify({ status: 'completed', output: [
  { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(analysis) }] },
] }))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ id: 'user-1' })
  mocks.env.mockImplementation((name: string) => name === 'OPENAI_API_KEY' ? 'test-key' : undefined)
  fetchMock.mockResolvedValue(responseFor(estimate))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { vi.unstubAllGlobals(); vi.stubGlobal('Deno', { serve: vi.fn(), env: { get: mocks.env } }) })

describe('analyze-meal-photo endpoint', () => {
  it('authenticates before calling OpenAI and requests portion totals with no response storage', async () => {
    const response = await handleRequest(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ analysis: estimate })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    const sent = JSON.parse(options.body)
    expect(sent.store).toBe(false)
    expect(sent.text.format.type).toBe('json_schema')
    expect(sent.input[0].content[1].image_url).toBe('data:image/jpeg;base64,YQ==')
    expect(sent.instructions).toContain('COTTO/GIÀ PRONTO')
  })

  it('rejects unauthenticated requests without spending an OpenAI call', async () => {
    mocks.auth.mockResolvedValue(null)
    expect((await handleRequest(request())).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [{ ...body, mime_type: 'text/plain' }, 415],
    [{ ...body, image_base64: 'a' }, 413],
    [{ ...body, image_base64: 'a'.repeat(6 * 1024 * 1024) }, 413],
    [{ ...body, description: 'a'.repeat(1001) }, 400],
    [{ ...body, description: {} }, 400],
  ])('rejects malformed input before calling the model', async (payload, status) => {
    expect((await handleRequest(request(payload))).status).toBe(status)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('handles preflight without authentication', async () => {
    const response = await handleRequest(new Request('https://example.test', { method: 'OPTIONS' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    expect(mocks.auth).not.toHaveBeenCalled()
  })

  it('handles a non-meal, a refusal, incomplete JSON and invalid nutrition without saving anything', async () => {
    fetchMock.mockResolvedValueOnce(responseFor({ ...estimate, items: [] }))
    expect((await handleRequest(request())).status).toBe(422)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ output: [{ content: [{ type: 'refusal' }] }] })))
    expect((await handleRequest(request())).status).toBe(422)
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ status: 'incomplete', output: [] })))
    expect((await handleRequest(request())).status).toBe(502)
    fetchMock.mockResolvedValueOnce(responseFor({ ...estimate, items: [{ ...estimate.items[0], quantity_g: 1 }] }))
    expect((await handleRequest(request())).status).toBe(502)
  })

  it('returns a retryable error for rate limits and timeouts', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }))
    expect((await handleRequest(request())).status).toBe(429)
    fetchMock.mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'))
    expect((await handleRequest(request())).status).toBe(502)
    log.mockRestore()
  })
})
