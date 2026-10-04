import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Meal } from '../types'

const mocks = vi.hoisted(() => ({ getMealsForDate: vi.fn(), getWorkoutsForDate: vi.fn(),
  getLatestWeightLog: vi.fn(), getGymSessionsForDate: vi.fn(), getMealsForRange: vi.fn(),
  updateMealEntry: vi.fn(), deleteMealEntry: vi.fn() }))
vi.mock('../services/api', () => mocks)
vi.mock('../services/gymApi', () => ({ getGymSessionsForDate: mocks.getGymSessionsForDate }))
import { useDiary } from './useDiary'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}
function meal(date: string, calories = 100): Meal {
  return { id: `meal-${date}`, date, user_id: 'user-1', meal_type: 'lunch', name: null, created_at: '',
    entries: [{ id: `entry-${date}`, meal_id: `meal-${date}`, name: 'Piatto', created_at: '',
      dish_id: 'snapshot', dish_icon_source_id: 'original', dish_icon: '🍚', items: [{
        id: `item-${date}`, entry_id: `entry-${date}`, meal_id: `meal-${date}`, food_name: 'Riso',
        quantity_g: 100, unit: 'g', calories, protein_g: 2, carbs_g: 20, fat_g: 1,
        source: 'manual', off_food_id: null, category: 'grain', food_key: null, created_at: '',
      }] }] }
}
const toast = vi.fn()
function useTestDiary({ date, user = 'user-1' }: { date: string; user?: string }) {
  return useDiary(user, date, 80, toast)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getMealsForDate.mockResolvedValue([])
  mocks.getMealsForRange.mockResolvedValue([])
  mocks.getWorkoutsForDate.mockResolvedValue([])
  mocks.getGymSessionsForDate.mockResolvedValue([])
  mocks.getLatestWeightLog.mockResolvedValue(null)
})

describe('diary date and mutation ownership', () => {
  it('clears the previous day immediately and ignores out-of-order reads', async () => {
    const first = deferred<Meal[]>()
    const second = deferred<Meal[]>()
    mocks.getMealsForDate.mockImplementation(date => date === '2026-10-01' ? first.promise : second.promise)
    const { result, rerender } = renderHook(useTestDiary, { initialProps: { date: '2026-10-01' } })
    rerender({ date: '2026-10-02' })
    expect(result.current.meals).toEqual([])
    expect(result.current.loading).toBe(true)
    await act(async () => { second.resolve([meal('2026-10-02', 200)]) })
    await waitFor(() => expect(result.current.daySummary.calories).toBe(200))
    await act(async () => { first.resolve([meal('2026-10-01')]) })
    expect(result.current.meals[0].date).toBe('2026-10-02')
    expect(result.current.daySummary.calories).toBe(200)
  })

  it('keeps a late edit on its original date and invalidates weekly meals at the same item count', async () => {
    const write = deferred<Meal['entries'][number]>()
    mocks.getMealsForDate.mockImplementation(date => Promise.resolve([meal(date)]))
    mocks.updateMealEntry.mockReturnValue(write.promise)
    const { result, rerender } = renderHook(useTestDiary, { initialProps: { date: '2026-10-01' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await result.current.getWeeklyMeals('2026-09-28', '2026-10-04')
    await result.current.getWeeklyMeals('2026-09-28', '2026-10-04')
    expect(mocks.getMealsForRange).toHaveBeenCalledTimes(1)
    let pending!: Promise<void>
    act(() => { pending = result.current.updateMealEntry('entry-2026-10-01', 'Modificato', []) })
    rerender({ date: '2026-10-02' })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { write.resolve(meal('2026-10-01', 900).entries[0]); await pending })
    expect(result.current.daySummary.calories).toBe(100)
    expect(result.current.meals[0].date).toBe('2026-10-02')
    expect(result.current.mealRevision).toBe(1)
    await result.current.getWeeklyMeals('2026-09-28', '2026-10-04')
    expect(mocks.getMealsForRange).toHaveBeenCalledTimes(2)
    await act(async () => { await result.current.fetchForDate('2026-10-01') })
    expect(result.current.loading).toBe(false)
    expect(result.current.meals[0].date).toBe('2026-10-02')
  })

  it('reloads the committed day when a write finishes during a stale read', async () => {
    const stale = deferred<Meal[]>()
    mocks.getMealsForDate.mockResolvedValueOnce([meal('2026-10-01')])
      .mockReturnValueOnce(stale.promise).mockResolvedValue([meal('2026-10-01', 400)])
    mocks.updateMealEntry.mockResolvedValue(meal('2026-10-01', 400).entries[0])
    const { result } = renderHook(useTestDiary, { initialProps: { date: '2026-10-01' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    let read!: Promise<void>
    act(() => { read = result.current.fetchForDate('2026-10-01') })
    await act(async () => { await result.current.updateMealEntry('entry-2026-10-01', 'Modificato', []) })
    expect(result.current.daySummary.calories).toBe(400)
    await act(async () => { stale.resolve([meal('2026-10-01')]); await read })
    expect(result.current.daySummary.calories).toBe(400)
  })

  it('updates prepared dish icons through their original dish and keeps that link after editing', async () => {
    mocks.getMealsForDate.mockResolvedValue([meal('2026-10-01')])
    const updated = { ...meal('2026-10-01').entries[0], dish_icon_source_id: undefined, dish_icon: undefined }
    mocks.updateMealEntry.mockResolvedValue(updated)
    const { result } = renderHook(useTestDiary, { initialProps: { date: '2026-10-01' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.updateMealEntry(updated.id, 'Piatto', []) })
    act(() => result.current.setDishIcon('original', '🍝'))
    expect(result.current.meals[0].entries[0].dish_icon).toBe('🍝')
  })

  it('drops cached weekly meals and late writes when the account changes', async () => {
    const write = deferred<void>()
    mocks.getMealsForDate.mockResolvedValue([meal('2026-10-01')])
    mocks.deleteMealEntry.mockReturnValue(write.promise)
    const { result, rerender } = renderHook(useTestDiary, { initialProps: { date: '2026-10-01', user: 'user-1' } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await result.current.getWeeklyMeals('2026-09-28', '2026-10-04')
    let pending!: Promise<void>
    act(() => { pending = result.current.removeMealEntry('entry-2026-10-01') })
    rerender({ date: '2026-10-01', user: 'user-2' })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { write.resolve(); await pending })
    expect(result.current.meals).toHaveLength(1)
    await result.current.getWeeklyMeals('2026-09-28', '2026-10-04')
    expect(mocks.getMealsForRange).toHaveBeenCalledTimes(2)
  })
})
