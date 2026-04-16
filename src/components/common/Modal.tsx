import { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export default function Modal({ open, onClose, children, title }: Props) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-800 rounded-t-2xl p-6 z-10">
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 text-xl">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
