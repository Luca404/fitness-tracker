import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SingleIngredientEditor from './SingleIngredientEditor'

afterEach(cleanup)

describe('SingleIngredientEditor', () => {
  it('updates a logged ingredient quantity while preserving its catalog link', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<SingleIngredientEditor item={{
      food_name: 'Mela', quantity_g: 100, calories: 52, protein_g: 0.3,
      carbs_g: 14, fat_g: 0.2, fiber_g: 2.4, sugars_g: 10, salt_g: 0.01,
      category: 'fruit', food_key: 'basic:mela', pantry_item_id: 'saved-apple',
      source: 'pantry', off_food_id: null, unit: 'g',
    }} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Quantità di Mela'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva quantità' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      quantity_g: 200, calories: 104, fiber_g: 4.8, pantry_item_id: 'saved-apple',
    })))
  })
})

it('reopens a recorded custom strength and saves quantity and strength together', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<SingleIngredientEditor item={{
    food_name: 'Vino', quantity_g: 125, alcohol_abv: 12, calories: 100,
    protein_g: 0, carbs_g: 2, fat_g: 0, category: 'alcohol', food_key: 'basic:vino-bianco',
    source: 'basic', off_food_id: null, unit: 'ml',
  }} onSave={onSave} onCancel={vi.fn()} />)
  expect((screen.getByLabelText('Gradazione (% vol)') as HTMLInputElement).value).toBe('12')
  fireEvent.change(screen.getByLabelText('Quantità di Vino'), { target: { value: '250' } })
  fireEvent.change(screen.getByLabelText('Gradazione (% vol)'), { target: { value: '14' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salva quantità' }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    unit: 'ml', quantity_g: 250, alcohol_abv: 14, calories: 227.62,
  })))
})
