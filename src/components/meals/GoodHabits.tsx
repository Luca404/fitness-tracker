import { useEffect, useMemo, useState } from 'react'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { Link } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import { getGuideline } from '../../data/nutritionGuidelines'
import { getMealsForRange } from '../../services/api'
import { calculateHabitRows, summarizeHabitRows } from '../../utils/goodHabits'
import type { Meal } from '../../types'

interface Props {
  selectedDate: string
  currentMeals: Meal[]
  compact?: boolean
}

export default function GoodHabits({ selectedDate, currentMeals, compact = false }: Props) {
  const { profile, goals } = useData()
  const [weeklyMeals, setWeeklyMeals] = useState<Meal[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const refreshKey = currentMeals.reduce((count, meal) => count + meal.items.length, 0)
  const requestKey = `${selectedDate}:${refreshKey}`
  const loading = loadedKey !== requestKey

  useEffect(() => {
    let cancelled = false
    const date = new Date(`${selectedDate}T12:00:00`)
    const from = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const to = format(endOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    getMealsForRange(from, to)
      .then(meals => {
        if (cancelled) return
        setWeeklyMeals(meals)
        setLoadedKey(requestKey)
      })
      .catch(() => {
        if (cancelled) return
        setWeeklyMeals([])
        setLoadedKey(requestKey)
      })

    return () => { cancelled = true }
  }, [requestKey, selectedDate])

  const rows = useMemo(() => {
    const sex = profile?.sex ?? 'female'
    const age = profile?.age ?? 18
    const sugarsPercent = getGuideline('free_sugars', sex, age)?.limitValue ?? 15
    return calculateHabitRows(selectedDate, currentMeals, weeklyMeals, {
      vegetables: getGuideline('vegetables', sex, age)?.limitValue ?? 400,
      fruit: getGuideline('fruit', sex, age)?.limitValue ?? 360,
      legumes: getGuideline('legumes', sex, age)?.limitValue ?? 450,
      fish: getGuideline('fish', sex, age)?.limitValue ?? 300,
      fiber: getGuideline('fiber', sex, age)?.limitValue ?? 25,
      sugars: Math.round(((goals?.calorie_target ?? 2000) * sugarsPercent / 100 / 4) * 10) / 10,
      salt: getGuideline('salt', sex, age)?.limitValue ?? 5,
    })
  }, [currentMeals, goals?.calorie_target, profile, selectedDate, weeklyMeals])

  if (compact) {
    const summary = summarizeHabitRows(rows)
    return (
      <Link
        to="/wellbeing"
        className="group flex items-center gap-3 rounded-2xl border border-gray-700/70 bg-gray-800/55 px-4 py-3 transition hover:border-primary-700 hover:bg-gray-800"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-xl">🌿</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-200">Buone abitudini</span>
          <span className="mt-0.5 block truncate text-xs text-gray-500">
            {loading
              ? 'Aggiorno il riepilogo…'
              : `${summary.ok} in linea · ${summary.needsAttention} da migliorare${summary.incomplete > 0 ? ` · ${summary.incomplete} da completare` : ''}`}
          </span>
        </span>
        <span className="text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-primary-400">→</span>
      </Link>
    )
  }

  const dailyRows = rows.filter(row => row.period === 'oggi')
  const weeklyRows = rows.filter(row => row.period === 'settimana')

  function renderRows(habitRows: typeof rows) {
    return habitRows.map(row => {
      const progress = row.value == null ? 0 : Math.min(100, Math.round((row.value / row.target) * 100))
      const overMaximum = row.direction === 'max' && row.value != null && row.value > row.target
      const displayValue = row.value == null
        ? null
        : row.label === 'Sale' ? Math.round(row.value * 100) / 100 : Math.round(row.value * 10) / 10
      return (
        <div key={row.label} className="rounded-2xl border border-gray-800 bg-gray-800/55 p-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{row.icon}</span>
            <span className="text-sm font-semibold">{row.label}</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {displayValue == null ? (
              <span className="text-gray-600">Dato non disponibile</span>
            ) : (
              <>
                <span className={`font-semibold ${overMaximum ? 'text-orange-400' : 'text-gray-300'}`}>{row.partial ? '≈ ' : ''}{displayValue} g</span>
                {' '}{row.direction === 'max' ? '≤' : '≥'} {row.target} g
                {row.partial && <span className="text-amber-500/80"> · parziale</span>}
              </>
            )}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-700">
            <div className={`h-full rounded-full transition-all ${overMaximum ? 'bg-orange-500' : 'bg-primary-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )
    })
  }

  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Alimentazione</p>
          <h2 className="mt-0.5 text-lg font-bold">Buone abitudini</h2>
        </div>
        {loading && <span className="text-xs text-gray-600">Aggiorno…</span>}
      </div>
      <div className="space-y-5">
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Oggi</p>
          <div className="grid grid-cols-2 gap-2">{renderRows(dailyRows)}</div>
        </div>
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Questa settimana</p>
          <div className="grid grid-cols-2 gap-2">{renderRows(weeklyRows)}</div>
        </div>
      </div>
    </section>
  )
}
