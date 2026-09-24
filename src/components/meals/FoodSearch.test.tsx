import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('copies updated pantry nutrients into a new meal ingredient', async () => {
    const onAdd = vi.fn()
    mocks.getPantryItems.mockResolvedValueOnce([{
      id: 'pantry-1', name: 'Mela', quantity: 500, unit: 'g', category: 'fruit',
      food_key: 'basic:mela', calories_100g: 52, protein_100g: 0.3,
      carbs_100g: 14, fat_100g: 0.2, fiber_100g: 2.4,
      sugars_100g: 10, salt_100g: 0.01,
    }])
    render(<FoodSearch onAdd={onAdd} onClose={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText('Cerca un ingrediente...'), { target: { value: 'Mela' } })
    fireEvent.click(await screen.findByRole('button', { name: /🧺 Mela/ }))
    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi ingrediente' }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      pantry_item_id: 'pantry-1', fiber_g: 2.4, sugars_g: 10, salt_g: 0.01,
    })))
  })
})
