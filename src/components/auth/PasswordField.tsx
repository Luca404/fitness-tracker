import { useState } from 'react'

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
  hint?: string
  disabled?: boolean
}

export default function PasswordField({ id, label, value, onChange, autoComplete, error, hint, disabled }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-gray-200">{label}</label>
      <div className="relative">
        <input
          id={id} name={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete}
          value={value} onChange={event => onChange(event.target.value)}
          aria-invalid={!!error} aria-describedby={descriptionId} required disabled={disabled}
          className={`input-field py-3 pr-12 ${error ? 'border-red-400/70' : ''}`}
        />
        <button
          type="button" aria-label={`${visible ? 'Nascondi' : 'Mostra'} ${label.toLowerCase()}`} aria-pressed={visible}
          onClick={() => setVisible(!visible)} disabled={disabled}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-lg text-gray-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      {error && <p id={`${id}-error`} className="mt-2 text-xs text-red-300">{error}</p>}
      {!error && hint && <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-gray-400">{hint}</p>}
    </div>
  )
}
