import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Meal, MealEntry } from '../types'

const mocks = vi.hoisted(() => ({ meals: [] as Meal[] }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-28', setSelectedDate: vi.fn() }) }))
vi.mock('../contexts/DataContext', () => ({ useData: () => ({
  meals: mocks.meals, goals: null, loading: false,
  daySummary: { calories: 450, protein_g: 20, carbs_g: 40, fat_g: 15, calories_burned: 0 },
  fetchForDate: vi.fn(), addMealEntry: vi.fn(), updateMealEntry: vi.fn(), removeMealEntry: vi.fn(), showToast: vi.fn(),
}) }))
vi.mock('../components/meals/GoodHabits', () => ({ default: () => null }))
vi.mock('../components/meals/MealHub', () => ({ default: () => <p>Scelta inserimento</p> }))
import MealsPage from './MealsPage'

afterEach(cleanup)

function entry(id: string, hour: string, calories: number): MealEntry {
  return { id, meal_id: 'meal-dinner', name: id, created_at: `2026-10-28T${hour}:00Z`, items: [{
    id: `item-${id}`, meal_id: 'meal-dinner', entry_id: id, food_name: id, quantity_g: 100, unit: 'g',
    calories, protein_g: 5, carbs_g: 10, fat_g: 5, category: 'other', source: 'manual',
    off_food_id: null, food_key: null, pantry_item_id: null, created_at: `2026-10-28T${hour}:00Z`,
  }] }
}

describe('meal diary', () => {
  it('keeps a single dinner with combined calories and newest dishes first after a post-dinner snack', () => {
    const base = { user_id: 'user-1', date: '2026-10-28', name: null, created_at: '2026-10-28T19:00:00Z' }
    mocks.meals = [
      { ...base, id: 'meal-dinner', meal_type: 'dinner', entries: [entry('Primo', '19:00', 200), entry('Secondo', '21:00', 150)] },
      { ...base, id: 'meal-snack', meal_type: 'snack', entries: [entry('Spuntino serale', '20:00', 100)] },
    ]
    render(<MealsPage />)
    const dinnerLabel = screen.getByText('🌙 Cena')
    const dinner = dinnerLabel.parentElement!.parentElement!
    expect(screen.getAllByText('🌙 Cena')).toHaveLength(1)
    expect(within(dinner).getByText('350 kcal')).toBeTruthy()
    expect(within(dinner).getAllByRole('button').map(button => button.textContent)).toEqual([
      expect.stringContaining('Secondo'), expect.stringContaining('Primo'),
    ])
    const cards = screen.getAllByRole('button').filter(button => /Spuntino serale|Secondo|Primo/.test(button.textContent ?? ''))
    expect(cards.map(button => button.textContent)).toEqual([
      expect.stringContaining('Spuntino serale'), expect.stringContaining('Secondo'), expect.stringContaining('Primo'),
    ])
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi pasto/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '🌙 Cena' }))
    expect(screen.queryByRole('button', { name: 'Fatto' })).toBeNull()
    expect(screen.getByText('Scelta inserimento')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
