import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  fullScreenOnMobile?: boolean
}

export default function Modal({ open, onClose, children, title, fullScreenOnMobile = false }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const elements = [...panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )]
      if (elements.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className={`fixed inset-0 z-50 flex justify-center sm:items-center sm:p-4 ${fullScreenOnMobile ? 'items-stretch' : 'items-end'}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Finestra di dialogo'}
        tabIndex={-1}
        className={`relative z-10 w-full max-w-md overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/50 sm:max-h-[92dvh] sm:rounded-[2rem] sm:border sm:border-gray-700/80 sm:bg-gray-800/95 sm:p-6 ${fullScreenOnMobile ? 'h-[100dvh] max-h-[100dvh] rounded-none border-0 bg-gray-800 pt-[max(0.75rem,env(safe-area-inset-top))] sm:h-auto' : 'max-h-[92dvh] rounded-t-[2rem] border border-gray-700/80 bg-gray-800/95 pt-3'}`}
      >
        {!fullScreenOnMobile && <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-600 sm:hidden" aria-hidden="true" />}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="text-gray-400 text-xl">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
