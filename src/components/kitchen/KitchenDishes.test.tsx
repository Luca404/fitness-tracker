import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dish, PreparedBatch } from '../../types'

const mocks = vi.hoisted(() => ({ getDishes: vi.fn(), getPreparedBatches: vi.fn(), getPantryItems: vi.fn(), showToast: vi.fn(), setDishIcon: vi.fn(), refreshDiary: vi.fn() }))
vi.mock('../../services/api', () => mocks)
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }))
vi.mock('../../contexts/DataContext', () => ({ useData: () => mocks }))
vi.mock('../../contexts/SettingsContext', () => ({ useSettings: () => ({ selectedDate: '2026-10-04' }) }))
import KitchenDishes from './KitchenDishes'
function dish(id: string, name: string, meal_types: Dish['meal_types']): Dish {
  return { id, name, meal_types, icon: null, user_id: 'user-1', created_at: '', updated_at: '',
    items: [{ id: `${id}-item`, dish_id: id, position: 0, food_name: 'Riso', category: 'grain',
      quantity_g: 100, calories: 350, protein_g: 7, carbs_g: 78, fat_g: 1, unit: 'g',
      source: 'basic', food_key: null, off_food_id: null, created_at: '' }] }
}
const yogurt = dish('yogurt', 'Yogurt e frutta', ['breakfast', 'snack'])
const pasta = dish('pasta', 'Pasta al pesto', ['lunch', 'dinner'])
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getDishes.mockResolvedValue([yogurt, pasta])
  mocks.getPreparedBatches.mockResolvedValue([])
  mocks.getPantryItems.mockResolvedValue([])
})
afterEach(cleanup)

describe('Kitchen dish categories', () => {
  it('filters by existing categories, combines search and returns to all dishes', async () => {
    render(<KitchenDishes />)
    await screen.findByText('Yogurt e frutta')
    const categoryButtons = within(screen.getByRole('group', { name: 'Categoria dei piatti' })).getAllByRole('button')
    expect(categoryButtons).toHaveLength(4)
    expect(categoryButtons.every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Tutti' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Pranzo' }))
    expect(screen.getByRole('button', { name: 'Pranzo' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('Yogurt e frutta')).toBeNull()
    expect(screen.getByText('Pasta al pesto')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('Cerca un piatto...'), { target: { value: 'yogurt' } })
    expect(screen.getByText('Nessun risultato')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Spuntino' }))
    expect(screen.getByRole('button', { name: 'Pranzo' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Yogurt e frutta')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Spuntino' }))
    expect(screen.getByText('Yogurt e frutta')).toBeTruthy()
    expect(screen.queryByText('Pasta al pesto')).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('Cerca un piatto...'), { target: { value: '' } })
    expect(categoryButtons.every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true)
    expect(screen.getByText('Yogurt e frutta')).toBeTruthy()
    expect(screen.getByText('Pasta al pesto')).toBeTruthy()
  })
  it('filters prepared dishes with the same selector', async () => {
    const batch: PreparedBatch = { id: 'batch', user_id: 'user-1', snapshot_dish_id: 'snapshot', source_dish_id: 'pasta',
      remaining_g: 100, total_cooked_g: 200, closed_at: null, created_at: '',
      dish: dish('snapshot', 'Pasta pronta', ['lunch', 'dinner']) }
    mocks.getPreparedBatches.mockResolvedValue([batch])
    render(<KitchenDishes />)
    await screen.findByText('Pasta pronta')
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }))
    await waitFor(() => expect(screen.queryByText('Pasta pronta')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }))
    expect(await screen.findByText('Pasta pronta')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cena' }))
    expect(await screen.findByText('Pasta pronta')).toBeTruthy()
  })
  it('preselects the current category in a new recipe and explains an empty category', async () => {
    mocks.getDishes.mockResolvedValue([pasta])
    render(<KitchenDishes />)
    await screen.findByText('Pasta al pesto')
    fireEvent.click(screen.getByRole('button', { name: 'Colazione' }))
    expect(screen.getByText('Nessun piatto in questa categoria')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Crea un nuovo piatto/ }))
    expect((screen.getByRole('checkbox', { name: /Colazione/ }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Pranzo/ }) as HTMLInputElement).checked).toBe(false)
  })
})
