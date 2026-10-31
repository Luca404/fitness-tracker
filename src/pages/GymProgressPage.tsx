import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { getCompletedGymSessions } from '../services/gymApi'
import { getLatestWeightLog, getWeightLogs } from '../services/api'
import type { GymSession, WeightLog } from '../types'
import GymSessionCard from '../components/workout/GymSessionCard'
import { buildGymProgress, exerciseDescription, formatGymPerformance } from '../utils/gymProgress'
import { formatDecimal } from '../utils/decimal'

function sessionDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GymProgressPage() {
  const { user } = useAuth()
  const { currentWeightKg } = useData()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [selectedKey, setSelectedKey] = useState('')
  const [showAllSessions, setShowAllSessions] = useState(false)

  useEffect(() => {
    let current = true
    setLoading(true)
    setError(false)
    setSessions([])
    setWeights([])
    async function load() {
      try {
        const data = await getCompletedGymSessions()
        // Keep a consistent order even when fixtures or cached responses are unordered.
        const completed = data.filter(session => session.completed_at).sort((a, b) =>
          b.date.localeCompare(a.date) || b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id))
        let weightLogs: WeightLog[] = []
        if (completed.length > 0) {
          const from = completed.at(-1)!.date
          try {
            const [earlier, withinRange] = await Promise.all([
              getLatestWeightLog(from), getWeightLogs(from, completed[0].date),
            ])
            weightLogs = earlier ? [earlier, ...withinRange] : withinRange
          } catch { /* Session cards use the current weight as an explicit fallback. */ }
        }
        if (current) { setSessions(completed); setWeights(weightLogs) }
      } catch { if (current) setError(true) }
      finally { if (current) setLoading(false) }
    }
    void load()
    return () => { current = false }
  }, [user?.id, attempt])

  const exercises = buildGymProgress(sessions)
  const selected = exercises.find(exercise => exercise.key === selectedKey) ?? exercises[0]
  const latest = selected?.points.at(-1)
  const previous = selected?.points.at(-2)
  const difference = latest && previous
    ? selected.bodyweight ? latest.best.reps! - previous.best.reps! : latest.best.weight_kg! - previous.best.weight_kg!
    : null
  const totalSets = sessions.reduce((sum, session) => sum + session.sets.filter(set => set.done).length, 0)
  const chartData = selected?.points.map(point => ({
    sessionId: point.sessionId,
    date: new Date(`${point.date}T00:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
    fullDate: sessionDate(point.date),
    value: selected.bodyweight ? point.best.reps : point.best.weight_kg,
    performance: formatGymPerformance(point.best),
  })) ?? []

  function openSession(id: string) {
    navigate(`/fitness/session/${id}?from=progress`)
  }

  if (loading) return <div className="space-y-3" role="status" aria-label="Caricamento progressi">
    <div className="h-24 animate-pulse rounded-2xl bg-gray-800" />
    <div className="h-64 animate-pulse rounded-2xl bg-gray-800" />
  </div>

  if (error) return <div role="alert" className="card space-y-3">
    <p>Non è stato possibile caricare i progressi.</p>
    <button type="button" className="btn-primary" onClick={() => setAttempt(value => value + 1)}>Riprova</button>
  </div>

  return <div className="space-y-5">
    <div>
      <h1 className="text-xl font-bold">I tuoi progressi</h1>
      <p className="mt-1 text-sm text-gray-400">Dalle ultime 30 sessioni palestra completate.</p>
    </div>
    {sessions.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-700 p-6 text-center">
      <span aria-hidden="true" className="text-3xl">🏋️</span>
      <p className="mt-3 font-semibold">Qui vedrai i tuoi allenamenti</p>
      <p className="mt-1 text-sm text-gray-400">Completa una sessione da Allenamenti per iniziare a seguire i progressi.</p>
    </div> : <>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([['Sessioni', sessions.length], ['Serie completate', totalSets], ['Esercizi seguiti', exercises.length]] as const).map(([label, value]) =>
          <div key={label} className="rounded-2xl bg-gray-800 p-3"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-gray-400">{label}</p></div>)}
      </div>

      <section className="card space-y-4" aria-label="Progressi per esercizio">
        <div>
          <h2 className="text-lg font-semibold">Progressi per esercizio</h2>
          <p className="mt-1 text-xs text-gray-400">Confronta le serie completate con lo stesso attrezzo e la stessa inclinazione.</p>
        </div>
        {selected && latest ? <>
          <label className="block text-xs font-medium text-gray-400">Esercizio
            <select value={selected.key} onChange={event => setSelectedKey(event.target.value)} className="input-field mt-2 text-sm">
              {exercises.map(exercise => <option key={exercise.key} value={exercise.key}>{exercise.name} · {exerciseDescription(exercise)}</option>)}
            </select>
          </label>
          {selected.equipment.toLowerCase() === 'manubri' && <p className="text-xs text-gray-400">Carico indicato per singolo manubrio.</p>}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-900/60 p-3">
              <p className="text-xs text-gray-400">Ultima sessione</p>
              <p className="mt-2 text-sm font-semibold">{formatGymPerformance(latest.best)}</p>
              <p className="mt-1 text-xs text-gray-500">{sessionDate(latest.date)} · {latest.sets} serie</p>
            </div>
            <div className="rounded-xl bg-primary-950/30 p-3 ring-1 ring-primary-800/40">
              <p className="text-xs text-primary-300">Migliore nel periodo</p>
              <p className="mt-2 text-sm font-semibold">{formatGymPerformance(selected.best.best)}</p>
              <p className="mt-1 text-xs text-gray-500">{sessionDate(selected.best.date)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Serie di riferimento: carico più alto, poi più ripetizioni a parità di carico. A corpo libero si confrontano le ripetizioni.</p>
          {difference !== null && <p className="rounded-xl border border-gray-700 p-3 text-sm text-gray-300">
            {selected.bodyweight ? 'Ripetizioni' : 'Carico'} rispetto alla sessione precedente: <b className="text-white">{difference > 0 ? '+' : ''}{formatDecimal(difference)} {selected.bodyweight ? 'rip.' : 'kg'}</b>
          </p>}
          {chartData.length >= 2 ? <div>
            <p className="mb-3 text-xs font-medium text-gray-400">{selected.bodyweight ? 'Ripetizioni' : 'Carico (kg)'} della serie di riferimento · {chartData.length} sessioni</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#343c34" />
                <XAxis dataKey="date" tick={{ fill: '#aab4a5', fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} allowDecimals={!selected.bodyweight} tick={{ fill: '#aab4a5', fontSize: 10 }} />
                <Tooltip content={({ active, payload }) => active && payload?.[0] ? <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 text-xs">
                  <p className="text-gray-400">{payload[0].payload.fullDate}</p>
                  <p className="mt-1 font-semibold">{payload[0].payload.performance}</p>
                </div> : null} />
                <Line type="linear" dataKey="value" stroke="#d4e6a3" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div> : <p className="text-sm text-gray-400">Serve una seconda sessione con questo esercizio per mostrare l’andamento.</p>}
          <button type="button" onClick={() => openSession(latest.sessionId)} className="w-full rounded-xl border border-gray-600 py-2.5 text-sm font-medium text-gray-200">Apri ultima sessione</button>
        </> : <p className="text-sm text-gray-400">Le sessioni ci sono, ma non contengono serie completate con ripetizioni valide da confrontare.</p>}
      </section>

      <section className="space-y-3" aria-label="Sessioni recenti">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sessioni recenti</h2>
          <span className="text-xs text-gray-500">{sessions.length} completate</span>
        </div>
        {(showAllSessions ? sessions : sessions.slice(0, 3)).map(session => <GymSessionCard key={session.id}
          session={session} weightLogs={weights} fallbackWeightKg={currentWeightKg} showDate onOpen={() => openSession(session.id)} />)}
        {sessions.length > 3 && <button type="button" onClick={() => setShowAllSessions(value => !value)}
          aria-expanded={showAllSessions} className="w-full rounded-xl border border-gray-700 py-3 text-sm text-primary-300">
          {showAllSessions ? 'Mostra solo le ultime 3' : `Mostra tutte le ${sessions.length} sessioni`}
        </button>}
      </section>
    </>}
  </div>
}
