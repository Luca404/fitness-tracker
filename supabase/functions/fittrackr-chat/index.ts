import { getAuthenticatedUser } from '../_shared/auth.ts'
import { ASSISTANT_NAME, CHAT_CONTEXT_TURNS, CHAT_MESSAGE_LIMIT, CHAT_REPLY_LIMIT } from '../_shared/fitnessChat.ts'
import type { ChatMessage } from '../_shared/fitnessChat.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const instructions = `Sei ${ASSISTANT_NAME}, l’assistente AI di fitTrackr. Rispondi in italiano, in modo concreto e conciso, a domande generali su alimenti, porzioni e abitudini alimentari. Quando utile, indica che i valori nutrizionali variano con il prodotto e la preparazione. Non hai accesso al diario o al profilo e non puoi registrare pasti, modificare dati o analizzare allegati. Se l’utente chiede una di queste operazioni, spiega il limite e puoi orientarlo nella relativa sezione dell’app. Non fare diagnosi, non prescrivere diete terapeutiche e non presentarti come nutrizionista. Per domande cliniche o piani personalizzati rimanda a un professionista qualificato. Usa testo semplice.`

function json(body: { reply: string } | { error: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

function parseMessages(input: unknown): ChatMessage[] | null {
  if (!Array.isArray(input) || input.length % 2 !== 1 || input.length > CHAT_CONTEXT_TURNS * 2 + 1) return null
  const messages: ChatMessage[] = []
  for (const [index, message] of input.entries()) {
    const role = index % 2 === 0 ? 'user' : 'assistant'
    const content: unknown = message?.content
    const limit = role === 'user' ? CHAT_MESSAGE_LIMIT : CHAT_REPLY_LIMIT
    if (message?.role !== role || typeof content !== 'string' || content.length > limit || !content.trim()) return null
    messages.push({ role, content: content.trim() })
  }
  return messages
}

type OpenAiResponse = {
  status?: string
  output?: { type: string; content?: { type: string; text?: string; refusal?: string }[] }[]
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)
  if (!await getAuthenticatedUser(request)) return json({ error: 'Sessione non valida.' }, 401)

  let body: { messages?: unknown } | null
  try { body = await request.json() } catch { return json({ error: 'Richiesta non valida.' }, 400) }
  const messages = parseMessages(body?.messages)
  if (!messages) return json({ error: 'Messaggi non validi.' }, 400)

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'Chat non configurata.' }, 503)
  const model = Deno.env.get('OPENAI_FITTRACKR_CHAT_MODEL') || 'gpt-4.1-mini'
  const deadline = AbortSignal.timeout(32_000)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', signal: deadline,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, instructions, input: messages, store: false, max_output_tokens: 750 }),
    })
    if (!response.ok) {
      console.error('fitTrackr chat request failed', { status: response.status })
      return response.status === 429
        ? json({ error: 'Troppe richieste. Riprova tra poco.' }, 429)
        : json({ error: 'Chat temporaneamente non disponibile.' }, 502)
    }

    const result: OpenAiResponse = await response.json()
    const reply = result.output?.flatMap(item => item.type === 'message' ? item.content ?? [] : [])
      .map(part => part.type === 'output_text' ? part.text : part.type === 'refusal' ? part.refusal : undefined)
      .filter(Boolean).join('\n\n').trim().slice(0, CHAT_REPLY_LIMIT)
    if (result.status !== 'completed' || !reply) return json({ error: 'Risposta non disponibile.' }, 502)
    return json({ reply })
  } catch {
    return deadline.aborted
      ? json({ error: 'La chat ha impiegato troppo tempo.' }, 504)
      : json({ error: 'Chat temporaneamente non disponibile.' }, 502)
  }
}

Deno.serve(handleRequest)
