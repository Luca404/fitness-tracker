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

afterEach(() => { cleanup(); mocks.getDishes.mockResolvedValue([]) })

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
  const dish = {
    id: 'dish-1', name: 'Pasta al pomodoro', icon: '🍝', meal_types: ['snack'],
    items: [{
      id: 'item-1', food_name: 'Pasta', quantity_g: 100, unit: 'g', calories: 350,
      protein_g: 12, carbs_g: 70, fat_g: 2, source: 'basic', off_food_id: null,
      category: 'grains', food_key: 'basic:pasta', pantry_item_id: null,
    }],
  } as Dish

  it('registers the whole saved recipe without creating a prepared batch', async () => {
    mocks.getDishes.mockResolvedValueOnce([dish])
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registra tutto il piatto' }))

    await waitFor(() => expect(onAddEntry).toHaveBeenCalledWith(
      'Pasta al pomodoro', [expect.objectContaining({ dish_item_id: 'item-1', quantity_g: 100 })],
      'dish-1', '🍝',
    ))
    expect(mocks.createPreparedBatch).not.toHaveBeenCalled()
  })

  it('opens portion preparation only through the explicit action', async () => {
    mocks.getDishes.mockResolvedValueOnce([dish])
    const onAddEntry = vi.fn().mockResolvedValue(undefined)
    render(<TestHub onAddEntry={onAddEntry} />)

    fireEvent.click(await screen.findByRole('button', { name: /^Pasta al pomodoro/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Prepara e conserva il resto' }))

    expect(screen.getByRole('button', { name: /Salva e registra la porzione/ })).toBeTruthy()
    expect(onAddEntry).not.toHaveBeenCalled()
  })
})
