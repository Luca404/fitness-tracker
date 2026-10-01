import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PreparedBatch } from '../../types'
import PreparedDishesPanel from './PreparedDishesPanel'

const mocks = vi.hoisted(() => ({ getPreparedBatches: vi.fn(), showToast: vi.fn() }))

vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ showToast: mocks.showToast, fetchForDate: vi.fn() }) }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-01' }) }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

function batch(id: string, name: string, mealType: 'breakfast' | 'lunch'): PreparedBatch {
  return {
    id, user_id: 'user-1', snapshot_dish_id: `snapshot-${id}`, source_dish_id: null,
    total_cooked_g: 400, remaining_g: 200, closed_at: null, created_at: '2026-10-01',
    dish: {
      id: `snapshot-${id}`, user_id: 'user-1', name, icon: '🍲', is_preparation: true,
      meal_types: [mealType], created_at: '2026-10-01', updated_at: '2026-10-01',
      items: [{
        id: `item-${id}`, dish_id: `snapshot-${id}`, position: 0, food_name: 'Riso',
        quantity_g: 100, unit: 'g', calories: 350, protein_g: 7, carbs_g: 78, fat_g: 1,
        category: 'grain', food_key: 'basic:riso', source: 'basic', off_food_id: null,
        created_at: '2026-10-01',
      }],
    },
  }
}

it('shows only prepared dishes for the selected meal and opens their detail', async () => {
  const lunch = batch('lunch', 'Risotto pronto', 'lunch')
  mocks.getPreparedBatches.mockResolvedValue([batch('breakfast', 'Porridge pronto', 'breakfast'), lunch])
  const onSelect = vi.fn()
  const onCountChange = vi.fn()
  render(<PreparedDishesPanel mealType="lunch" compact onSelect={onSelect} onCountChange={onCountChange} />)

  const button = await screen.findByRole('button', { name: /Risotto pronto/ })
  expect(screen.queryByText('Porridge pronto')).toBeNull()
  expect(onCountChange).toHaveBeenCalledWith(1)
  fireEvent.click(button)
  expect(onSelect).toHaveBeenCalledWith(lunch)
  expect(screen.queryByLabelText('Grammi mangiati')).toBeNull()
  await waitFor(() => expect(mocks.getPreparedBatches).toHaveBeenCalledTimes(1))
})
