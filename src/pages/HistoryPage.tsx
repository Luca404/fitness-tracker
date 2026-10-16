import { useEffect, useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useData } from '../contexts/DataContext'
import { getLatestWeightLog, getMealsForRange, getWeightLogs, getWorkoutsForRange } from '../services/api'
import { getGymSessionsForRange } from '../services/gymApi'
import { buildHistoryData, historyAverage, historyWindow } from '../utils/history'
import { useAuth } from '../contexts/AuthContext'
import { useSettings } from '../contexts/SettingsContext'
import type { GymSession, Meal, WeightLog, Workout } from '../types'
import { formatDecimal } from '../utils/decimal'

type Range = 7 | 30

export default function HistoryPage() {
  const { goals, showToast, currentWeightKg } = useData()
  const { user } = useAuth()
  const { today } = useSettings()
  const userId = user?.id
  const [range, setRange] = useState<Range>(7)
  const { from, to } = useMemo(() => historyWindow(today, range), [today, range])
  const [meals, setMeals] = useState<Meal[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [gymSessions, setGymSessions] = useState<GymSession[]>([])
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(false)
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
          setLoadError(true)
          showToast('Errore caricamento storico')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (userId) void load()
    return () => { cancelled = true }
  }, [from, to, showToast, userId, reload])

  const chartData = useMemo(() => buildHistoryData(from, to,
    meals, workouts, gymSessions, weights, currentWeightKg),
  [meals, workouts, gymSessions, weights, currentWeightKg, from, to])

  const avgConsumed = historyAverage(chartData, 'Mangiato')
  const avgBurned = historyAverage(chartData, 'Bruciato')
  const missingDays = chartData.filter(day => day.Mangiato === null || day.Bruciato === null)

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
      <p className="text-xs text-gray-400">Ultimi {range} giorni conclusi. Oggi è escluso dal grafico e dalle medie.</p>

      {loading ? (
        <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
      ) : loadError ? (
        <div role="alert" className="card text-sm text-gray-400">
          <p>Storico non disponibile. Riprova a caricare i dati.</p>
          <button type="button" onClick={() => setReload(value => value + 1)} className="mt-2 text-primary-400">Riprova</button>
        </div>
      ) : (
        <div className="card">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={value => formatDecimal(Number(value), 0)} />
              <Tooltip
                filterNull={false}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(value: unknown) => value == null ? 'Dati mancanti' : `${formatDecimal(Number(value), 0)} kcal`}
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
              <Line type="monotone" dataKey="Mangiato" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="Bruciato" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!loading && !loadError && missingDays.length > 0 && <details className="card text-xs text-gray-400">
        <summary className="cursor-pointer font-medium">Dati mancanti · {missingDays.length} {missingDays.length === 1 ? 'giorno' : 'giorni'}</summary>
        <p className="mt-2">Le interruzioni nel grafico indicano dati mancanti, esclusi dalle rispettive medie.</p>
        <ul className="mt-2 space-y-1">
          {missingDays.map(day => <li key={day.date}>{day.date} · {day.Mangiato === null && day.Bruciato === null
            ? 'Pasti e attività: dati mancanti' : day.Mangiato === null ? 'Pasti: dati mancanti' : 'Attività: dati mancanti'}</li>)}
        </ul>
      </details>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Media kcal/giorno</p>
          <p className="text-2xl font-bold text-primary-400">{loading ? '…' : loadError || avgConsumed.value === null ? '—' : formatDecimal(avgConsumed.value, 0)}</p>
          {!loading && <p className="mt-1 text-xs text-gray-500">{loadError ? 'Dati non disponibili' : `Giorni conteggiati: ${avgConsumed.days}`}</p>}
        </div>
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Media bruciate/giorno</p>
          <p className="text-2xl font-bold text-orange-400">{loading ? '…' : loadError || avgBurned.value === null ? '—' : formatDecimal(avgBurned.value, 0)}</p>
          {!loading && <p className="mt-1 text-xs text-gray-500">{loadError ? 'Dati non disponibili' : `Giorni conteggiati: ${avgBurned.days}`}</p>}
        </div>
      </div>
    </div>
  )
}
