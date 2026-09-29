import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PreparedPortionInput from './PreparedPortionInput'

describe('PreparedPortionInput', () => {
  it('uses fractions of the original cooked total and disables portions larger than the remainder', () => {
    const onChange = vi.fn()
    render(<PreparedPortionInput totalCookedG={600} remainingG={200} value={0} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1/4' }))
    expect(onChange).toHaveBeenCalledWith(150)
    expect((screen.getByRole('button', { name: '1/2' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tutto il resto' }))
    expect(onChange).toHaveBeenCalledWith(200)
  })
})
