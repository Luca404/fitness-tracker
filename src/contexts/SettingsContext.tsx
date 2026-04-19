// src/contexts/SettingsContext.tsx
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { format } from 'date-fns'

interface SettingsContextType {
  selectedDate: string        // YYYY-MM-DD
  setSelectedDate: (d: string) => void
  today: string
}

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)

  return (
    <SettingsContext.Provider value={{ selectedDate, setSelectedDate, today }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be inside SettingsProvider')
  return ctx
}
