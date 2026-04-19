// src/contexts/DataContext.tsx
import {
  createContext, useContext, useState, useCallback, useMemo
} from 'react'
import type { ReactNode } from 'react'
import type {
  UserHealthProfile, UserGoals, Meal, MealItem, MealType, Workout, DaySummary
} from '../types'
import * as api from '../services/api'

interface DataContextType {
  profile: UserHealthProfile | null
  goals: UserGoals | null
  meals: Meal[]           // for selectedDate
  workouts: Workout[]     // for selectedDate
  loading: boolean
  toast: string | null
  fetchForDate: (date: string) => Promise<void>
  fetchProfile: () => Promise<void>
  saveProfile: (p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>) => Promise<void>
  saveGoals: (g: Omit<UserGoals, 'updated_at'>) => Promise<void>
  addMealItem: (mealType: MealType, item: Omit<MealItem, 'id' | 'created_at'>, date: string, userId: string) => Promise<void>
  removeMealItem: (mealItemId: string, mealId: string) => Promise<void>
  addWorkout: (w: Omit<Workout, 'id' | 'created_at'>) => Promise<void>
  removeWorkout: (id: string) => Promise<void>
  daySummary: DaySummary
  showToast: (msg: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserHealthProfile | null>(null)
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchProfile = useCallback(async () => {
    try {
      const [p, g] = await Promise.all([api.getHealthProfile(), api.getUserGoals()])
      setProfile(p)
      setGoals(g)
    } catch {
      showToast('Errore caricamento profilo')
    }
  }, [showToast])

  const fetchForDate = useCallback(async (date: string) => {
    setLoading(true)
    try {
      const [m, w] = await Promise.all([
        api.getMealsForDate(date),
        api.getWorkoutsForDate(date),
      ])
      setMeals(m)
      setWorkouts(w)
    } catch (e) {
      showToast('Errore caricamento dati')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const saveProfile = useCallback(async (
    p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>
  ) => {
    await api.upsertHealthProfile(p)
    setProfile(prev => ({
      ...p,
      created_at: prev?.created_at ?? '',
      updated_at: new Date().toISOString(),
    }))
  }, [])

  const saveGoals = useCallback(async (g: Omit<UserGoals, 'updated_at'>) => {
    await api.upsertUserGoals(g)
    setGoals({ ...g, updated_at: new Date().toISOString() })
  }, [])

  const addMealItem = useCallback(async (
    mealType: MealType,
    item: Omit<MealItem, 'id' | 'created_at'>,
    date: string,
    userId: string
  ) => {
    // Find or create meal for this meal_type + date
    let meal = meals.find(m => m.meal_type === mealType && m.date === date)
    if (!meal) {
      meal = await api.addMeal({ user_id: userId, date, meal_type: mealType, name: null })
      setMeals(prev => [...prev, meal!])
    }
    const newItem = await api.addMealItem({ ...item, meal_id: meal.id })
    setMeals(prev => prev.map(m =>
      m.id === meal!.id ? { ...m, items: [...m.items, newItem] } : m
    ))
  }, [meals])

  const removeMealItem = useCallback(async (mealItemId: string, mealId: string) => {
    await api.deleteMealItem(mealItemId)
    setMeals(prev => prev.map(m =>
      m.id === mealId
        ? { ...m, items: m.items.filter(i => i.id !== mealItemId) }
        : m
    ))
  }, [])

  const addWorkout = useCallback(async (w: Omit<Workout, 'id' | 'created_at'>) => {
    const newW = await api.addWorkout(w)
    setWorkouts(prev => [...prev, newW])
  }, [])

  const removeWorkout = useCallback(async (id: string) => {
    await api.deleteWorkout(id)
    setWorkouts(prev => prev.filter(w => w.id !== id))
  }, [])

  const daySummary = useMemo<DaySummary>(() => {
    const allItems = meals.flatMap(m => m.items)
    return {
      calories:        allItems.reduce((s, i) => s + i.calories, 0),
      protein_g:       allItems.reduce((s, i) => s + i.protein_g, 0),
      carbs_g:         allItems.reduce((s, i) => s + i.carbs_g, 0),
      fat_g:           allItems.reduce((s, i) => s + i.fat_g, 0),
      calories_burned: workouts.reduce((s, w) => s + w.calories_burned, 0),
    }
  }, [meals, workouts])

  return (
    <DataContext.Provider value={{
      profile, goals, meals, workouts, loading, toast,
      fetchForDate, fetchProfile, saveProfile, saveGoals,
      addMealItem, removeMealItem, addWorkout, removeWorkout,
      daySummary, showToast,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be inside DataProvider')
  return ctx
}
