import { useEffect, useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useData } from '../contexts/DataContext'
import { getLatestWeightLog, getMealsForRange, getWeightLogs, getWorkoutsForRange } from '../services/api'
import { getGymSessionsForRange } from '../services/gymApi'
import { buildHistoryData } from '../utils/history'
import { useAuth } from '../contexts/AuthContext'
import type { GymSession, Meal, WeightLog, Workout } from '../types'
import { formatDecimal } from '../utils/decimal'

type Range = 7 | 30

export default function HistoryPage() {
  const { goals, showToast, currentWeightKg } = useData()
  const { user } = useAuth()
  const userId = user?.id
  const [range, setRange] = useState<Range>(7)
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const to = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), range - 1), 'yyyy-MM-dd')

    async function load() {
      setLoading(true)
      try {
        const [m, w, sessions, before, within] = await Promise.all([
          getMealsForRange(from, to), getWorkoutsForRange(from, to), getGymSessionsForRange(from, to),
          getLatestWeightLog(from), getWeightLogs(from, to),
        ])
        if (cancelled) return
        setMeals(m)
        setWorkouts(w)
        setGymSessions(sessions)
        setWeights(before ? [before, ...within] : within)
      } catch {
        if (!cancelled) {
          setMeals([]); setWorkouts([]); setGymSessions([]); setWeights([])
          showToast('Errore caricamento storico')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (userId) void load()
    return () => { cancelled = true }
  }, [range, showToast, userId])

  const chartData = useMemo(() => {
    const to = new Date()
    return buildHistoryData(format(subDays(to, range - 1), 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'),
      meals, workouts, gymSessions, weights, currentWeightKg)
  }, [meals, workouts, gymSessions, weights, currentWeightKg, range])

  const avgConsumed = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.Mangiato, 0) / chartData.length
    : 0
  const avgBurned = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.Bruciato, 0) / chartData.length
    : 0

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex gap-2">
        {([7, 30] as Range[]).map(r => (
          <button key={r} type="button" onClick={() => setRange(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'
            }`}>
            {r} giorni
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <div className="card">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={value => formatDecimal(Number(value), 0)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: unknown) => `${formatDecimal(Number(value), 0)} kcal`}
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
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Media kcal/giorno</p>
          <p className="text-2xl font-bold text-primary-400">{formatDecimal(avgConsumed, 0)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Media bruciate/giorno</p>
          <p className="text-2xl font-bold text-orange-400">{formatDecimal(avgBurned, 0)}</p>
        </div>
      </div>
    </div>
  )
}
