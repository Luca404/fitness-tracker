import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  showMobileClose?: boolean
}

export default function Modal({ open, onClose, children, title, showMobileClose = true }: Props) {
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
    <div className="fixed inset-0 z-[100] flex h-[100dvh] items-stretch justify-center bg-gray-800 lg:items-center lg:bg-transparent lg:p-4">
      <div className="absolute inset-0 hidden bg-black/70 backdrop-blur-sm lg:block" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Finestra di dialogo'}
        tabIndex={-1}
        className="relative z-10 h-full min-h-0 w-full overflow-y-auto overscroll-contain bg-gray-800 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl shadow-black/50 lg:h-auto lg:max-h-[92dvh] lg:max-w-md lg:rounded-[2rem] lg:border lg:border-gray-700/80 lg:bg-gray-800/95 lg:p-6"
      >
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="text-gray-400 text-xl">✕</button>
          </div>
        )}
        {!title && showMobileClose && (
          <div className="mb-4 flex justify-end lg:hidden">
            <button type="button" onClick={onClose} aria-label="Chiudi" className="flex h-10 w-10 items-center justify-center text-xl text-gray-400">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
