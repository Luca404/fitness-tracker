import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NumberInput from './NumberInput'
import NumberFormatSettings from '../settings/NumberFormatSettings'
import { useNumberFormat } from '../../hooks/useNumberFormat'
import { DECIMAL_SEPARATOR_KEY, setDecimalSeparator } from '../../utils/numberPreferences'

function Harness() {
  const [value, setValue] = useState('12.35')
  const { formatDecimal } = useNumberFormat()
  return <>
    <NumberFormatSettings />
    <NumberInput aria-label="Misura" value={value} onValueChange={setValue} min={0} max={100} step={0.1} placeholder="Es. 1.5" />
    <output aria-label="Valore interno">{value}</output>
    <output aria-label="Riepilogo">{formatDecimal(Number(value), 2)}</output>
  </>
}

beforeEach(() => { localStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); setDecimalSeparator('.'); localStorage.clear() })

it('converts commas to dots immediately, including pasted decimals, without losing precision on blur', () => {
  render(<Harness />)
  const input = screen.getByRole('spinbutton', { name: 'Misura' }) as HTMLInputElement
  expect(input.value).toBe('12.35')
  expect((screen.getByLabelText('Punto (.)') as HTMLInputElement).checked).toBe(true)
  fireEvent.change(input, { target: { value: '2,75' } })
  expect(input.value).toBe('2.75')
  expect(screen.getByLabelText('Valore interno').textContent).toBe('2.75')
  fireEvent.blur(input)
  expect(input.value).toBe('2.75')
  fireEvent.change(input, { target: { value: '' } })
  expect(input.value).toBe('')
  fireEvent.change(input, { target: { value: '0,' } })
  expect(input.value).toBe('0.')
  fireEvent.change(input, { target: { value: '0,25' } })
  expect(input.value).toBe('0.25')
})

it('updates inputs and summaries immediately and persists the chosen separator across remounts', () => {
  const { unmount } = render(<Harness />)
  fireEvent.click(screen.getByLabelText('Virgola (,)'))
  const input = screen.getByRole('spinbutton', { name: 'Misura' }) as HTMLInputElement
  expect(input.value).toBe('12,35')
  expect(input.placeholder).toBe('Es. 1,5')
  expect(screen.getByLabelText('Riepilogo').textContent).toBe('12,35')
  expect(screen.getByLabelText('Valore interno').textContent).toBe('12.35')
  fireEvent.change(input, { target: { value: '1.25' } })
  expect(input.value).toBe('1,25')
  expect(screen.getByLabelText('Valore interno').textContent).toBe('1.25')
  expect(localStorage.getItem(DECIMAL_SEPARATOR_KEY)).toBe(',')
  unmount()
  render(<Harness />)
  expect((screen.getByRole('spinbutton', { name: 'Misura' }) as HTMLInputElement).value).toBe('12,35')
  expect((screen.getByLabelText('Virgola (,)') as HTMLInputElement).checked).toBe(true)
})

it('handles keyboard increments, invalid pasted values and preference changes from another tab', () => {
  render(<Harness />)
  const input = screen.getByRole('spinbutton', { name: 'Misura' }) as HTMLInputElement
  fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(screen.getByLabelText('Valore interno').textContent).toBe('12.45')
  fireEvent.change(input, { target: { value: '1,2.3' } })
  expect(input.value).toBe('12.45')
  act(() => {
    localStorage.setItem(DECIMAL_SEPARATOR_KEY, ',')
    window.dispatchEvent(new StorageEvent('storage', { key: DECIMAL_SEPARATOR_KEY, newValue: ',' }))
  })
  expect(input.value).toBe('12,45')
  act(() => setDecimalSeparator('.'))
  expect(input.value).toBe('12.45')
})

it('keeps unfinished signed decimals editable without emitting NaN', () => {
  function NumericHarness() {
    const [value, setValue] = useState(0)
    return <><NumberInput aria-label="Angolo" value={value} onValueChange={raw => setValue(Number(raw))} min={-90} max={90} />
      <output aria-label="Angolo interno">{value}</output></>
  }
  render(<NumericHarness />)
  const input = screen.getByRole('spinbutton', { name: 'Angolo' }) as HTMLInputElement
  fireEvent.change(input, { target: { value: '-' } })
  expect(input.value).toBe('-')
  expect(screen.getByLabelText('Angolo interno').textContent).toBe('0')
  fireEvent.change(input, { target: { value: '-12,5' } })
  expect(input.value).toBe('-12.5')
  expect(screen.getByLabelText('Angolo interno').textContent).toBe('-12.5')
})

it('keeps the preference usable for this session when saving to storage fails', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded', 'QuotaExceededError') })
  render(<Harness />)
  fireEvent.click(screen.getByLabelText('Virgola (,)'))
  expect((screen.getByRole('spinbutton', { name: 'Misura' }) as HTMLInputElement).value).toBe('12,35')
  expect(screen.getByLabelText('Riepilogo').textContent).toBe('12,35')
})
