import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DaySummary, GymSession, Meal, MealItemInput, MealType, Workout } from '../types'
import * as api from '../services/api'
import { getGymSessionsForDate } from '../services/gymApi'
import { estimateGymSessionCalories } from '../utils/gymSessionSummary'
import { mealItems } from '../utils/mealEntries'

interface DiaryDay {
  date: string | null
  meals: Meal[]
  workouts: Workout[]
  gymSessions: GymSession[]
  gymWeightKg: number | null
  status: 'idle' | 'loading' | 'ready' | 'error'
}

const emptyDay: DiaryDay = {
  date: null, meals: [], workouts: [], gymSessions: [], gymWeightKg: null, status: 'idle',
}

export function useDiary(userId: string | undefined, selectedDate: string, currentWeightKg: number | null,
  showToast: (message: string) => void) {
  const [day, setDay] = useState<DiaryDay>(emptyDay)
  const [mealRevision, setMealRevision] = useState(0)
  const request = useRef(0)
  const activeDate = useRef<string | null>(null)
  const currentUser = useRef(userId)
  const selectedDay = useRef(selectedDate)
  const pendingRead = useRef<number | null>(null)
  const weeklyCache = useRef(new Map<string, { expires: number; promise: Promise<Meal[]> }>())

  const invalidateMeals = useCallback(() => {
    weeklyCache.current.clear()
    setMealRevision(revision => revision + 1)
  }, [])

  const loadDay = useCallback(async (date: string) => {
    const id = ++request.current
    activeDate.current = date
    pendingRead.current = id
    setDay(previous => previous.date === date
      ? { ...previous, status: 'loading' }
      : { ...emptyDay, date, status: 'loading' })
    try {
      const [meals, workouts, gymSessions, weight] = await Promise.all([
        api.getMealsForDate(date), api.getWorkoutsForDate(date),
        getGymSessionsForDate(date), api.getLatestWeightLog(date),
      ])
      if (request.current === id) {
        setDay({ date, meals, workouts, gymSessions, gymWeightKg: weight?.weight_kg ?? null, status: 'ready' })
      }
    } catch {
      if (request.current === id) {
        setDay(previous => ({ ...previous, status: 'error' }))
        showToast('Errore caricamento dati')
      }
    } finally {
      if (pendingRead.current === id) pendingRead.current = null
    }
  }, [showToast])

  useEffect(() => {
    currentUser.current = userId
    request.current += 1
    pendingRead.current = null
    activeDate.current = null
    weeklyCache.current.clear()
    setDay(emptyDay)
  }, [userId])

  useEffect(() => {
    selectedDay.current = selectedDate
    if (userId) void loadDay(selectedDate)
  }, [userId, selectedDate, loadDay])

  const fetchForDate = useCallback(async (date: string) => {
    invalidateMeals()
    if (date !== selectedDay.current || !currentUser.current) return
    await loadDay(date)
  }, [invalidateMeals, loadDay])

  const refreshDiary = useCallback(() => fetchForDate(selectedDay.current), [fetchForDate])

  const getWeeklyMeals = useCallback((from: string, to: string): Promise<Meal[]> => {
    const key = `${from}:${to}`
    const cached = weeklyCache.current.get(key)
    if (cached && cached.expires > Date.now()) return cached.promise
    if (weeklyCache.current.size >= 2) weeklyCache.current.clear()
    const promise = api.getMealsForRange(from, to).catch(error => {
      if (weeklyCache.current.get(key)?.promise === promise) weeklyCache.current.delete(key)
      throw error
    })
    weeklyCache.current.set(key, { expires: Date.now() + 60_000, promise })
    return promise
  }, [])

  const applyToDate = useCallback(async (date: string | null, update: (day: DiaryDay) => DiaryDay) => {
    if (date === null || activeDate.current !== date) return
    // A read begun before the write could overwrite its result. Reload the
    // committed day instead, which also covers writes while its first load runs.
    if (pendingRead.current !== null) { await loadDay(date); return }
    setDay(previous => previous.date === date ? update(previous) : previous)
  }, [loadDay])

  const addMealEntry = useCallback(async (mealType: MealType, name: string, items: MealItemInput[],
    date: string, ownerId: string, dishId: string | null = null, dishIcon: string | null = null) => {
    if (items.length === 0) return
    const owner = currentUser.current
    const result = await api.addMealEntry(ownerId, date, mealType, name, items, dishId)
    if (currentUser.current !== owner) return
    invalidateMeals()
    const entry = { ...result.entry, dish_icon: dishIcon }
    await applyToDate(date, previous => ({ ...previous, meals: previous.meals.some(meal => meal.id === result.meal.id)
      ? previous.meals.map(meal => meal.id === result.meal.id ? { ...meal, entries: [...meal.entries, entry] } : meal)
      : [...previous.meals, { ...result.meal, entries: [entry] }],
    }))
  }, [applyToDate, invalidateMeals])

  const updateMealEntry = useCallback(async (entryId: string, name: string, items: MealItemInput[]) => {
    const date = activeDate.current
    const owner = currentUser.current
    const updated = await api.updateMealEntry(entryId, name, items)
    if (currentUser.current !== owner) return
    invalidateMeals()
    await applyToDate(date, previous => ({ ...previous, meals: previous.meals.map(meal => ({ ...meal,
      entries: meal.entries.map(entry => entry.id === entryId
        ? { ...updated, dish_icon: updated.dish_id === entry.dish_id ? entry.dish_icon : null,
          dish_icon_source_id: updated.dish_id === entry.dish_id ? entry.dish_icon_source_id : undefined } : entry),
    })) }))
  }, [applyToDate, invalidateMeals])

  const removeMealEntry = useCallback(async (entryId: string) => {
    const date = activeDate.current
    const owner = currentUser.current
    await api.deleteMealEntry(entryId)
    if (currentUser.current !== owner) return
    invalidateMeals()
    await applyToDate(date, previous => ({ ...previous, meals: previous.meals.flatMap(meal => {
      const entries = meal.entries.filter(entry => entry.id !== entryId)
      return entries.length ? [{ ...meal, entries }] : []
    }) }))
  }, [applyToDate, invalidateMeals])

  const setDishIcon = useCallback((dishId: string, icon: string | null) => {
    setDay(previous => ({ ...previous, meals: previous.meals.map(meal => ({ ...meal,
      entries: meal.entries.map(entry => entry.dish_id === dishId || entry.dish_icon_source_id === dishId
        ? { ...entry, dish_icon: icon } : entry),
    })) }))
  }, [])

  const addWorkout = useCallback(async (workout: Omit<Workout, 'id' | 'created_at'>) => {
    const owner = currentUser.current
    const saved = await api.addWorkout(workout)
    if (currentUser.current !== owner) return
    await applyToDate(workout.date, previous => ({ ...previous, workouts: [...previous.workouts, saved] }))
  }, [applyToDate])

  const removeWorkout = useCallback(async (id: string) => {
    const date = activeDate.current
    const owner = currentUser.current
    await api.deleteWorkout(id)
    if (currentUser.current !== owner) return
    await applyToDate(date, previous => ({ ...previous, workouts: previous.workouts.filter(workout => workout.id !== id) }))
  }, [applyToDate])

  const visibleDay = day.date === selectedDate ? day : emptyDay
  const daySummary = useMemo<DaySummary>(() => {
    const items = visibleDay.meals.flatMap(mealItems)
    return {
      calories: items.reduce((sum, item) => sum + item.calories, 0),
      protein_g: items.reduce((sum, item) => sum + item.protein_g, 0),
      carbs_g: items.reduce((sum, item) => sum + item.carbs_g, 0),
      fat_g: items.reduce((sum, item) => sum + item.fat_g, 0),
      calories_burned: visibleDay.workouts.reduce((sum, workout) => sum + workout.calories_burned, 0)
        + visibleDay.gymSessions.reduce((sum, session) => sum
          + (estimateGymSessionCalories(session, visibleDay.gymWeightKg ?? currentWeightKg) ?? 0), 0),
    }
  }, [visibleDay, currentWeightKg])

  return { meals: visibleDay.meals, workouts: visibleDay.workouts, loading: day.date !== selectedDate || day.status === 'loading', daySummary,
    fetchForDate, refreshDiary, addMealEntry, updateMealEntry, removeMealEntry, setDishIcon, addWorkout, removeWorkout,
    mealRevision, getWeeklyMeals }
}
