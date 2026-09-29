import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SingleIngredientEditor from './SingleIngredientEditor'

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
