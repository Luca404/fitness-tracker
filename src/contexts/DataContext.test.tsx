import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { GymSession, MealItem, UserHealthProfile } from '../types'

const mocks = vi.hoisted(() => ({
  getHealthProfile: vi.fn(),
  getUserGoals: vi.fn(),
  getLatestWeightLog: vi.fn(),
  getWeightLogs: vi.fn(),
  upsertUserGoals: vi.fn(),
  addMealEntry: vi.fn(),
  updateMealEntry: vi.fn(),
  deleteMealEntry: vi.fn(),
  completeOnboarding: vi.fn(),
  getMealsForDate: vi.fn(),
  getWorkoutsForDate: vi.fn(),
  getGymSessionsForDate: vi.fn(),
  getMealsForRange: vi.fn(),
}))

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../services/api', () => mocks)
vi.mock('../services/gymApi', () => ({ getGymSessionsForDate: mocks.getGymSessionsForDate }))

import { DataProvider, useData } from './DataContext'
import { SettingsProvider, useSettings } from './SettingsContext'
import { mealItems } from '../utils/mealEntries'

const profile: UserHealthProfile = {
  user_id: 'user-1',
  age: 30,
  sex: 'male',
  height_cm: 180,
  weight_kg: 80,
  activity_level: 'moderate',
  does_resistance_training: true,
  objective: 'maintain',
  target_weight_kg: null,
  target_date: null,
  body_fat_pct: null,
  bmr_override: null,
  created_at: '',
  updated_at: '',
}

function useTestData() { return { ...useData(), ...useSettings() } }

function Wrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider><DataProvider>{children}</DataProvider></SettingsProvider>
}

const gymSession: GymSession = {
  id: 'session-1', user_id: 'user-1', plan_id: 'plan-1', plan_name: 'Scheda A',
  date: '2026-10-01', started_at: '2026-10-01T10:00:00Z', completed_at: '2026-10-01T11:00:00Z',
  sets: [{
    id: 'set-1', session_id: 'session-1', exercise_position: 0,
    exercise_key: 'bench-press', exercise_name: 'Panca piana', equipment: 'Bilanciere',
    set_number: 1, target_reps: 10, target_reps_max: null, per_side: false,
    weight_kg: 40, reps: 10, done: true,
  }],
}

