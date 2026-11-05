import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { getFitnessPoints } from '../services/fitnessPoints'
import type { FitnessPoints } from '../services/fitnessPoints'

interface PointsContextValue {
  data: FitnessPoints | null
  summary: Pick<FitnessPoints, 'total' | 'streak'> | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const FitnessPointsContext = createContext<PointsContextValue | null>(null)
// Keep only the last account's two counters in memory across layout remounts
// (e.g. returning from a gym session). Never reuse them for another account.
let lastSummary: { userId: string; value: NonNullable<PointsContextValue['summary']> } | null = null

export function FitnessPointsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const { mealRevision, workouts } = useData()
  const { pathname, search } = useLocation()
  const dateParam = pathname === '/points' ? new URLSearchParams(search).get('date') : null
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null
  const key = `${user?.id}:${date ?? ''}`
  const [state, setState] = useState<{
    userId: string | null
    key: string
    data: FitnessPoints | null
    summary: PointsContextValue['summary']
    error: string | null
  }>(() => ({
    userId: lastSummary?.userId === userId ? userId ?? null : null,
    key: '', data: null,
    summary: lastSummary?.userId === userId ? lastSummary?.value ?? null : null,
    error: null,
  }))
  const [pending, setPending] = useState(false)
  const request = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++request.current
    if (!userId) return
    setPending(true)
    try {
      const data = await getFitnessPoints(date)
      if (id === request.current) {
        const summary = { total: data.total, streak: data.streak }
        lastSummary = { userId, value: summary }
        setState({ userId, key, data, summary, error: null })
      }
    } catch {
      if (id === request.current) setState(previous => ({
        userId, key,
        data: previous.userId === userId && previous.key === key ? previous.data : null,
        summary: previous.userId === userId ? previous.summary : null,
        error: 'Impossible caricare i punti. Riprova.',
      }))
    } finally {
      if (id === request.current) setPending(false)
    }
  }, [userId, date, key])

  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    // Also refresh at midnight in the scoring timezone (including DST).
    const timer = window.setInterval(onFocus, 60_000)
    return () => {
      request.current += 1
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [refresh, mealRevision, workouts, key])

  return <FitnessPointsContext.Provider value={{
    data: state.key === key ? state.data : null,
    summary: userId && state.userId === userId ? state.summary : null,
    error: state.key === key ? state.error : null,
    loading: pending || state.key !== key,
    refresh,
  }}>{children}</FitnessPointsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFitnessPoints() {
  return useContext(FitnessPointsContext)
}
