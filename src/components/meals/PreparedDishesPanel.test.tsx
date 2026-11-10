import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { PreparedBatch } from '../../types'
import PreparedDishesPanel from './PreparedDishesPanel'

const mocks = vi.hoisted(() => ({
  getPreparedBatches: vi.fn(), correctPreparedBatchWeight: vi.fn(),
  consumePreparedBatch: vi.fn(), refreshDiary: vi.fn(), showToast: vi.fn(),
}))

vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({
  showToast: mocks.showToast, fetchForDate: vi.fn(), refreshDiary: mocks.refreshDiary,
}) }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-01' }) }))

afterEach(() => { cleanup(); vi.clearAllMocks() })

function batch(id: string, name: string, mealType: 'breakfast' | 'lunch' | 'dinner'): PreparedBatch {
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

it('shows leftovers from every meal and opens their detail', async () => {
  const lunch = batch('lunch', 'Risotto pronto', 'lunch')
  lunch.dish.icon = null
  mocks.getPreparedBatches.mockResolvedValue([batch('breakfast', 'Porridge pronto', 'breakfast'), lunch])
  const onSelect = vi.fn()
  const onCountChange = vi.fn()
  render(<PreparedDishesPanel mealType="lunch" compact onSelect={onSelect} onCountChange={onCountChange} />)

  const button = await screen.findByRole('button', { name: /Risotto pronto/ })
  expect(screen.getByText('Porridge pronto')).toBeTruthy()
  expect(screen.getByText('🍚')).toBeTruthy()
  expect(onCountChange).toHaveBeenCalledWith(2)
  fireEvent.click(button)
  expect(onSelect).toHaveBeenCalledWith(lunch)
  expect(screen.queryByLabelText('Grammi mangiati')).toBeNull()
  await waitFor(() => expect(mocks.getPreparedBatches).toHaveBeenCalledTimes(1))
})

it('records a previous dinner leftover at lunch and preserves search filters', async () => {
  const dinner = batch('dinner', 'Pasta avanzata dalla cena', 'dinner')
  dinner.created_at = '2026-09-30T20:00:00Z'
  mocks.getPreparedBatches.mockResolvedValue([dinner, batch('breakfast', 'Porridge pronto', 'breakfast')])
  mocks.consumePreparedBatch.mockResolvedValue(undefined)
  const { rerender } = render(<PreparedDishesPanel mealType="lunch" query="pasta" />)
  fireEvent.click(await screen.findByRole('button', { name: /Pasta avanzata dalla cena/ }))
  expect(screen.queryByText('Porridge pronto')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '1/4' }))
  fireEvent.click(screen.getByRole('button', { name: 'Registra porzione' }))
  await waitFor(() => expect(mocks.consumePreparedBatch).toHaveBeenCalledWith('dinner', '2026-10-01', 'lunch', 100))
  rerender(<PreparedDishesPanel mealType="lunch" query="porridge" />)
  expect(screen.queryByText('Pasta avanzata dalla cena')).toBeNull()
  expect(screen.getByText('Porridge pronto')).toBeTruthy()
})

it('corrects a kitchen remainder and uses the new amount for the next portion', async () => {
  const original = batch('lunch', 'Risotto pronto', 'lunch')
  const corrected = { ...original, total_cooked_g: 350.13, remaining_g: 150.13 }
  mocks.getPreparedBatches.mockResolvedValueOnce([original]).mockResolvedValue([corrected])
  mocks.correctPreparedBatchWeight.mockResolvedValue(corrected)
  const onConsumed = vi.fn().mockResolvedValue(undefined)
  render(<PreparedDishesPanel onConsumed={onConsumed} />)
  fireEvent.click(await screen.findByRole('button', { name: /Risotto pronto/ }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Grammi mangiati' }), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: 'Correggi il peso rimasto' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Peso reale rimasto (g)' }), { target: { value: '150.13' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salva peso e ricalcola' }))
  await waitFor(() => expect(mocks.refreshDiary).toHaveBeenCalledTimes(1))
  expect(mocks.correctPreparedBatchWeight).toHaveBeenCalledWith(original, 150.13)
  expect((screen.getByRole('spinbutton', { name: 'Grammi mangiati' }) as HTMLInputElement).value).toBe('100')
  expect((screen.getByRole('spinbutton', { name: 'Grammi mangiati' }) as HTMLInputElement).max).toBe('150.13')
  fireEvent.click(screen.getByRole('button', { name: 'Registra porzione' }))
  await waitFor(() => expect(mocks.consumePreparedBatch).toHaveBeenCalledWith('lunch', '2026-10-01', 'lunch', 100))
})
