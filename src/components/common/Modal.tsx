import { useEffect, useRef } from 'react'
import Icon from './Icon'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

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
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex h-[100dvh] justify-center lg:items-center lg:p-4 ${fullScreenOnMobile ? 'items-stretch bg-gray-800 lg:bg-transparent' : 'items-end'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Finestra di dialogo'}
        tabIndex={-1}
        className={`relative z-10 w-full overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:max-h-[92dvh] lg:max-w-xl lg:rounded-[18px] lg:border lg:border-gray-700/80 lg:bg-gray-800 lg:p-6 ${fullScreenOnMobile ? 'h-[100dvh] bg-gray-800 pt-[max(2rem,env(safe-area-inset-top))] lg:h-auto' : 'max-h-[92dvh] max-w-xl rounded-t-[18px] border border-gray-700/80 bg-gray-800 pt-3'}`}
      >
        {!fullScreenOnMobile && <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-600 lg:hidden" aria-hidden="true" />}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="icon-button"><Icon name="close" /></button>
          </div>
        )}
        {!title && fullScreenOnMobile && (
          <button type="button" onClick={onClose} aria-label="Chiudi" className="absolute right-5 top-[max(1.5rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center text-xl text-gray-400 lg:hidden">✕</button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
