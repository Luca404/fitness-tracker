import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Modal from '../common/Modal'
import { askFitnessChat, confirmFitnessChatMeal } from '../../services/fitnessChat'
import { ASSISTANT_NAME, CHAT_CONTEXT_TURNS, CHAT_MEAL_LABELS, CHAT_MESSAGE_LIMIT } from '../../../supabase/functions/_shared/fitnessChat'
import type { ChatMealProposal, ChatMessage } from '../../../supabase/functions/_shared/fitnessChat'

const PROMPTS = ['Quante proteine ho registrato questa settimana?', 'Oggi a pranzo ho mangiato 150 g di riso basmati cotto']

function ChatIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.6-4A8.5 8.5 0 1 1 21 11.5Z" />
    <path d="M9 11.5h.01m3.5 0h.01m3.5 0h.01" strokeWidth="2.4" />
  </svg>
}

export default function FitnessChat({ onDiaryChange }: { onDiaryChange?: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [proposal, setProposal] = useState<{ meal: ChatMealProposal; requestId: string } | null>(null)
  const [error, setError] = useState('')
  const messageId = useId()
  const transcript = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const retry = useRef<{ content: string; id: string } | null>(null)
  const visibleMessages: ChatMessage[] = sending ? [...messages, { role: 'user', content: draft.trim() }] : messages

  useEffect(() => {
    const log = transcript.current
    if (open && log) log.scrollTop = log.scrollHeight
  }, [open, messages, sending, proposal])

  function refreshDiary() {
    void onDiaryChange?.().catch(() => { /* The registration is already committed in Supabase. */ })
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (sending || saving || !content) return
    setSending(true)
    setError('')
    const userMessage: ChatMessage = { role: 'user', content }
    const requestId = retry.current?.content === content ? retry.current.id : crypto.randomUUID()
    retry.current = { content, id: requestId }
    try {
      const result = await askFitnessChat([...messages.slice(-CHAT_CONTEXT_TURNS * 2), userMessage], requestId)
      setMessages(current => [...current, userMessage, { role: 'assistant', content: result.reply }])
      setProposal(result.proposal ? { meal: result.proposal, requestId } : null)
      if (result.saved) refreshDiary()
      retry.current = null
      setDraft('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invio non riuscito. Riprova tra poco.')
    } finally {
      setSending(false)
    }
  }

  async function confirm() {
    if (!proposal || sending || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await confirmFitnessChatMeal(proposal.meal, proposal.requestId)
      if (!result.saved) throw new Error('Registrazione non confermata. Riprova tra poco.')
      setMessages(current => [...current.slice(0, -1), { role: 'assistant', content: result.reply }])
      setProposal(null)
      transcript.current?.focus()
      refreshDiary()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registrazione non riuscita. Riprova tra poco.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <button type="button" aria-label={`Apri chat con ${ASSISTANT_NAME}`} title={ASSISTANT_NAME} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center gap-3 rounded-xl bg-primary-500/10 text-primary-300 transition-colors hover:bg-primary-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 lg:h-12 lg:w-full lg:justify-start lg:border lg:border-primary-500/25 lg:px-4">
      <ChatIcon />
      <span className="hidden text-sm font-semibold lg:inline">{ASSISTANT_NAME}</span>
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={ASSISTANT_NAME}>
      <div className="flex h-[min(33rem,66dvh)] flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          {visibleMessages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col justify-[safe_center] gap-4 overflow-y-auto pb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-500/25 bg-primary-500/10 text-primary-300">
                <ChatIcon size={25} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Come posso aiutarti?</h3>
                <p className="mt-1 text-sm text-gray-300">Chiedimi dei tuoi pasti o dimmi cosa hai mangiato.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {PROMPTS.map(prompt => (
                  <button key={prompt} type="button" onClick={() => { setDraft(prompt); input.current?.focus() }}
                    className="min-h-11 rounded-xl border border-gray-600 bg-gray-900/40 px-3 py-2 text-left text-sm text-primary-200 hover:border-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={transcript} role="log" aria-label="Conversazione" tabIndex={0} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg py-2 pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">
              {visibleMessages.map(({ role, content }, index) => (
                <div key={index} className={role === 'user' ? 'ml-auto w-fit max-w-[90%] rounded-2xl bg-primary-900/60 px-4 py-2.5 text-primary-50' : 'mr-auto w-fit max-w-full rounded-2xl bg-gray-900 px-4 py-3 text-gray-100'}>
                  <p className="mb-1 text-xs font-semibold text-primary-300">{role === 'user' ? 'Tu' : ASSISTANT_NAME}</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{content}</p>
                </div>
              ))}
              {sending && <p role="status" className="px-1 text-sm text-gray-300">{ASSISTANT_NAME} sta rispondendo…</p>}
              {proposal && !sending && <div className="space-y-2 rounded-xl border border-primary-500/30 bg-gray-900 p-3">
                <p className="text-sm font-semibold text-primary-200">{CHAT_MEAL_LABELS[proposal.meal.draft.meal_type]} del {proposal.meal.draft.date.split('-').reverse().join('/')}</p>
                <p className="break-words text-sm text-gray-200">{proposal.meal.description}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary min-h-11 text-sm disabled:opacity-60" disabled={saving} onClick={() => void confirm()}>{saving ? 'Registrazione…' : 'Registra pasto'}</button>
                  <button type="button" className="btn-secondary min-h-11 text-sm disabled:opacity-60" disabled={saving} onClick={() => { setProposal(null); setError(''); input.current?.focus() }}>Scarta</button>
                </div>
              </div>}
            </div>
          )}
        </div>
        <form onSubmit={send} className="shrink-0 border-t border-gray-700 pt-3">
          {error && <p role="alert" className="mb-2 text-sm text-red-300">{error}</p>}
          <label htmlFor={messageId} className="mb-1 block text-sm font-semibold text-gray-200">Messaggio</label>
          <div className="flex items-end gap-2">
            <textarea ref={input} id={messageId} rows={2} maxLength={CHAT_MESSAGE_LIMIT} value={sending ? '' : draft} readOnly={sending || saving}
              aria-describedby={`${messageId}-scope`} onChange={event => setDraft(event.target.value)}
              className="input-field min-w-0 resize-none bg-gray-900 text-base leading-5" />
            <button type="submit" aria-label="Invia messaggio" disabled={sending || saving || !draft.trim()}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-400 text-gray-950 hover:bg-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:bg-gray-700 disabled:text-gray-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" />
              </svg>
            </button>
          </div>
          <p id={`${messageId}-scope`} className="mt-2 text-xs text-gray-300">OpenAI elabora i messaggi e i dati pertinenti alla richiesta. {ASSISTANT_NAME} è un assistente AI e non sostituisce un nutrizionista.</p>
        </form>
      </div>
    </Modal>
  </>
}
