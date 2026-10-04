// src/contexts/SettingsContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { format } from 'date-fns'

interface SettingsContextType {
  selectedDate: string        // YYYY-MM-DD
  setSelectedDate: (d: string) => void
  today: string
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [selectedDate, setSelectedDate] = useState(today)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function updateToday() {
      const now = new Date()
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      setToday(format(now, 'yyyy-MM-dd'))
      clearTimeout(timer)
      timer = setTimeout(updateToday, nextDay.getTime() - now.getTime() + 100)
    }
    updateToday()
    window.addEventListener('focus', updateToday)
    document.addEventListener('visibilitychange', updateToday)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', updateToday)
      document.removeEventListener('visibilitychange', updateToday)
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ selectedDate, setSelectedDate, today }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its Provider
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
