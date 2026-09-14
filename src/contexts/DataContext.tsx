// src/contexts/DataContext.tsx
import {
  createContext, useContext, useState, useCallback, useMemo, useEffect, useRef
} from 'react'
import type { ReactNode } from 'react'
import type {
  UserHealthProfile, UserGoals, Meal, MealItemInput, MealType, Workout, DaySummary, SuggestedGoals
} from '../types'
import * as api from '../services/api'
import { useAuth } from './AuthContext'

type ProfileStatus = 'idle' | 'loading' | 'missing' | 'ready' | 'error'

interface DataContextType {
  profile: UserHealthProfile | null
  profileStatus: ProfileStatus
  profileUserId: string | null
  goals: UserGoals | null
  currentWeightKg: number | null
  meals: Meal[]           // for selectedDate
  workouts: Workout[]     // for selectedDate
  loading: boolean
  toast: string | null
  fetchForDate: (date: string) => Promise<void>
  fetchProfile: () => Promise<void>
  refreshCurrentWeight: () => Promise<void>
  completeOnboarding: (
    p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>,
    g: SuggestedGoals
  ) => Promise<void>
  saveGoals: (g: Omit<UserGoals, 'updated_at'>) => Promise<void>
  addMealEntry: (
    mealType: MealType,
    name: string,
    items: MealItemInput[],
    date: string,
    userId: string
  ) => Promise<void>
  updateMealEntry: (
    entryId: string,
    name: string,
    items: MealItemInput[]
  ) => Promise<void>
  removeMealEntry: (entryId: string) => Promise<void>
  addWorkout: (w: Omit<Workout, 'id' | 'created_at'>) => Promise<void>
  removeWorkout: (id: string) => Promise<void>
  daySummary: DaySummary
  showToast: (msg: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState<UserHealthProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileRequest = useRef(0)
  const dateRequest = useRef(0)

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const requestId = ++profileRequest.current
    setProfileStatus('loading')
    try {
      const today = new Date().toLocaleDateString('sv-SE')
      const [p, g, latestWeight] = await Promise.all([
        api.getHealthProfile(),
        api.getUserGoals(),
        api.getLatestWeightLog(today),
      ])
      if (requestId !== profileRequest.current) return
      setProfile(p)
      setGoals(g)
      setCurrentWeightKg(latestWeight?.weight_kg ?? p?.weight_kg ?? null)
      setProfileUserId(userId)
      setProfileStatus(p ? 'ready' : 'missing')
    } catch {
      if (requestId !== profileRequest.current) return
      setProfileUserId(userId)
      setProfileStatus('error')
      showToast('Errore caricamento profilo')
    }
  }, [showToast, userId])

  useEffect(() => {
    profileRequest.current += 1
    dateRequest.current += 1
    setProfile(null)
    setProfileUserId(null)
    setGoals(null)
    setCurrentWeightKg(null)
    setMeals([])
    setWorkouts([])
    setProfileStatus(userId ? 'loading' : 'idle')
    if (userId) fetchProfile()
  }, [userId, fetchProfile])

  const refreshCurrentWeight = useCallback(async () => {
    const requestId = profileRequest.current
    const today = new Date().toLocaleDateString('sv-SE')
    const latest = await api.getLatestWeightLog(today)
    if (requestId !== profileRequest.current) return
    setCurrentWeightKg(latest?.weight_kg ?? profile?.weight_kg ?? null)
  }, [profile?.weight_kg])

  const fetchForDate = useCallback(async (date: string) => {
    const requestId = ++dateRequest.current
    setLoading(true)
    try {
      const [m, w] = await Promise.all([
        api.getMealsForDate(date),
        api.getWorkoutsForDate(date),
      ])
      if (requestId === dateRequest.current) {
        setMeals(m)
        setWorkouts(w)
      }
    } catch {
      if (requestId === dateRequest.current) showToast('Errore caricamento dati')
    } finally {
      if (requestId === dateRequest.current) setLoading(false)
    }
  }, [showToast])

  const saveGoals = useCallback(async (g: Omit<UserGoals, 'updated_at'>) => {
    await api.upsertUserGoals(g)
    setGoals({ ...g, updated_at: new Date().toISOString() })
  }, [])

  const completeOnboarding = useCallback(async (
    p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>,
    g: SuggestedGoals
  ) => {
    const goalsWithUser = { user_id: p.user_id, ...g }
    await api.completeOnboarding(p, goalsWithUser)
    setProfile({ ...p, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    setGoals({ ...goalsWithUser, updated_at: new Date().toISOString() })
    setCurrentWeightKg(p.weight_kg)
    setProfileUserId(p.user_id)
    setProfileStatus('ready')
  }, [])

  const addMealEntry = useCallback(async (
    mealType: MealType,
    name: string,
    items: MealItemInput[],
    date: string,
    userId: string
  ) => {
    if (items.length === 0) return
    const result = await api.addMealEntry(userId, date, mealType, name, items)
    setMeals(prev => {
      const existing = prev.find(m => m.id === result.meal.id)
      if (!existing) {
        return [...prev, {
          ...result.meal,
          entries: [result.entry],
          items: result.entry.items,
        }]
      }
      return prev.map(m => m.id === result.meal.id
        ? {
            ...m,
            entries: [...m.entries, result.entry],
            items: [...m.items, ...result.entry.items],
          }
        : m)
    })
  }, [])

  const updateMealEntry = useCallback(async (
    entryId: string,
    name: string,
    items: MealItemInput[]
  ) => {
    const updated = await api.updateMealEntry(entryId, name, items)
    setMeals(prev => prev.map(meal => {
      if (!meal.entries.some(entry => entry.id === entryId)) return meal
      const entries = meal.entries.map(entry => entry.id === entryId ? updated : entry)
      return { ...meal, entries, items: entries.flatMap(entry => entry.items) }
    }))
  }, [])

  const removeMealEntry = useCallback(async (entryId: string) => {
    await api.deleteMealEntry(entryId)
    setMeals(prev => prev.flatMap(meal => {
      if (!meal.entries.some(entry => entry.id === entryId)) return [meal]
      const entries = meal.entries.filter(entry => entry.id !== entryId)
      return entries.length > 0
        ? [{ ...meal, entries, items: entries.flatMap(entry => entry.items) }]
        : []
    }))
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
      profile, profileStatus, profileUserId, goals, currentWeightKg, meals, workouts, loading, toast,
      fetchForDate, fetchProfile, refreshCurrentWeight, completeOnboarding, saveGoals,
      addMealEntry, updateMealEntry, removeMealEntry, addWorkout, removeWorkout,
      daySummary, showToast,
    }}>
      {children}
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its Provider
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be inside DataProvider')
  return ctx
}
