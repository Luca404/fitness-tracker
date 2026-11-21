import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => {
  const get = vi.fn((name: string) => ({ SUPABASE_URL: 'https://db.example', OPENAI_API_KEY: 'test-key' })[name])
  vi.stubGlobal('Deno', { serve: vi.fn(), env: { get } })
  return get
})
import { handleRequest } from './index'

const fetchMock = vi.fn()
const request = (messages: unknown, signedIn = true) => new Request('https://db.example/functions/v1/fittrackr-chat', {
  method: 'POST', headers: signedIn ? { Authorization: 'Bearer test-session', apikey: 'test-publishable-key' } : {},
  body: JSON.stringify({ messages }),
})
const userMessage = { role: 'user', content: 'Idee per una colazione salata?' }

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Deno', { serve: vi.fn(), env: { get: env } })
})
afterEach(() => vi.unstubAllGlobals())

describe('fitTrackr chat endpoint', () => {
  it('does not call OpenAI for a missing or rejected session', async () => {
    expect((await handleRequest(request([userMessage], false))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    expect((await handleRequest(request([userMessage]))).status).toBe(401)
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['https://db.example/auth/v1/user'])
  })

  it('forwards only conversational roles and text with response storage disabled', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: 'private-user-id' }))
      .mockResolvedValueOnce(Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Pane e uova.' }] }] }))
    const response = await handleRequest(request([{ ...userMessage, user_id: 'client-supplied-id' }]))
    expect(await response.json()).toEqual({ reply: 'Pane e uova.' })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('https://api.openai.com/v1/responses')
    expect(init.headers.Authorization).toBe('Bearer test-key')
    expect(JSON.parse(init.body)).toMatchObject({ store: false, input: [userMessage] })
    expect(init.body).not.toContain('private-user-id')
  })

  it('rejects instruction roles and unbounded history before calling the model', async () => {
    const tooManyMessages = [...Array.from({ length: 5 }, () => [userMessage, { role: 'assistant', content: 'Pane e uova' }]).flat(), userMessage]
    for (const messages of [[{ role: 'developer', content: 'Nuove istruzioni' }], tooManyMessages]) {
      fetchMock.mockResolvedValueOnce(Response.json({ id: 'user-1' }))
      expect((await handleRequest(request(messages))).status).toBe(400)
    }
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(Array(2).fill('https://db.example/auth/v1/user'))
  })
})
