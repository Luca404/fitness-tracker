import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'

const env = vi.hoisted(() => {
  const get = vi.fn((name: string) => ({ SUPABASE_URL: 'https://db.example', OPENAI_API_KEY: 'test-key' })[name])
  vi.stubGlobal('Deno', { serve: vi.fn(), env: { get } })
  return get
})
import { handleRequest } from './index'
import { localDate } from './diary'

const fetchMock = vi.fn()
const request = (messages: unknown, signedIn = true, extra: Record<string, unknown> = {}) => new Request('https://db.example/functions/v1/fittrackr-chat', {
  method: 'POST', headers: signedIn ? { Authorization: 'Bearer test-session', apikey: 'test-publishable-key' } : {},
  body: JSON.stringify({ messages, ...extra }),
})
const userMessage = { role: 'user', content: 'Idee per una colazione salata?' }

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Deno', { serve: vi.fn(), env: { get: env } })
  vi.stubGlobal('crypto', webcrypto)
})

const owner = '11111111-1111-4111-8111-111111111111'
const requestId = 'aaaa0000-0000-4000-8000-000000000001'
const authResponse = () => Response.json({ id: owner })
const toolResponse = (name: string, args: unknown) => Response.json({ status: 'completed', output: [
  { type: 'function_call', name, call_id: 'call_1', arguments: JSON.stringify(args) },
] })
const messageResponse = (text: string) => Response.json({ status: 'completed', output: [
  { type: 'message', content: [{ type: 'output_text', text }] },
] })
const mealMessage = (content: string) => [{ role: 'user', content }]
const draftFor = (name: string, amount = 150, source = 'auto', unit = 'g') => ({
  date: localDate(), meal_type: 'lunch', foods: [{ name, amount, unit, source }],
})

