import { useEffect, useMemo, useState } from 'react'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { useData } from '../../contexts/DataContext'
import { getGuideline } from '../../data/nutritionGuidelines'
import { getMealsForRange } from '../../services/api'
import type { FoodCategory, Meal } from '../../types'

interface Props {
  selectedDate: string
  currentMeals: Meal[]
}

interface HabitRow {
  label: string
  icon: string
  value: number
  target: number
  period: 'oggi' | 'settimana'
}

function gramsForCategories(meals: Meal[], categories: FoodCategory[]) {
  return meals
    .flatMap(meal => meal.items)
    .filter(item => item.unit === 'g' && categories.includes(item.category))
    .reduce((sum, item) => sum + item.quantity_g, 0)
}

function calculateHabitRows(
  selectedDate: string,
  currentMeals: Meal[],
  weeklyMeals: Meal[],
  targets: { vegetables: number; fruit: number; legumes: number; fish: number },
): HabitRow[] {
  const mergedWeek = [
    ...weeklyMeals.filter(meal => meal.date !== selectedDate),
    ...currentMeals,
  ]
  return [
    { label: 'Verdura', icon: '🥬', value: gramsForCategories(currentMeals, ['vegetable']), target: targets.vegetables, period: 'oggi' },
    { label: 'Frutta', icon: '🍎', value: gramsForCategories(currentMeals, ['fruit']), target: targets.fruit, period: 'oggi' },
    { label: 'Legumi', icon: '🫘', value: gramsForCategories(mergedWeek, ['legume']), target: targets.legumes, period: 'settimana' },
    { label: 'Pesce', icon: '🐟', value: gramsForCategories(mergedWeek, ['fish']), target: targets.fish, period: 'settimana' },
  ]
}

export default function GoodHabits({ selectedDate, currentMeals }: Props) {
  const { profile } = useData()
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
    return calculateHabitRows(selectedDate, currentMeals, weeklyMeals, {
      vegetables: getGuideline('vegetables', sex, age)?.limitValue ?? 400,
      fruit: getGuideline('fruit', sex, age)?.limitValue ?? 360,
      legumes: getGuideline('legumes', sex, age)?.limitValue ?? 450,
      fish: getGuideline('fish', sex, age)?.limitValue ?? 300,
    })
  }, [currentMeals, profile, selectedDate, weeklyMeals])

  return (
    <section>
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Alimentazione</p>
          <h2 className="mt-0.5 text-lg font-bold">Buone abitudini</h2>
        </div>
        {loading && <span className="text-xs text-gray-600">Aggiorno…</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(row => {
          const progress = Math.min(100, Math.round((row.value / row.target) * 100))
          return (
            <div key={row.label} className="rounded-2xl border border-gray-800 bg-gray-800/55 p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{row.icon}</span>
                <span className="text-sm font-semibold">{row.label}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-300">{Math.round(row.value)} g</span> / {row.target} g · {row.period}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-700">
                <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