describe('DataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getHealthProfile.mockResolvedValue(profile)
    mocks.getUserGoals.mockResolvedValue(null)
    mocks.getLatestWeightLog.mockResolvedValue(null)
    mocks.getWeightLogs.mockResolvedValue([])
    mocks.upsertUserGoals.mockResolvedValue(undefined)
    mocks.completeOnboarding.mockResolvedValue(undefined)
    mocks.getMealsForDate.mockResolvedValue([])
    mocks.getMealsForRange.mockResolvedValue([])
    mocks.getWorkoutsForDate.mockResolvedValue([])
    mocks.getGymSessionsForDate.mockResolvedValue([])
  })

  it('includes completed gym sessions in daily burned calories using the historical body weight', async () => {
    mocks.getLatestWeightLog.mockResolvedValue({ date: '2026-10-04', weight_kg: 100 })
    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))
    expect(result.current.currentWeightKg).toBe(100)

    mocks.getLatestWeightLog.mockResolvedValue({ date: '2026-09-30', weight_kg: 80 })
    mocks.getWorkoutsForDate.mockResolvedValue([{
      id: 'workout-1', user_id: 'user-1', date: gymSession.date, activity: 'walking',
      duration_min: 30, calories_burned: 100.25, notes: null, created_at: '',
    }])
    mocks.getGymSessionsForDate.mockResolvedValue([
      gymSession,
      { ...gymSession, id: 'session-2', completed_at: '2026-10-01T10:30:00Z' },
      { ...gymSession, id: 'active-session', completed_at: null },
      { ...gymSession, id: 'invalid-session', completed_at: '2026-10-01T09:00:00Z' },
      { ...gymSession, id: 'empty-session', sets: [] },
    ])

    act(() => result.current.setSelectedDate(gymSession.date))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.fetchForDate(gymSession.date) })

    expect(mocks.getGymSessionsForDate).toHaveBeenCalledWith(gymSession.date)
    expect(mocks.getLatestWeightLog).toHaveBeenLastCalledWith(gymSession.date)
    expect(result.current.daySummary.calories_burned).toBe(100.25 + 304 + 152)

    // Refreshing the same date replaces its data, so each session is counted once.
    await act(async () => { await result.current.fetchForDate(gymSession.date) })
    expect(result.current.daySummary.calories_burned).toBe(556.25)

    mocks.getWorkoutsForDate.mockResolvedValue([])
    mocks.getGymSessionsForDate.mockResolvedValue([])
    act(() => result.current.setSelectedDate('2026-10-02'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.daySummary.calories_burned).toBe(0)
  })

  it('refreshes gym calorie estimates after a correction to the recorded body weight', async () => {
    mocks.getLatestWeightLog.mockResolvedValue({ weight_kg: 80 })
    mocks.getGymSessionsForDate.mockResolvedValue([gymSession])
    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.daySummary.calories_burned).toBe(304)
    mocks.getLatestWeightLog.mockResolvedValue({ weight_kg: 90 })
    await act(async () => { await result.current.refreshCurrentWeight() })
    expect(result.current.currentWeightKg).toBe(90)
    expect(result.current.daySummary.calories_burned).toBe(339)
  })

  it('uses the current body weight when no historical weight is available', async () => {
    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))
    mocks.getGymSessionsForDate.mockResolvedValue([gymSession])

    act(() => result.current.setSelectedDate(gymSession.date))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.daySummary.calories_burned).toBe(304)
  })

  it('adds, edits and removes one eaten dish as a single diary entry', async () => {
    const items: MealItem[] = [
        {
          id: 'item-1', meal_id: 'meal-1', entry_id: 'entry-1', food_name: 'Riso', quantity_g: 100, unit: 'g',
          calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3,
          source: 'basic', off_food_id: null, category: 'grain', food_key: 'basic:riso-bianco-cotto', created_at: '',
        },
        {
          id: 'item-2', meal_id: 'meal-1', entry_id: 'entry-1', food_name: 'Pollo', quantity_g: 150, unit: 'g',
          calories: 248, protein_g: 46, carbs_g: 0, fat_g: 5.4,
          source: 'basic', off_food_id: null, category: 'meat', food_key: 'basic:petto-pollo-cotto', created_at: '',
        },
      ]
    const meal = { id: 'meal-1', user_id: 'user-1', date: '2026-09-14',
      meal_type: 'lunch' as const, name: null, created_at: '', entries: [] }
    const entry = {
      id: 'entry-1', meal_id: meal.id, dish_id: 'dish-1', name: 'Riso con pollo', created_at: '', items,
    }
    mocks.addMealEntry.mockResolvedValue({
      meal: {
        id: meal.id, user_id: meal.user_id, date: meal.date, meal_type: meal.meal_type,
        name: meal.name, created_at: meal.created_at,
      },
      entry,
    })

    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))

    act(() => result.current.setSelectedDate(meal.date))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const drafts = items.map(item => ({
      food_name: item.food_name,
      quantity_g: item.quantity_g,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      source: item.source,
      off_food_id: item.off_food_id,
      category: item.category,
      food_key: item.food_key,
    }))
    await act(async () => {
      await result.current.addMealEntry('lunch', entry.name, drafts, meal.date, 'user-1', 'dish-1', '🍚')
    })

    expect(mocks.addMealEntry).toHaveBeenCalledTimes(1)
    expect(mocks.addMealEntry).toHaveBeenCalledWith('user-1', meal.date, 'lunch', entry.name, drafts, 'dish-1')
    expect(result.current.meals).toHaveLength(1)
    expect(result.current.meals[0].entries).toEqual([{ ...entry, dish_icon: '🍚' }])
    expect(mealItems(result.current.meals[0])).toHaveLength(2)

    act(() => result.current.setDishIcon('dish-1', '🍝'))
    expect(result.current.meals[0].entries[0].dish_icon).toBe('🍝')

    const updatedEntry = {
      ...entry,
      name: 'Bowl pollo e riso',
      items: [{ ...entry.items[0], quantity_g: 120, calories: 156 }],
    }
    mocks.updateMealEntry.mockResolvedValue(updatedEntry)

    await act(async () => {
      await result.current.updateMealEntry(updatedEntry.id, updatedEntry.name, drafts.slice(0, 1))
    })

    expect(result.current.meals[0].entries[0]).toEqual({ ...updatedEntry, dish_icon: '🍝' })
    expect(mealItems(result.current.meals[0])).toEqual(updatedEntry.items)

    mocks.deleteMealEntry.mockResolvedValue(undefined)
    await act(async () => {
      await result.current.removeMealEntry(updatedEntry.id)
    })

    expect(mocks.deleteMealEntry).toHaveBeenCalledWith(updatedEntry.id)
    expect(result.current.meals).toEqual([])
  })

  it('marks an atomically completed onboarding as owned by the current user', async () => {
    mocks.getHealthProfile.mockResolvedValue(null)
    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('missing'))

    await act(async () => {
      await result.current.completeOnboarding({
        user_id: 'user-1', age: 30, sex: 'male', height_cm: 180, weight_kg: 80,
        activity_level: 'moderate', objective: 'maintain', target_weight_kg: null,
        target_date: null, body_fat_pct: null, bmr_override: null, does_resistance_training: true,
      }, { calorie_target: 2400, protein_g: 180, carbs_g: 240, fat_g: 80 })
    })

    expect(mocks.completeOnboarding).toHaveBeenCalledTimes(1)
    expect(result.current.profileStatus).toBe('ready')
    expect(result.current.profileUserId).toBe('user-1')
  })

  it('saves profile changes and recalculates the complete goal pipeline', async () => {
    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))

    await act(async () => {
      await result.current.saveProfileAndRecalculate({
        ...profile,
        height_cm: 185,
        does_resistance_training: false,
      })
    })

    expect(mocks.completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ height_cm: 185, does_resistance_training: false }),
      expect.objectContaining({
        calculation_weight_kg: 80,
        calorie_target: expect.any(Number),
        protein_g: 72,
        fat_g: 64,
        carbs_g: expect.any(Number),
      }),
    )
    expect(result.current.profile?.activity_level).toBe('moderate')
    expect(result.current.profile?.does_resistance_training).toBe(false)
    expect(result.current.profile?.height_cm).toBe(185)
  })

  it('recalculates all goals when the seven-day average differs by two percent', async () => {
    mocks.getUserGoals.mockResolvedValue({
      user_id: 'user-1', calorie_target: 2500, protein_g: 128, carbs_g: 350, fat_g: 64,
      calculation_weight_kg: 80, updated_at: '',
    })
    mocks.getLatestWeightLog.mockResolvedValue({ weight_kg: 78.3 })
    mocks.getWeightLogs.mockResolvedValue([
      { weight_kg: 78.5 }, { weight_kg: 78.3 }, { weight_kg: 78.4 },
    ])

    const { result } = renderHook(() => useTestData(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.profileStatus).toBe('ready'))

    expect(mocks.upsertUserGoals).toHaveBeenCalledWith(expect.objectContaining({
      calculation_weight_kg: 78.4,
      calorie_target: expect.any(Number),
      protein_g: expect.any(Number),
      fat_g: expect.any(Number),
      carbs_g: expect.any(Number),
    }))
    expect(result.current.goals?.calculation_weight_kg).toBe(78.4)
    expect(result.current.rollingWeightKg).toBe(78.4)
  })
})