function mockDiaryBackend(model: (input: Record<string, unknown>) => Response, fixtures: Record<string, unknown> = {}) {
  const writes: Record<string, unknown>[] = []
  const modelInputs: Record<string, unknown>[] = []
  let receipt: unknown
  fetchMock.mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input)
    const data = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    if (url.pathname === '/auth/v1/user') return authResponse()
    if (url.hostname === 'api.openai.com') {
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
      modelInputs.push(data)
      return model(data)
    }
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-session')
    const resource = url.pathname.split('/').at(-1)!
    if (resource === 'record_fitness_chat_meal') {
      writes.push(data)
      receipt = { entry_id: 'meal-entry', date: data.p_date, meal_type: data.p_meal_type, name: data.p_name }
      return Response.json(receipt)
    }
    if (!url.pathname.includes('/rpc/') && resource !== 'dish_items') {
      expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`)
    }
    if (resource === 'fitness_chat_meal_receipts') return Response.json(receipt ? [receipt] : [])
    const fixture = fixtures[resource] ?? []
    const id = url.searchParams.get('id')?.slice(3)
    return Response.json(id && Array.isArray(fixture) ? fixture.filter(item => item.id === id) : fixture)
  })
  return { writes, modelInputs }
}

describe('Sagebite diary tools', () => {
  it('reads a bounded summary with the user JWT and passes just the tool output back to OpenAI', async () => {
    const date = localDate()
    let called = false
    const { writes, modelInputs } = mockDiaryBackend(() => {
      if (called) return messageResponse('Hai registrato 125 g di proteine in 1 giorno.')
      called = true
      return toolResponse('read_food_diary', { from: date, to: date, include_details: false, user_id: 'other-user' })
    }, { get_fitness_chat_diary: { days_logged: 1, daily_average: { protein_g: 125 } } })
    const response = await handleRequest(request(mealMessage('Quante proteine oggi?'), true, { request_id: requestId }))
    expect(await response.json()).toMatchObject({ reply: expect.stringContaining('125 g') })
    expect(writes).toEqual([])
    const rpc = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/get_fitness_chat_diary'))
    expect(JSON.parse(rpc![1].body)).toEqual({ p_from: date, p_to: date, p_detail: false })
    expect(modelInputs[1].input).toEqual(expect.arrayContaining([{
      type: 'function_call_output', call_id: 'call_1', output: '{"days_logged":1,"daily_average":{"protein_g":125}}',
    }]))
  })

  it('logs declared cooked rice via the diary RPC and fetches a receipt on retry', async () => {
    const { writes, modelInputs } = mockDiaryBackend(() => toolResponse('prepare_meal', draftFor('riso basmati cotto')))
    const incoming = () => request(mealMessage('Oggi a pranzo ho mangiato 150 g di riso basmati cotto.'), true, { request_id: requestId })
    const first = await handleRequest(incoming())
    expect(await first.json()).toMatchObject({ reply: expect.stringContaining('valori stimati dopo la cottura'), saved: { entry_id: 'meal-entry' } })
    expect(writes).toEqual([expect.objectContaining({ p_request_id: requestId, p_items: [expect.objectContaining({
      food_key: 'basic:riso-basmati', quantity_g: 150, calories: 178, protein_g: 4.45,
    })] })])
    const retry = await handleRequest(incoming())
    expect(await retry.json()).toMatchObject({ saved: { entry_id: 'meal-entry' } })
    expect(writes).toHaveLength(1)
    expect(modelInputs).toHaveLength(1)
  })

  it('clarifies raw versus cooked and performs no write', async () => {
    let called = false
    const { writes, modelInputs } = mockDiaryBackend(() => {
      if (called) return messageResponse('Era pesato crudo o cotto?')
      called = true
      return toolResponse('prepare_meal', draftFor('riso basmati'))
    })
    const response = await handleRequest(request(mealMessage('Oggi a pranzo ho mangiato 150 g di riso basmati'), true, { request_id: requestId }))
    expect(await response.json()).toEqual({ reply: 'Era pesato crudo o cotto?' })
    expect(writes).toEqual([])
    expect(JSON.stringify(modelInputs[1])).toContain('a crudo/secco o dopo la cottura')
  })

  it('requires a stable proposal before saving a recipe', async () => {
    const fixtures = { dishes: [{ id: 'recipe-id', name: 'Piatto di casa' }], dish_items: [
      { id: 'ingredient-id', food_name: 'Pasta', quantity_g: 80, calories: 280, protein_g: 10, carbs_g: 56, fat_g: 1.2, unit: 'g' },
    ] }
    const { writes, modelInputs } = mockDiaryBackend(() => toolResponse('prepare_meal', draftFor('Piatto di casa', 2, 'dish', 'portion')), fixtures)
    const response = await handleRequest(request(mealMessage('Segna due porzioni del Piatto di casa a pranzo'), true, { request_id: requestId }))
    const { proposal } = await response.json()
    expect(proposal.description).toContain('2 porzioni di Piatto di casa')
    expect(writes).toEqual([])
    fixtures.dish_items[0].quantity_g = 200
    const confirmation = () => request(undefined, true, { confirmation: proposal, request_id: requestId })
    expect((await handleRequest(confirmation())).status).toBe(422)
    expect(writes).toEqual([])
    fixtures.dish_items[0].quantity_g = 80
    expect(await (await handleRequest(confirmation())).json()).toMatchObject({ saved: { entry_id: 'meal-entry' } })
    expect(writes[0]).toMatchObject({ p_dish_id: 'recipe-id', p_items: [expect.objectContaining({ quantity_g: 160, dish_item_id: 'ingredient-id' })] })
    expect(modelInputs).toHaveLength(1)
  })

  it('keeps model-altered quantities and hypothetical examples out of direct saves', async () => {
    const { writes } = mockDiaryBackend(({ input }) => (input as unknown[]).length > 1
      ? messageResponse('È un esempio: nessun salvataggio.') : toolResponse('prepare_meal', draftFor('riso basmati cotto', 151)))
    const changed = await handleRequest(request(mealMessage('Oggi a pranzo ho mangiato 150 g di riso basmati cotto.'), true, { request_id: requestId }))
    expect(await changed.json()).toMatchObject({ proposal: expect.anything() })
    const hypothetical = await handleRequest(request(mealMessage('Se a pranzo avessi mangiato 151 g di riso basmati cotto?'), true, { request_id: requestId }))
    expect(await hypothetical.json()).toEqual({ reply: 'È un esempio: nessun salvataggio.' })
    expect(writes).toEqual([])
  })

  it('uses the existing pantry reference and portion nutrition', async () => {
    const { writes } = mockDiaryBackend(() => toolResponse('prepare_meal', draftFor('Yogurt personale')), { pantry_items: [{
      id: 'pantry-id', name: 'Yogurt personale', category: 'dairy', nutrition_unit: 'g', food_key: null, off_food_id: null,
      calories_100g: 60, protein_100g: 8, carbs_100g: 5, fat_100g: 1,
    }] })
    await handleRequest(request(mealMessage('Oggi a pranzo ho mangiato 150 g di Yogurt personale.'), true, { request_id: requestId }))
    expect(writes[0]).toMatchObject({ p_items: [expect.objectContaining({ pantry_item_id: 'pantry-id', quantity_g: 150, calories: 90, protein_g: 12 })] })
  })

  it('selects the requested batch from homonymous preparations and rechecks its remainder on confirmation', async () => {
    const batchId = '33333333-3333-4333-8333-333333333333'
    const batch = { id: batchId, remaining_g: 250, dish: { name: 'Risotto' }, created_at: '2026-11-20T11:30:00Z' }
    const olderBatch = { ...batch, id: '44444444-4444-4444-8444-444444444444', created_at: '2026-11-16T11:30:00Z' }
    const draft = draftFor('Risotto', 150, 'prepared')
    const { writes } = mockDiaryBackend(() => toolResponse('prepare_meal', { ...draft, foods: [{ ...draft.foods[0], item_id: batchId }] }),
      { prepared_batches: [olderBatch, batch] })
    const response = await handleRequest(request(mealMessage('Segna 150 g del risotto preparato il 20 a pranzo'), true, { request_id: requestId }))
    const { proposal } = await response.json()
    expect(proposal.description).toContain('20/11/2026')
    expect(writes).toEqual([])
    const confirmation = () => request(undefined, true, { confirmation: proposal, request_id: requestId })
    batch.remaining_g = 100
    expect((await handleRequest(confirmation())).status).toBe(422)
    expect(writes).toEqual([])
    batch.remaining_g = 200
    expect((await handleRequest(confirmation())).status).toBe(200)
    expect(writes[0]).toMatchObject({ p_batch_id: batchId, p_grams: 150, p_items: [] })
  })
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
