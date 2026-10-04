// src/contexts/DataContext.tsx
import {
  createContext, useContext, useState, useCallback, useEffect, useRef
} from 'react'
import type { ReactNode } from 'react'
import type {
  UserHealthProfile, UserGoals, Meal, MealItemInput, MealType, Workout, DaySummary, SuggestedGoals
} from '../types'
import * as api from '../services/api'
import { useAuth } from './AuthContext'
import { calculatedGoals, loadWeightState, recalculateGoalsForWeight } from '../services/goalRefresh'
import { NUTRITION_GOAL_CONFIG } from '../config/nutritionGoals'
import { useDiary } from '../hooks/useDiary'
import { useSettings } from './SettingsContext'

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
  refreshDiary: () => Promise<void>
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
  mealRevision: number
  getWeeklyMeals: (from: string, to: string) => Promise<Meal[]>
  showToast: (msg: string) => void
}

const DataContext = createContext<DataContextType | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { selectedDate } = useSettings()
  const userId = user?.id
  const [profile, setProfile] = useState<UserHealthProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('idle')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [goals, setGoals] = useState<UserGoals | null>(null)
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null)
  const [rollingWeightKg, setRollingWeightKg] = useState<number | null>(null)
  const [rollingWeightSampleCount, setRollingWeightSampleCount] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const profileRequest = useRef(0)

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const diary = useDiary(userId, selectedDate, currentWeightKg, showToast)
  const { refreshDiary } = diary

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const fetchProfile = useCallback(async () => {
    if (!userId) return
    const requestId = ++profileRequest.current
    setProfileStatus('loading')
    try {
      const [p, g, weightState] = await Promise.all([
        api.getHealthProfile(), api.getUserGoals(), loadWeightState(),
      ])
      if (requestId !== profileRequest.current) return
      const rollingSummary = weightState.summary
      let resolvedGoals = g
      try {
        resolvedGoals = await recalculateGoalsForWeight(p, g, rollingSummary)
        if (resolvedGoals !== g && requestId === profileRequest.current) {
          showToast(`Target aggiornati sul peso medio di ${rollingSummary.averageKg} kg`)
        }
      } catch { showToast('Ricalcolo automatico dei target non riuscito') }
      if (requestId !== profileRequest.current) return
      setProfile(p)
      setGoals(resolvedGoals)
      setCurrentWeightKg(weightState.latestWeightKg ?? p?.weight_kg ?? null)
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

  const resetProfile = useCallback(() => {
    setProfile(null)
    setProfileUserId(null)
    setGoals(null)
    setCurrentWeightKg(null)
    setRollingWeightKg(null)
    setRollingWeightSampleCount(0)
    setProfileStatus(userId ? 'loading' : 'idle')
  }, [userId])

  useEffect(() => {
    profileRequest.current += 1
    // Clear the previous account's private data before loading the next account.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetProfile()
    if (userId) fetchProfile()
  }, [userId, fetchProfile, resetProfile])

  const refreshCurrentWeight = useCallback(async () => {
    const requestId = profileRequest.current
    const { latestWeightKg, summary: rollingSummary } = await loadWeightState()
    if (requestId !== profileRequest.current) return
    setCurrentWeightKg(latestWeightKg ?? profile?.weight_kg ?? null)
    setRollingWeightKg(rollingSummary.averageKg)
    setRollingWeightSampleCount(rollingSummary.sampleCount)
    await refreshDiary()
    if (requestId !== profileRequest.current) return

    try {
      const recalculated = await recalculateGoalsForWeight(profile, goals, rollingSummary)
      if (requestId !== profileRequest.current) return
      if (recalculated !== goals) {
        setGoals(recalculated)
        showToast(`Target aggiornati sul peso medio di ${rollingSummary.averageKg} kg`)
      }
    } catch { showToast('Peso salvato, ma il ricalcolo automatico dei target non è riuscito') }
  }, [goals, profile, showToast, refreshDiary])

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


  return (
    <DataContext.Provider value={{
      profile, profileStatus, profileUserId, goals, currentWeightKg, rollingWeightKg,
      rollingWeightSampleCount, ...diary, toast,
      fetchProfile, refreshCurrentWeight, completeOnboarding, saveGoals,
      saveProfileAndRecalculate,
      showToast,
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
