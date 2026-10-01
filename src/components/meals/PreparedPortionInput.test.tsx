import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PreparedPortionInput from './PreparedPortionInput'

describe('PreparedPortionInput', () => {
  afterEach(cleanup)
  it('uses fractions of the original cooked total and disables portions larger than the remainder', () => {
    const onChange = vi.fn()
    render(<PreparedPortionInput totalCookedG={600} remainingG={200} value={0} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1/4' }))
    expect(onChange).toHaveBeenCalledWith(150)
    expect((screen.getByRole('button', { name: '1/2' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tutto il resto' }))
    expect(onChange).toHaveBeenCalledWith(200)
  })

  it('rounds entered portion grams to two decimals', () => {
    const onChange = vi.fn()
    render(<PreparedPortionInput totalCookedG={200} remainingG={100} value={0} onChange={onChange} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Grammi mangiati' }), { target: { value: '12.345' } })
    expect(onChange).toHaveBeenCalledWith(12.35)
  })
})
