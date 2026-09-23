import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DishIconChoices from './DishIconChoices'

describe('dish icon choices', () => {
  it('lets the user choose a dish icon or restore the first ingredient icon', () => {
    const onSelect = vi.fn()
    render(<DishIconChoices automaticIcon="🍚" selectedIcon="🍝" onSelect={onSelect} />)

    expect(screen.getByRole('button', { name: 'Pasta' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Insalata' }))
    expect(onSelect).toHaveBeenCalledWith('🥗')

    fireEvent.click(screen.getByRole('button', { name: /Automatica/ }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })
})
