import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PantryItem } from '../types'

const mocks = vi.hoisted(() => ({
  getPantryItems: vi.fn(),
  addPantryItem: vi.fn(),
  updatePantryItem: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ showToast: mocks.showToast }),
}))

vi.mock('../services/api', () => mocks)

import PantryPage from './PantryPage'

function openManualForm() {
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi ingrediente/ }))
  fireEvent.click(screen.getByRole('button', { name: /Inserisci a mano/ }))
}

describe('PantryPage manual entry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPantryItems.mockResolvedValue([])
    mocks.addPantryItem.mockResolvedValue({})
    mocks.updatePantryItem.mockResolvedValue(undefined)
  })

  afterEach(cleanup)

  it('saves optional saturated fat, sugars, salt and fibre per 100 g', async () => {
    render(<PantryPage />)
    openManualForm()

    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Biscotti' } })
    fireEvent.change(screen.getByLabelText('Carboidrati totali (g/100g)'), { target: { value: '65' } })
    fireEvent.change(screen.getByLabelText('Grassi totali (g/100g)'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('di cui grassi saturi (g/100g)'), { target: { value: '8.5' } })
    fireEvent.change(screen.getByLabelText('di cui zuccheri (g/100g)'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('Sale (g/100g)'), { target: { value: '0.45' } })
    fireEvent.change(screen.getByLabelText('Fibre (g/100g)'), { target: { value: '4.2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi alla dispensa' }))

    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Biscotti', saturated_fat_100g: 8.5, sugars_100g: 22,
      salt_100g: 0.45, fiber_100g: 4.2,
    })))
  })

  it('keeps omitted values unknown rather than saving them as zero', async () => {
    render(<PantryPage />)
    openManualForm()

    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Pane' } })
    fireEvent.change(screen.getByLabelText('Sale (g/100g)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi alla dispensa' }))

    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledWith(expect.objectContaining({
      saturated_fat_100g: null, sugars_100g: null, salt_100g: 0, fiber_100g: null,
    })))
  })

  it('allows the new values to be corrected on a saved manual product', async () => {
    const item: PantryItem = {
      id: 'item-1', user_id: 'user-1', name: 'Biscotti', quantity: 100, unit: 'g',
      calories_100g: 450, protein_100g: 6, carbs_100g: 65, fat_100g: 20,
      saturated_fat_100g: 8.5, sugars_100g: 22, salt_100g: 0.45, fiber_100g: 4.2,
      category: 'sweet', food_key: null, source: 'manual', off_food_id: null, created_at: '',
    }
    mocks.getPantryItems.mockResolvedValue([item])
    render(<PantryPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Modifica Biscotti' }))
    fireEvent.change(screen.getByLabelText('di cui grassi saturi (g)'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Fibre (g)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(mocks.updatePantryItem).toHaveBeenCalledWith('item-1', expect.objectContaining({
      saturated_fat_100g: 7, sugars_100g: 22, salt_100g: 0.45, fiber_100g: null,
    })))
  })

  it('rejects sugars or saturated fat above their respective totals', () => {
    render(<PantryPage />)
    openManualForm()

    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Biscotti' } })
    fireEvent.change(screen.getByLabelText('di cui zuccheri (g/100g)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    expect(mocks.showToast).toHaveBeenCalledWith('Grassi saturi e zuccheri non possono superare i rispettivi totali')
    expect(screen.queryByRole('button', { name: 'Aggiungi alla dispensa' })).toBeNull()
  })
})
