import { useLayoutEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react'
import { useNumberFormat } from '../../hooks/useNumberFormat'
import { roundToTwo } from '../../utils/decimal'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value' | 'defaultValue'> & {
  value: number | string
  onValueChange: (value: string) => void
}

/** Visible separator follows the preference; callbacks always receive a canonical dot. */
export default function NumberInput({ value, onValueChange, onBlur, onKeyDown, min, max, step, placeholder, inputMode = 'decimal', ...props }: Props) {
  const { decimalSeparator } = useNumberFormat()
  const input = useRef<HTMLInputElement>(null)
  const caret = useRef<{ start: number | null; end: number | null } | null>(null)
  const [draft, setDraft] = useState<{ raw: string; previousValue: Props['value'] } | null>(null)
  const canonicalValue = String(value).replace(',', '.')
  const incomplete = draft !== null && draft.raw !== '' && /^[+-]?(?:\.)?$/.test(draft.raw)
  const keepDraft = draft !== null && (Object.is(value, draft.previousValue)
    || (draft.raw !== '' && Number(draft.raw) === Number(canonicalValue))
    || (incomplete && Number(canonicalValue) === 0))
  const visible = (keepDraft ? draft.raw : canonicalValue).replace('.', decimalSeparator)

  useLayoutEffect(() => {
    if (caret.current) {
      input.current?.setSelectionRange(caret.current.start, caret.current.end)
      caret.current = null
    }
  }, [visible, draft])

  function change(raw: string) {
    const canonical = raw.replace(/,/g, '.')
    if (!/^[+-]?\d*(?:\.\d*)?$/.test(canonical)) { caret.current = null; return }
    setDraft({ raw: canonical, previousValue: value })
    onValueChange(canonical !== '' && /^[+-]?(?:\.)?$/.test(canonical) ? '' : canonical)
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') || props.readOnly) return
    event.preventDefault()
    const increment = step == null || step === 'any' ? 1 : Number(step)
    const current = Number(keepDraft ? draft.raw : canonicalValue)
    const next = (Number.isFinite(current) ? current : 0) + (event.key === 'ArrowUp' ? increment : -increment)
    change(String(roundToTwo(Math.min(max == null ? Infinity : Number(max), Math.max(min == null ? -Infinity : Number(min), next)))))
  }

  return <input {...props} ref={input} type="text" role="spinbutton" inputMode={inputMode}
    min={min} max={max} step={step} value={visible}
    placeholder={placeholder?.replace(/(\d)[.,](?=\d)/g, `$1${decimalSeparator}`)}
    aria-valuemin={min == null ? undefined : Number(min)} aria-valuemax={max == null ? undefined : Number(max)}
    aria-valuenow={visible !== '' && Number.isFinite(Number(visible.replace(',', '.'))) ? Number(visible.replace(',', '.')) : undefined}
    onChange={event => {
      caret.current = { start: event.target.selectionStart, end: event.target.selectionEnd }
      change(event.target.value)
    }} onKeyDown={keyDown}
    onBlur={event => { setDraft(null); onBlur?.(event) }} />
}
