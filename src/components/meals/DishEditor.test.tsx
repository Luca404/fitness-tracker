import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DishEditor from './DishEditor'

vi.mock('./FoodSearch', () => ({ default: () => null }))

describe('DishEditor', () => {
  afterEach(cleanup)
  it('saves corrected ingredient macros while retaining its saved ingredient ID', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<DishEditor initialName="Pasta" initialItems={[{
      id: 'ingredient-1', food_name: 'Pasta cotta', quantity_g: 100,
      calories: 150, protein_g: 5, carbs_g: 30, fat_g: 1,
      category: 'grain', food_key: null, source: 'manual', off_food_id: null,
    }]} onSave={onSave} onCancel={() => {}} />)

    fireEvent.change(screen.getByLabelText('Proteine (g)'), { target: { value: '8.5' } })
    fireEvent.change(screen.getByLabelText('Fibre (g)'), { target: { value: '3.2' } })
    fireEvent.change(screen.getByLabelText('Zuccheri (g)'), { target: { value: '1.4' } })
    fireEvent.change(screen.getByLabelText('Sale (g)'), { target: { value: '0.08' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salva piatto' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta', [expect.objectContaining({
      id: 'ingredient-1', quantity_g: 100, protein_g: 8.5,
      fiber_g: 3.2, sugars_g: 1.4, salt_g: 0.08,
    })], ['lunch']))
  })

  it('saves multiple meal categories for one dish', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<DishEditor initialName="Pasta" initialItems={[{
      food_name: 'Pasta', quantity_g: 100, calories: 150, protein_g: 5, carbs_g: 30, fat_g: 1,
      category: 'grain', food_key: null, source: 'manual', off_food_id: null,
    }]} initialMealTypes={['lunch']} onSave={onSave} onCancel={() => {}} />)

    fireEvent.click(screen.getByRole('checkbox', { name: /Cena/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Salva piatto' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta', expect.any(Array), ['lunch', 'dinner']))
  })

  it('shows added ingredients separately and removes one without changing the base', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<DishEditor initialName="Pasta con formaggio" showMealTypes={false} separateCustomizations
      initialItems={[
        { food_name: 'Pasta', quantity_g: 100, calories: 150, protein_g: 5, carbs_g: 30, fat_g: 1,
          category: 'grain', food_key: null, source: 'manual', off_food_id: null, is_customization: false },
        { food_name: 'Parmigiano', quantity_g: 20, calories: 80, protein_g: 7, carbs_g: 0, fat_g: 6,
          category: 'dairy', food_key: null, source: 'manual', off_food_id: null, is_customization: true },
      ]} onSave={onSave} onCancel={() => {}} />)

    expect(screen.getByText('Ricetta base')).toBeTruthy()
    expect(screen.getByText('Ingredienti aggiunti')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Rimuovi Parmigiano'))
    fireEvent.click(screen.getByRole('button', { name: 'Salva piatto' }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pasta con formaggio', [
      expect.objectContaining({ food_name: 'Pasta', is_customization: false }),
    ], ['lunch']))
  })
})
