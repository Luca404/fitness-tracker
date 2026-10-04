import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PantryItem } from '../types'

const mocks = vi.hoisted(() => ({
  getPantryItems: vi.fn(),
  addPantryItem: vi.fn(),
  updatePantryItem: vi.fn(),
  showToast: vi.fn(),
  refreshDiary: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ showToast: mocks.showToast, refreshDiary: mocks.refreshDiary }),
}))

vi.mock('../services/api', () => mocks)

import PantryPage from './PantryPage'

function openManualForm() {
  fireEvent.click(screen.getByRole('button', { name: /Aggiungi ingrediente/ }))
  fireEvent.click(screen.getByRole('button', { name: /Inserisci a mano/ }))
}

function click(name: string) { fireEvent.click(screen.getByRole('button', { name })) }
function enterManual(name = 'Lenticchie') {
  click('+ Aggiungi ingrediente')
  click('✏️ Inserisci a mano')
  fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Calorie (kcal/100g)'), { target: { value: '120.5' } })
  click('Continua')
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

    expect(within(screen.getByRole('group', { name: 'Carboidrati' })).getByLabelText('Zuccheri (g/100g)')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Grassi' })).getByLabelText('di cui grassi saturi (g/100g)')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Biscotti' } })
    fireEvent.change(screen.getByLabelText('Carboidrati (g/100g)'), { target: { value: '65' } })
    fireEvent.change(screen.getByLabelText('Grassi (g/100g)'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('di cui grassi saturi (g/100g)'), { target: { value: '8.5' } })
    fireEvent.change(screen.getByLabelText('Zuccheri (g/100g)'), { target: { value: '22' } })
    fireEvent.change(screen.getByLabelText('Sale (g/100g)'), { target: { value: '0.45' } })
    fireEvent.change(screen.getByLabelText('Fibre (g/100g)'), { target: { value: '4.2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva ingrediente' }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Salva ingrediente' }))

    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledWith(expect.objectContaining({
      saturated_fat_100g: null, sugars_100g: null, salt_100g: 0, fiber_100g: null,
    })))
  })

  it('keeps fibre, sugars and salt when saving a basic food', async () => {
    render(<PantryPage />)
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi ingrediente/ }))
    fireEvent.click(screen.getByRole('button', { name: /Cerca alimento base/ }))
    fireEvent.change(screen.getByPlaceholderText('Cerca alimento base...'), { target: { value: 'mela' } })
    fireEvent.click(screen.getByRole('button', { name: /Mela.*52 kcal\/100g/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Salva ingrediente' }))

    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mela', source: 'basic', food_key: 'basic:mela',
      fiber_100g: 1.4, sugars_100g: 11.5, salt_100g: 0,
    })))
  })

  it('allows the new values to be corrected on a saved manual product', async () => {
    const item: PantryItem = {
      id: 'item-1', user_id: 'user-1', name: 'Biscotti', nutrition_unit: 'g',
      calories_100g: 450, protein_100g: 6, carbs_100g: 65, fat_100g: 20,
      saturated_fat_100g: 8.5, sugars_100g: 22, salt_100g: 0.45, fiber_100g: 4.2,
      category: 'sweet', food_key: null, source: 'manual', off_food_id: null, created_at: '',
    }
    mocks.getPantryItems.mockResolvedValue([item])
    render(<PantryPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Modifica Biscotti' }))
    expect(within(screen.getByRole('group', { name: 'Carboidrati' })).getByLabelText('Zuccheri (g)')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Grassi' })).getByLabelText('di cui grassi saturi (g)')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('di cui grassi saturi (g)'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Fibre (g)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(mocks.updatePantryItem).toHaveBeenCalledWith('item-1', expect.objectContaining({
      saturated_fat_100g: 7, sugars_100g: 22, salt_100g: 0.45, fiber_100g: null,
    })))
  })

  it('allows fibre corrections on a pantry item created from a basic food', async () => {
    const item: PantryItem = {
      id: 'item-basic', user_id: 'user-1', name: 'Mela', nutrition_unit: 'g',
      calories_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2,
      fiber_100g: null, category: 'fruit', food_key: 'basic:mela',
      source: 'basic', off_food_id: null, created_at: '',
    }
    mocks.getPantryItems.mockResolvedValue([item])
    render(<PantryPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Modifica Mela' }))
    fireEvent.change(screen.getByLabelText('Fibre (g)'), { target: { value: '2.4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva modifiche' }))

    await waitFor(() => expect(mocks.updatePantryItem).toHaveBeenCalledWith('item-basic', expect.objectContaining({
      fiber_100g: 2.4,
    })))
  })

  it('rejects sugars or saturated fat above their respective totals', () => {
    render(<PantryPage />)
    openManualForm()

    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Biscotti' } })
    fireEvent.change(screen.getByLabelText('Zuccheri (g/100g)'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continua' }))

    expect(mocks.showToast).toHaveBeenCalledWith('Grassi saturi e zuccheri non possono superare i rispettivi totali')
    expect(screen.queryByRole('button', { name: 'Aggiungi alla dispensa' })).toBeNull()
  })
  it('saves manual ingredients with unknown optional nutrients and resets the flow after cancellation', async () => {
    render(<PantryPage />)
    await screen.findByText(/Nessun ingrediente salvato/)
    enterManual('Da annullare')
    click('Annulla')
    click('+ Aggiungi ingrediente')
    click('✏️ Inserisci a mano')
    expect((screen.getByLabelText('Nome alimento') as HTMLInputElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Nome alimento'), { target: { value: 'Lenticchie' } })
    fireEvent.change(screen.getByLabelText('Calorie (kcal/100g)'), { target: { value: '120.5' } })
    click('Continua')
    click('Salva ingrediente')
    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1', name: 'Lenticchie', calories_100g: 120.5, nutrition_unit: 'g',
      fiber_100g: null, sugars_100g: null, salt_100g: null,
    })))
    await screen.findByRole('button', { name: '+ Aggiungi ingrediente' })
  })
  it('does not retain the editing ID when starting a new ingredient after cancelling an edit', async () => {
    mocks.getPantryItems.mockResolvedValue([{ id: 'existing', user_id: 'user-1', name: 'Latte',
      category: 'beverage', source: 'manual', nutrition_unit: 'ml', calories_100g: 50,
      protein_100g: 3, carbs_100g: 5, fat_100g: 2, food_key: null, off_food_id: null }])
    render(<PantryPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Modifica Latte' }))
    expect((screen.getByLabelText('Nome alimento') as HTMLInputElement).value).toBe('Latte')
    click('Annulla')
    enterManual()
    click('Salva ingrediente')
    await waitFor(() => expect(mocks.addPantryItem).toHaveBeenCalledTimes(1))
    expect(mocks.updatePantryItem).not.toHaveBeenCalled()
    await screen.findByRole('button', { name: '+ Aggiungi ingrediente' })
  })

  it('refreshes the diary after correcting a saved ingredient', async () => {
    mocks.getPantryItems.mockResolvedValue([{ id: 'existing', user_id: 'user-1', name: 'Latte',
      category: 'beverage', source: 'manual', nutrition_unit: 'ml', calories_100g: 50,
      protein_100g: 3, carbs_100g: 5, fat_100g: 2, food_key: null, off_food_id: null }])
    mocks.updatePantryItem.mockResolvedValue({ id: 'existing', name: 'Latte' })
    render(<PantryPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Modifica Latte' }))
    click('Salva modifiche')
    await waitFor(() => expect(mocks.refreshDiary).toHaveBeenCalledTimes(1))
    expect(mocks.updatePantryItem).toHaveBeenCalledWith('existing', expect.objectContaining({ nutrition_unit: 'ml' }))
    await screen.findByRole('button', { name: '+ Aggiungi ingrediente' })
  })
})
