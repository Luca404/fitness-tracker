import { supabase } from './supabase'
import type { ChatMessage } from '../../supabase/functions/_shared/fitnessChat'

export async function askFitnessChat(messages: ChatMessage[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ reply: string }>('fittrackr-chat', {
    body: { messages }, timeout: 40_000,
  })
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined
    if (status === 401) throw new Error('Sessione scaduta. Accedi di nuovo per usare la chat.')
    if (status === 404) throw new Error('La chat non è ancora disponibile in questo ambiente.')
    if (status === 429) throw new Error('Troppe richieste. Attendi un minuto e riprova.')
  }
  if (error || typeof data?.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Non è arrivata una risposta. Riprova a inviare il messaggio.')
  }
  return data.reply.trim()
}
