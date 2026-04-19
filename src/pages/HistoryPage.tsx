import { useEffect, useState, useMemo } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useData } from '../contexts/DataContext'
import { getMealsForRange, getWorkoutsForRange } from '../services/api'
import type { Meal, Workout } from '../types'

type Range = 7 | 30

export default function HistoryPage() {
  const { goals } = useData()
  const [range, setRange] = useState<Range>(7)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const to = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), range - 1), 'yyyy-MM-dd')
    setLoading(true)
    Promise.all([getMealsForRange(from, to), getWorkoutsForRange(from, to)])
      .then(([m, w]) => { setMeals(m); setWorkouts(w) })
      .finally(() => setLoading(false))
  }, [range])

  const chartData = useMemo(() => {
    const to = new Date()
    const days = eachDayOfInterval({ start: subDays(to, range - 1), end: to })
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayMeals = meals.filter(m => m.date === dateStr)
      const dayWorkouts = workouts.filter(w => w.date === dateStr)
      const consumed = dayMeals.flatMap(m => m.items).reduce((s, i) => s + i.calories, 0)
      const burned = dayWorkouts.reduce((s, w) => s + w.calories_burned, 0)
      return {
        date: format(day, 'dd/MM'),
        Mangiato: Math.round(consumed),
        Bruciato: Math.round(burned),
      }
    })
  }, [meals, workouts, range])

  const avgConsumed = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.Mangiato, 0) / chartData.length
    : 0
  const avgBurned = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.Bruciato, 0) / chartData.length
    : 0

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2">
        {([7, 30] as Range[]).map(r => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
            }`}>
            {r} giorni
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-gray-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              {goals && (
                <Line
                  type="monotone"
                  dataKey={() => goals.calorie_target}
                  stroke="#6b7280"
                  strokeDasharray="4 4"
                  dot={false}
                  name="Target"
                />
              )}
              <Line type="monotone" dataKey="Mangiato" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bruciato" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Media kcal/giorno</p>
          <p className="text-2xl font-bold text-emerald-400">{Math.round(avgConsumed)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Media bruciate/giorno</p>
          <p className="text-2xl font-bold text-orange-400">{Math.round(avgBurned)}</p>
        </div>
      </div>
    </div>
  )
}
