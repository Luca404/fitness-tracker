import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Meal } from '../../types'
const state = vi.hoisted(() => ({ mealRevision: 0, getWeeklyMeals: vi.fn() }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => ({ profile: null, ...state }) }))
import GoodHabits from './GoodHabits'
afterEach(cleanup)
beforeEach(() => { state.mealRevision = 0; state.getWeeklyMeals.mockReset() })
function weeklyMeal(quantity: number): Meal {
  return { id: 'meal', date: '2026-10-01', user_id: 'user', meal_type: 'lunch', name: null, created_at: '',
    entries: [{ id: 'entry', meal_id: 'meal', name: 'Legumi', created_at: '', items: [{
      id: 'item', entry_id: 'entry', meal_id: 'meal', food_name: 'Lenticchie', quantity_g: quantity,
      unit: 'g', category: 'legume', calories: 100, protein_g: 5, carbs_g: 10, fat_g: 1,
      source: 'manual', off_food_id: null, food_key: null, created_at: '',
    }] }] }
}
it('refreshes weekly habits after an edit with the same number of ingredients', async () => {
  state.getWeeklyMeals.mockResolvedValueOnce([weeklyMeal(150)]).mockResolvedValueOnce([weeklyMeal(250)])
  const props = { selectedDate: '2026-10-04', currentMeals: [] }
  const { rerender } = render(<GoodHabits {...props} />)
  expect(await screen.findByText('150 g')).toBeTruthy()
  state.mealRevision = 1
  rerender(<GoodHabits {...props} />)
  expect(await screen.findByText('250 g')).toBeTruthy()
  expect(screen.queryByText('150 g')).toBeNull()
  expect(state.getWeeklyMeals).toHaveBeenCalledTimes(2)
})
