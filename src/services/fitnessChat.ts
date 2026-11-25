import { supabase } from './supabase'
import type { ChatMealConfirmation, ChatMessage, ChatReply } from '../../supabase/functions/_shared/fitnessChat'

async function invokeChat(body: { messages?: ChatMessage[]; confirmation?: ChatMealConfirmation; request_id: string }): Promise<ChatReply> {
  const { data, error } = await supabase.functions.invoke<ChatReply>('fittrackr-chat', {
    body, timeout: 40_000,
  })
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined
    if (status === 401) throw new Error('Sessione scaduta. Accedi di nuovo per usare la chat.')
    if (status === 404) throw new Error('La chat non è ancora disponibile in questo ambiente.')
    if (status === 429) throw new Error('Troppe richieste. Attendi un minuto e riprova.')
    if (status === 422) {
      const body = await (error.context as Response).clone().json().catch(() => null) as { error?: unknown } | null
      if (typeof body?.error === 'string') throw new Error(body.error)
    }
  }
  if (error || typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Non è arrivata una risposta. Riprova a inviare il messaggio.')
  }
  return { ...data, reply: data.reply.trim() }
}

export function askFitnessChat(messages: ChatMessage[], requestId: string) {
  return invokeChat({ messages, request_id: requestId })
}

export function confirmFitnessChatMeal({ draft, revision }: ChatMealConfirmation, requestId: string) {
  return invokeChat({ confirmation: { draft, revision }, request_id: requestId })
}

export async function transcribeFitnessChat(audio: Blob, signal: AbortSignal): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe-fitness-chat', {
    body: audio, headers: { 'Content-Type': audio.type }, signal, timeout: 30_000,
  })
  if (error?.context instanceof Response) {
    const response = error.context
    if (response.status === 404) throw new Error('La dettatura non è ancora disponibile in questo ambiente.')
    const body = await response.json().catch(() => null) as { error?: unknown } | null
    if (typeof body?.error === 'string') throw new Error(body.error)
  }
  if (error || typeof data?.text !== 'string' || !data.text.trim()) {
    throw new Error('Trascrizione non riuscita. Riprova o scrivi il messaggio.')
  }
  return data.text.trim()
}
