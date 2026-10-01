import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DishItemDraft } from './DishEditor'
import type { MealHubMode } from './MealHub'
import type { Dish } from '../../types'

const mocks = vi.hoisted(() => ({
  getDishes: vi.fn().mockResolvedValue([]),
  createPreparedBatch: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast, setDishIcon: vi.fn() }) }))
vi.mock('./PreparedDishesPanel', () => ({ default: () => null }))
vi.mock('./FoodSearch', () => ({ default: ({ onAdd }: { onAdd: (item: DishItemDraft) => void }) =>
  <button type="button" onClick={() => onAdd({
    food_name: 'Mela', quantity_g: 150, calories: 78, protein_g: 0.5,
    carbs_g: 21, fat_g: 0.3, category: 'fruit', food_key: 'basic:mela',
    pantry_item_id: null, source: 'basic', off_food_id: null,
  })}>Seleziona mela</button>,
}))

import MealHub from './MealHub'

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.getDishes.mockResolvedValue([]) })

function TestHub({ onAddEntry }: { onAddEntry: (name: string, items: DishItemDraft[]) => Promise<void> }) {
  const [mode, setMode] = useState<MealHubMode>('list')
  return <MealHub mode={mode} setMode={setMode} mealType="snack" date="2026-09-29" onAddEntry={onAddEntry} />
}

describe('single ingredient meal flow', () => {
  it('logs one ingredient without creating a recipe or prepared batch', async () => {
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(screen.getByRole('button', { name: /Ingrediente singolo/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Seleziona mela' }))

    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith('Mela', [expect.objectContaining({
      quantity_g: 150, calories: 78,
    })]))
    expect(mocks.createPreparedBatch).not.toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Ingrediente singolo/ })).toBeTruthy()
  })
})

describe('saved dish meal flow', () => {
  const dish: Dish = {
    id: 'dish-1', user_id: 'user-1', name: 'Pasta al pomodoro', icon: '🍝',
    meal_types: ['snack'], created_at: '2026-09-29', updated_at: '2026-09-29',
    items: [{
      id: 'item-1', dish_id: 'dish-1', position: 0, food_name: 'Pasta',
      quantity_g: 100, unit: 'g', calories: 350,
      protein_g: 12, carbs_g: 70, fat_g: 2, source: 'basic', off_food_id: null,
      category: 'grain', food_key: 'basic:pasta', pantry_item_id: null,
      created_at: '2026-09-29',
    }],
  }

  it('registers the whole saved recipe without creating a prepared batch', async () => {
    mocks.getDishes.mockResolvedValueOnce([dish])
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra tutto' }))

    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith(
      'Pasta al pomodoro', [expect.objectContaining({ dish_item_id: 'item-1', quantity_g: 100 })],
      'dish-1', '🍝',
    ))
    expect(mocks.createPreparedBatch).not.toHaveBeenCalled()
  })

  it('opens portion preparation only through the explicit action', async () => {
    mocks.getDishes.mockResolvedValueOnce([dish])
    mocks.createPreparedBatch.mockResolvedValueOnce(undefined)
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Grammi di Pasta' }), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Prepara e conserva il resto' }))

    fireEvent.click(screen.getByRole('button', { name: /Salva e registra la porzione/ }))
    await waitFor(() => expect(mocks.createPreparedBatch).toHaveBeenCalledWith(expect.objectContaining({
      sourceDishId: 'dish-1', items: [expect.objectContaining({ dish_item_id: 'item-1', quantity_g: 80, calories: 280 })],
    })))
    expect(onAddEntry).not.toHaveBeenCalled()
  })

  it('changes ingredient quantities only for the current entry', async () => {
    const twoIngredientDish: Dish = {
      ...dish,
      items: [...dish.items, {
        ...dish.items[0], id: 'item-2', position: 1, food_name: 'Pomodoro',
        quantity_g: 50, calories: 15, protein_g: 0.5, carbs_g: 3, fat_g: 0,
      }],
    }
    mocks.getDishes.mockResolvedValueOnce([twoIngredientDish])
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Grammi di Pasta' }), { target: { value: '80' } })
    expect((screen.getByRole('spinbutton', { name: 'Grammi di Pomodoro' }) as HTMLInputElement).value).toBe('50')
    fireEvent.click(screen.getByRole('button', { name: 'Registra tutto' }))

    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith('Pasta al pomodoro', [
      expect.objectContaining({ dish_item_id: 'item-1', quantity_g: 80, calories: 280 }),
      expect.objectContaining({ dish_item_id: 'item-2', quantity_g: 50, calories: 15 }),
    ], 'dish-1', '🍝'))
    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    expect((screen.getByRole('spinbutton', { name: 'Grammi di Pasta' }) as HTMLInputElement).value).toBe('100')
  })
})
