import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getPantryItems: vi.fn().mockResolvedValue([]), showToast: vi.fn() }))

vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast }) }))

import FoodSearch from './FoodSearch'

describe('FoodSearch manual entry', () => {
  afterEach(cleanup)

  it('places sugars below total carbohydrates', () => {
    render(<FoodSearch onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Inseriscilo manualmente/ }))

    const carbsGroup = screen.getByRole('group', { name: 'Carboidrati' })
    expect(within(carbsGroup).getByText('Carboidrati totali')).toBeTruthy()
    expect(within(carbsGroup).getByText('di cui zuccheri (facoltativo)')).toBeTruthy()
    expect(within(carbsGroup).getByRole('spinbutton', { name: 'di cui zuccheri (facoltativo)' })).toBeTruthy()
  })
})
