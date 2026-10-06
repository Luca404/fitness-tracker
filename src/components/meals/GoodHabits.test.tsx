import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Meal, UserHealthProfile } from '../../types'
const state = vi.hoisted(() => ({ profile: null as UserHealthProfile | null, goals: { calorie_target: 2000 }, mealRevision: 0, getWeeklyMeals: vi.fn() }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => state }))
import GoodHabits from './GoodHabits'
import { MemoryRouter } from 'react-router-dom'
afterEach(cleanup)
beforeEach(() => { state.profile = null; state.goals.calorie_target = 2000; state.mealRevision = 0; state.getWeeklyMeals.mockReset() })
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

it('shows total sugars against the calorie target and alcohol in UA', async () => {
  state.getWeeklyMeals.mockResolvedValue([])
  state.goals.calorie_target = 1600
  const current = weeklyMeal(100)
  current.date = '2026-10-04'
  current.entries[0].items[0].sugars_g = 20
  render(<GoodHabits selectedDate="2026-10-04" currentMeals={[current]} />)
  expect(screen.getByText('Zuccheri totali')).toBeTruthy()
  expect(screen.getByText(/≤ 60 g/)).toBeTruthy()
  expect(screen.getByText('0 UA')).toBeTruthy()
  expect(screen.getByText(/≤ 1 UA/)).toBeTruthy()
  expect(screen.queryByText(/liberi o aggiunti/)).toBeNull()
})
it('uses the profile alcohol threshold and renders a finite zero threshold for minors', async () => {
  state.getWeeklyMeals.mockResolvedValue([])
  state.profile = { age: 30, sex: 'male' } as UserHealthProfile
  const props = { selectedDate: '2026-10-04', currentMeals: [] }
  const { rerender } = render(<GoodHabits {...props} />)
  expect(screen.getByText(/≤ 2 UA/)).toBeTruthy()
  state.profile = { age: 65, sex: 'male' } as UserHealthProfile
  rerender(<GoodHabits {...props} />)
  expect(screen.getByText(/≤ 1 UA/)).toBeTruthy()
  state.profile = { age: 17, sex: 'male' } as UserHealthProfile
  const beer = weeklyMeal(330)
  beer.date = props.selectedDate
  Object.assign(beer.entries[0].items[0], { category: 'alcohol', unit: 'ml', alcohol_abv: 5 })
  rerender(<MemoryRouter><GoodHabits {...props} currentMeals={[beer]} compact /></MemoryRouter>)
  expect(await screen.findByLabelText(/Unità alcoliche: da migliorare, .*limite 0 UA, soglia superata/)).toBeTruthy()
  expect(document.body.innerHTML).not.toMatch(/Infinity|NaN/)
})

it('shows current amounts under maximum limits and multiples when exceeded in the meal recap', async () => {
  state.getWeeklyMeals.mockResolvedValue([])
  const current = weeklyMeal(100)
  current.date = '2026-10-04'
  Object.assign(current.entries[0].items[0], { sugars_g: 20, salt_g: 10 })
  render(<MemoryRouter><GoodHabits selectedDate="2026-10-04" currentMeals={[current]} compact /></MemoryRouter>)
  expect(await screen.findByLabelText(/Zuccheri totali: in linea, 20 g, limite 75 g/)).toBeTruthy()
  expect(screen.getByText('20g')).toBeTruthy()
  expect(screen.getByText('10g')).toBeTruthy()
  expect(screen.getByText('0UA')).toBeTruthy()
  expect(screen.getByText('2x')).toBeTruthy()
  expect(screen.getByLabelText(/Sale: da migliorare, 10 g, limite 5 g.*2x del limite/)).toBeTruthy()
})

it('keeps previous-week food on Monday, shows a daily average, and refetches when the selected date changes', async () => {
  state.getWeeklyMeals.mockResolvedValue([weeklyMeal(150)])
  const { rerender } = render(<GoodHabits selectedDate="2026-10-04" currentMeals={[]} />)
  expect(await screen.findByText('Media: 21.4 g/giorno')).toBeTruthy()
  expect(state.getWeeklyMeals).toHaveBeenLastCalledWith('2026-09-28', '2026-10-04')
  rerender(<GoodHabits selectedDate="2026-10-05" currentMeals={[]} />)
  await waitFor(() => expect(state.getWeeklyMeals).toHaveBeenLastCalledWith('2026-09-29', '2026-10-05'))
  expect(await screen.findByText('150 g')).toBeTruthy()
  expect(screen.getByText('Ultimi 7 giorni')).toBeTruthy()
  expect(screen.getByText(/≥ 450 g/)).toBeTruthy()
  rerender(<MemoryRouter><GoodHabits selectedDate="2026-10-05" currentMeals={[]} compact /></MemoryRouter>)
  expect(await screen.findByLabelText(/Legumi: da migliorare, 150 g negli ultimi 7 giorni, media 21.4 g al giorno, obiettivo 450 g su 7 giorni/)).toBeTruthy()
  expect(screen.getByText('21g/d')).toBeTruthy()
})

it('keeps daily amounts available while rolling history loads and does not turn a failed fetch into zero', async () => {
  let rejectHistory!: (error: Error) => void
  state.getWeeklyMeals.mockReturnValue(new Promise<Meal[]>((_resolve, reject) => { rejectHistory = reject }))
  const current = weeklyMeal(150)
  current.date = '2026-10-05'
  current.entries[0].items[0].salt_g = 3
  render(<MemoryRouter><GoodHabits selectedDate="2026-10-05" currentMeals={[current]} compact /></MemoryRouter>)
  expect(screen.getByLabelText(/Sale: in linea, 3 g, limite 5 g/)).toBeTruthy()
  expect(screen.getByLabelText('Legumi: dato incompleto')).toBeTruthy()
  expect(screen.queryByText('21g/d')).toBeNull()
  rejectHistory(new Error('offline'))
  await waitFor(() => expect(screen.queryByText('Aggiorno…')).toBeNull())
  expect(screen.getByLabelText('Legumi: dato incompleto')).toBeTruthy()
  expect(screen.queryByText('0g/d')).toBeNull()
})
