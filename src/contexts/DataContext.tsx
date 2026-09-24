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
import { calculateNutritionGoals } from '../utils/bmr'
import { shouldAutoRecalculateGoals, summarizeRollingWeight } from '../utils/goalRecalculation'
import { NUTRITION_GOAL_CONFIG } from '../config/nutritionGoals'

type ProfileStatus = 'idle' | 'loading' | 'missing' | 'ready' | 'error'

interface DataContextType {
  profile: UserHealthProfile | null
  profileStatus: ProfileStatus
  profileUserId: string | null
  goals: UserGoals | null
  currentWeightKg: number | null
  rollingWeightKg: number | null
  rollingWeightSampleCount: number
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
  saveProfileAndRecalculate: (p: UserHealthProfile) => Promise<UserGoals>
  addMealEntry: (
    mealType: MealType,
    name: string,
    items: MealItemInput[],
    date: string,
    userId: string,
    dishId?: string | null,
    dishIcon?: string | null
  ) => Promise<void>
  updateMealEntry: (
    entryId: string,
    name: string,
    items: MealItemInput[]
  ) => Promise<void>
  removeMealEntry: (entryId: string) => Promise<void>
  setDishIcon: (dishId: string, icon: string | null) => void
  addWorkout: (w: Omit<Workout, 'id' | 'created_at'>) => Promise<void>
  removeWorkout: (id: string) => Promise<void>
  daySummary: DaySummary
  showToast: (msg: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

function localISODateWithOffset(dayOffset: number) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return date.toLocaleDateString('sv-SE')
}

function calculatedGoals(profile: UserHealthProfile, calculationWeightKg: number): Omit<UserGoals, 'updated_at'> {
  const recommendation = calculateNutritionGoals({ ...profile, weight_kg: calculationWeightKg })
  return {
    user_id: profile.user_id,
    ...recommendation.goals,
    calculation_weight_kg: calculationWeightKg,
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState<UserHealthProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null)
  const [rollingWeightKg, setRollingWeightKg] = useState<number | null>(null)
  const [rollingWeightSampleCount, setRollingWeightSampleCount] = useState(0)
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
      const today = localISODateWithOffset(0)
      const from = localISODateWithOffset(-(NUTRITION_GOAL_CONFIG.weightRecalculation.windowDays - 1))
      const [p, g, latestWeight, recentWeights] = await Promise.all([
        api.getHealthProfile(),
        api.getUserGoals(),
        api.getLatestWeightLog(today),
        api.getWeightLogs(from, today),
      ])
      if (requestId !== profileRequest.current) return
      const rollingSummary = summarizeRollingWeight(recentWeights)
      let resolvedGoals = g
      if (p && g && shouldAutoRecalculateGoals(
        rollingSummary,
        g.calculation_weight_kg ?? p.weight_kg,
      )) {
        const recalculated = calculatedGoals(p, rollingSummary.averageKg as number)
        try {
          await api.upsertUserGoals(recalculated)
          resolvedGoals = { ...recalculated, updated_at: new Date().toISOString() }
          showToast(`Target aggiornati sul peso medio di ${rollingSummary.averageKg} kg`)
        } catch {
          showToast('Ricalcolo automatico dei target non riuscito')
        }
      }
      if (requestId !== profileRequest.current) return
      setProfile(p)
      setGoals(resolvedGoals)
      setCurrentWeightKg(latestWeight?.weight_kg ?? p?.weight_kg ?? null)
      setRollingWeightKg(rollingSummary.averageKg)
      setRollingWeightSampleCount(rollingSummary.sampleCount)
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
    setRollingWeightKg(null)
    setRollingWeightSampleCount(0)
    setMeals([])
    setWorkouts([])
    setProfileStatus(userId ? 'loading' : 'idle')
    if (userId) fetchProfile()
  }, [userId, fetchProfile])

  const refreshCurrentWeight = useCallback(async () => {
    const requestId = profileRequest.current
    const today = localISODateWithOffset(0)
    const from = localISODateWithOffset(-(NUTRITION_GOAL_CONFIG.weightRecalculation.windowDays - 1))
    const [latest, recentWeights] = await Promise.all([
      api.getLatestWeightLog(today),
      api.getWeightLogs(from, today),
    ])
    if (requestId !== profileRequest.current) return
    const rollingSummary = summarizeRollingWeight(recentWeights)
    setCurrentWeightKg(latest?.weight_kg ?? profile?.weight_kg ?? null)
    setRollingWeightKg(rollingSummary.averageKg)
    setRollingWeightSampleCount(rollingSummary.sampleCount)

    if (profile && goals && shouldAutoRecalculateGoals(
      rollingSummary,
      goals.calculation_weight_kg ?? profile.weight_kg,
    )) {
      const recalculated = calculatedGoals(profile, rollingSummary.averageKg as number)
      try {
        await api.upsertUserGoals(recalculated)
        if (requestId !== profileRequest.current) return
        setGoals({ ...recalculated, updated_at: new Date().toISOString() })
        showToast(`Target aggiornati sul peso medio di ${rollingSummary.averageKg} kg`)
      } catch {
        showToast('Peso salvato, ma il ricalcolo automatico dei target non è riuscito')
      }
    }
  }, [goals, profile, showToast])

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

  const saveProfileAndRecalculate = useCallback(async (nextProfile: UserHealthProfile) => {
    const canUseRollingWeight = rollingWeightKg !== null
      && rollingWeightSampleCount >= NUTRITION_GOAL_CONFIG.weightRecalculation.minimumSamples
    const calculationWeightKg = canUseRollingWeight
      ? rollingWeightKg
      : (currentWeightKg ?? nextProfile.weight_kg)
    const profileToSave = { ...nextProfile, weight_kg: currentWeightKg ?? nextProfile.weight_kg }
    const nextGoals = calculatedGoals(profileToSave, calculationWeightKg)

    await api.completeOnboarding(profileToSave, nextGoals)
    const now = new Date().toISOString()
    const storedGoals = { ...nextGoals, updated_at: now }
    setProfile({ ...profileToSave, updated_at: now })
    setGoals(storedGoals)
    return storedGoals
  }, [currentWeightKg, rollingWeightKg, rollingWeightSampleCount])

  const completeOnboarding = useCallback(async (
    p: Omit<UserHealthProfile, 'created_at' | 'updated_at'>,
    g: SuggestedGoals
  ) => {
    const goalsWithUser = { user_id: p.user_id, ...g, calculation_weight_kg: p.weight_kg }
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
    userId: string,
    dishId: string | null = null,
    dishIcon: string | null = null
  ) => {
    if (items.length === 0) return
    const result = await api.addMealEntry(userId, date, mealType, name, items, dishId)
    const entry = { ...result.entry, dish_icon: dishIcon }
    setMeals(prev => {
      const existing = prev.find(m => m.id === result.meal.id)
      if (!existing) {
        return [...prev, {
          ...result.meal,
          entries: [entry],
          items: entry.items,
        }]
      }
      return prev.map(m => m.id === result.meal.id
        ? {
            ...m,
            entries: [...m.entries, entry],
            items: [...m.items, ...entry.items],
          }
        : m)
    })
  }, [])

  const setDishIcon = useCallback((dishId: string, icon: string | null) => {
    setMeals(current => current.map(meal => ({
      ...meal,
      entries: meal.entries.map(entry => entry.dish_id === dishId ? { ...entry, dish_icon: icon } : entry),
    })))
  }, [])

  const updateMealEntry = useCallback(async (
    entryId: string,
    name: string,
    items: MealItemInput[]
  ) => {
    const updated = await api.updateMealEntry(entryId, name, items)
    setMeals(prev => prev.map(meal => {
      if (!meal.entries.some(entry => entry.id === entryId)) return meal
      const entries = meal.entries.map(entry => entry.id === entryId
        ? { ...updated, dish_icon: updated.dish_id === entry.dish_id ? entry.dish_icon : null }
        : entry)
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
      profile, profileStatus, profileUserId, goals, currentWeightKg, rollingWeightKg,
      rollingWeightSampleCount, meals, workouts, loading, toast,
      fetchForDate, fetchProfile, refreshCurrentWeight, completeOnboarding, saveGoals,
      saveProfileAndRecalculate,
      addMealEntry, updateMealEntry, removeMealEntry, setDishIcon, addWorkout, removeWorkout,
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
