import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import Modal from '../common/Modal'
import { askFitnessChat } from '../../services/fitnessChat'
import { ASSISTANT_NAME, CHAT_CONTEXT_TURNS, CHAT_MESSAGE_LIMIT } from '../../../supabase/functions/_shared/fitnessChat'
import type { ChatMessage } from '../../../supabase/functions/_shared/fitnessChat'

const PROMPTS = ['Idee per una colazione salata?', 'Che differenza c’è tra peso crudo e cotto?']

function ChatIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l1.6-4A8.5 8.5 0 1 1 21 11.5Z" />
    <path d="M9 11.5h.01m3.5 0h.01m3.5 0h.01" strokeWidth="2.4" />
  </svg>
}

export default function FitnessChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messageId = useId()
  const transcript = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const visibleMessages: ChatMessage[] = sending ? [...messages, { role: 'user', content: draft.trim() }] : messages

  useEffect(() => {
    const log = transcript.current
    if (open && log) log.scrollTop = log.scrollHeight
  }, [open, messages, sending])

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (sending || !content) return
    setSending(true)
    setError('')
    const userMessage: ChatMessage = { role: 'user', content }
    try {
      const reply = await askFitnessChat([...messages.slice(-CHAT_CONTEXT_TURNS * 2), userMessage])
      setMessages(current => [...current, userMessage, { role: 'assistant', content: reply }])
      setDraft('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invio non riuscito. Riprova tra poco.')
    } finally {
      setSending(false)
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
                <p className="mt-1 text-sm text-gray-300">Fammi una domanda su alimenti, porzioni o abitudini.</p>
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
            </div>
          )}
        </div>
        <form onSubmit={send} className="shrink-0 border-t border-gray-700 pt-3">
          {error && <p role="alert" className="mb-2 text-sm text-red-300">{error}</p>}
          <label htmlFor={messageId} className="mb-1 block text-sm font-semibold text-gray-200">Messaggio</label>
          <div className="flex items-end gap-2">
            <textarea ref={input} id={messageId} rows={2} maxLength={CHAT_MESSAGE_LIMIT} value={sending ? '' : draft} readOnly={sending}
              aria-describedby={`${messageId}-scope`} onChange={event => setDraft(event.target.value)}
              className="input-field min-w-0 resize-none bg-gray-900 text-base leading-5" />
            <button type="submit" aria-label="Invia messaggio" disabled={sending || !draft.trim()}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-400 text-gray-950 hover:bg-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:bg-gray-700 disabled:text-gray-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" />
              </svg>
            </button>
          </div>
          <p id={`${messageId}-scope`} className="mt-2 text-xs text-gray-300">I messaggi vengono elaborati da OpenAI. {ASSISTANT_NAME} è un assistente AI e non sostituisce un nutrizionista.</p>
        </form>
      </div>
    </Modal>
  </>
}
