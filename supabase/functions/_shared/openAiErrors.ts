// Never expose the provider's raw message: authentication errors can echo keys.
export async function openAiError(response: Response, model: string) {
  let code: string | null = null
  try {
    const body = await response.json()
    if (typeof body?.error?.code === 'string' && /^[a-z_]{1,80}$/.test(body.error.code)) code = body.error.code
  } catch { /* Gateways may return HTML rather than JSON. */ }
  const requestId = response.headers.get('x-request-id')
  console.error('OpenAI analysis request failed', { status: response.status, code, model, requestId })

  let status = 502
  let error = 'Il servizio di analisi ha rifiutato la richiesta. Riprova; se il problema continua, contatta chi gestisce l’app.'
  if (response.status === 401 && code === 'invalid_api_key') {
    status = 503
    error = 'L’analisi foto non è disponibile: la chiave API OpenAI del servizio non è valida o è stata revocata. Chi gestisce l’app deve aggiornarla; cambiare foto non risolve il problema.'
  } else if (response.status === 401) {
    status = 503
    error = 'OpenAI non accetta l’autenticazione del servizio. Chi gestisce l’app deve verificare la chiave API, il progetto e le eventuali restrizioni di accesso.'
  } else if (response.status === 403) {
    status = 503
    error = 'Il servizio non ha i permessi per usare OpenAI. Chi gestisce l’app deve verificare la chiave API e l’accesso al modello.'
  } else if (['insufficient_quota', 'billing_hard_limit_reached', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'].includes(code ?? '')) {
    status = 503
    error = 'Il credito o il budget OpenAI del servizio è esaurito oppure è stato raggiunto un limite di utilizzo. Chi gestisce l’app deve verificare fatturazione e limiti prima di riprovare.'
  } else if (response.status === 429) {
    status = 429
    error = 'OpenAI ha raggiunto il limite temporaneo di richieste. Attendi un minuto e riprova.'
  } else if (['invalid_image', 'invalid_image_format', 'invalid_base64_image', 'image_parse_error', 'image_too_small', 'image_too_large', 'unsupported_image'].includes(code ?? '')) {
    status = 422
    error = 'OpenAI non riesce a leggere questa immagine. Scegli un’altra foto JPEG, PNG o WebP e riprova.'
  } else if (response.status === 400 || response.status === 404) {
    status = 503
    error = 'La configurazione del servizio di analisi non è compatibile con OpenAI. Chi gestisce l’app deve verificare il modello e il formato della richiesta.'
  } else if (response.status >= 500) {
    status = 503
    error = 'OpenAI è temporaneamente non disponibile. Attendi qualche minuto e riprova.'
  }
  return { status, body: { error, code: code ?? `openai_http_${response.status}`,
    ...(requestId && /^req_[a-zA-Z0-9_-]{1,100}$/.test(requestId) ? { request_id: requestId } : {}) } }
}

export function openAiConnectionError(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : 'Unknown error'
  const timeout = ['TimeoutError', 'AbortError'].includes(name)
  console.error('OpenAI analysis connection failed', name)
  return { status: timeout ? 504 : 502, body: {
    error: timeout
      ? 'OpenAI ha impiegato troppo tempo per analizzare la foto. Riprova tra poco: foto e descrizione restano disponibili.'
      : 'Il server non riesce a raggiungere OpenAI. Riprova tra poco.',
    code: timeout ? 'analysis_timeout' : 'analysis_connection_failed',
  } }
}
