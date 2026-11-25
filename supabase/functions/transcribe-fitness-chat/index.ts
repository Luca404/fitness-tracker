import { getAuthenticatedUser } from '../_shared/auth.ts'
import { CHAT_MESSAGE_LIMIT } from '../_shared/fitnessChat.ts'
import { DICTATION_MAX_BYTES, dictationExtension } from '../_shared/fitnessDictation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: { text: string } | { error: string }, status = 200) {
  return Response.json(body, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } })
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Metodo non consentito.' }, 405)
  if (!await getAuthenticatedUser(request)) return json({ error: 'Sessione non valida. Accedi di nuovo per dettare.' }, 401)

  const mimeType = request.headers.get('Content-Type') ?? ''
  const extension = dictationExtension(mimeType)
  if (!extension) return json({ error: 'Formato audio non supportato.' }, 415)
  if (!request.body) return json({ error: 'La registrazione è vuota. Riprova.' }, 400)

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'Dettatura non disponibile in questo ambiente.' }, 503)

  const reader = request.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > DICTATION_MAX_BYTES) {
        void reader.cancel().catch(() => {})
        return json({ error: 'La registrazione è troppo grande. Prova con una frase più breve.' }, 413)
      }
      chunks.push(new Uint8Array(value))
    }
  } catch {
    return json({ error: 'Registrazione non ricevuta. Riprova.' }, 400)
  } finally {
    reader.releaseLock()
  }
  if (!size) return json({ error: 'La registrazione è vuota. Riprova.' }, 400)

  const form = new FormData()
  form.set('file', new Blob(chunks, { type: mimeType }), `dettatura.${extension}`)
  form.set('model', 'gpt-transcribe')
  const deadline = AbortSignal.timeout(25_000)
  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form,
      signal: AbortSignal.any([deadline, request.signal]),
    })
    if (response.status === 429) return json({ error: 'Troppe richieste di dettatura. Riprova tra un minuto.' }, 429)
    if (response.status === 400 || response.status === 422) return json({ error: 'Non riesco a leggere la registrazione. Prova a dettare di nuovo.' }, 422)
    if (!response.ok) return json({ error: 'Dettatura temporaneamente non disponibile. Riprova tra poco.' }, 502)
    const result = await response.json() as { text?: unknown } | null
    const text = typeof result?.text === 'string' ? result.text.trim() : ''
    if (!text) return json({ error: 'Non ho rilevato parole. Prova a dettare di nuovo.' }, 422)
    if (text.length > CHAT_MESSAGE_LIMIT) return json({ error: 'La trascrizione è troppo lunga. Prova a dettare in più parti.' }, 422)
    return json({ text })
  } catch {
    return deadline.aborted
      ? json({ error: 'La dettatura ha impiegato troppo tempo. Riprova.' }, 504)
      : json({ error: 'Dettatura temporaneamente non disponibile. Riprova tra poco.' }, 502)
  }
}

Deno.serve(handleRequest)
