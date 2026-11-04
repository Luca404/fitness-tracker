import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useData } from './DataContext'
import { getFitnessPoints } from '../services/fitnessPoints'
import type { FitnessPoints } from '../services/fitnessPoints'

interface PointsContextValue {
  data: FitnessPoints | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const FitnessPointsContext = createContext<PointsContextValue | null>(null)

export function FitnessPointsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { mealRevision, workouts } = useData()
  const { pathname, search } = useLocation()
  const dateParam = pathname === '/points' ? new URLSearchParams(search).get('date') : null
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null
  const key = `${user?.id}:${date ?? ''}`
  const [state, setState] = useState<{ key: string; data: FitnessPoints | null; error: string | null }>({ key: '', data: null, error: null })
  const [pending, setPending] = useState(false)
  const request = useRef(0)
  const userId = user?.id

  const refresh = useCallback(async () => {
    const id = ++request.current
    if (!userId) return
    setPending(true)
    try {
      const data = await getFitnessPoints(date)
      if (id === request.current) setState({ key, data, error: null })
    } catch {
      if (id === request.current) setState({ key, data: null, error: 'Impossible caricare i punti. Riprova.' })
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
  }, [refresh, mealRevision, workouts, pathname, key])

  return <FitnessPointsContext.Provider value={{
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: pending || state.key !== key,
    refresh,
  }}>{children}</FitnessPointsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFitnessPoints() {
  return useContext(FitnessPointsContext)
}
