import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getPantryItems: vi.fn().mockResolvedValue([]), showToast: vi.fn() }))

vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast }) }))

import FoodSearch from './FoodSearch'

afterEach(cleanup)

describe('FoodSearch manual entry', () => {

  it('keeps optional nutrients collapsed with a clear portion basis', () => {
    render(<FoodSearch onAdd={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Inserisci a mano/ }))

    expect(screen.getByLabelText('Carboidrati (g)')).toBeTruthy()
    expect(document.querySelector('details')?.open).toBe(false)
    fireEvent.click(screen.getByText('Altri valori nutrizionali (facoltativi)'))
    expect(screen.getByRole('spinbutton', { name: 'di cui zuccheri (g)' })).toBeTruthy()

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

  it('does not save a cleared quantity and resets the selection for another search', async () => {
    const onAdd = vi.fn()
    mocks.getPantryItems.mockResolvedValueOnce([{
      id: 'quantity-test', name: 'Mela per test', quantity: 500, unit: 'g', category: 'fruit',
      calories_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2,
    }])
    render(<FoodSearch onAdd={onAdd} onClose={() => {}} resetAfterAdd />)
    fireEvent.change(screen.getByPlaceholderText('Cerca un ingrediente...'), { target: { value: 'Mela' } })
    fireEvent.click(await screen.findByRole('button', { name: /🧺 Mela per test/ }))
    fireEvent.change(screen.getByLabelText('Quantità di Mela per test'), { target: { value: '' } })
    fireEvent.blur(screen.getByLabelText('Quantità di Mela per test'))
    expect((screen.getByRole('button', { name: '+ Aggiungi ingrediente' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Quantità di Mela per test'), { target: { value: '0.001' } })
    fireEvent.blur(screen.getByLabelText('Quantità di Mela per test'))
    expect((screen.getByLabelText('Quantità di Mela per test') as HTMLInputElement).value).toBe('0.001')
    expect((screen.getByRole('button', { name: '+ Aggiungi ingrediente' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Quantità di Mela per test'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi ingrediente' }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ quantity_g: 150, calories: 78 }))
    expect((screen.getByPlaceholderText('Cerca un ingrediente...') as HTMLInputElement).value).toBe('')
    expect(screen.queryByLabelText('Quantità di Mela per test')).toBeNull()
  })
})

it('registers a catalog beer in ml with edited strength and matching energy', async () => {
  const onAdd = vi.fn()
  render(<FoodSearch onAdd={onAdd} onClose={vi.fn()} />)
  fireEvent.change(screen.getByPlaceholderText('Cerca un ingrediente...'), { target: { value: 'Birra chiara' } })
  fireEvent.click(await screen.findByRole('button', { name: /Birra chiara/ }))
  fireEvent.change(screen.getByLabelText('Quantità di Birra chiara'), { target: { value: '500' } })
  fireEvent.change(screen.getByLabelText('Gradazione (% vol)'), { target: { value: '6' } })
  fireEvent.click(screen.getByRole('button', { name: '+ Aggiungi ingrediente' }))
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
    unit: 'ml', quantity_g: 500, alcohol_abv: 6, calories: 242.62, food_key: 'basic:birra-chiara',
  }))
})
