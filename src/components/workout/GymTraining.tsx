import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useNavigate } from 'react-router-dom'
import * as gymApi from '../../services/gymApi'
import type { GymPlan, GymSession, GymSet } from '../../types'
import { formatDecimal } from '../../utils/decimal'
import GymPlanEditor from './GymPlanEditor'

function formatPerformance(set: GymSet): string {
  return `${set.weight_kg == null ? 'Corpo libero' : `${formatDecimal(set.weight_kg)} kg`} × ${set.reps} rip.`
}

function gymProgress(sessions: GymSession[]) {
  const history = new Map<string, { name: string; equipment: string; last: GymSet; best: GymSet }>()
  const completed = sessions.filter(session => session.completed_at)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  for (const session of completed) {
    for (const set of session.sets.filter(item => item.done).sort((a, b) => b.set_number - a.set_number)) {
      const key = set.exercise_key ?? `${set.exercise_name.toLowerCase()}:${set.equipment.toLowerCase()}`
      const previous = history.get(key)
      if (!previous) {
        history.set(key, { name: set.exercise_name, equipment: set.equipment, last: set, best: set })
      } else if ((set.weight_kg ?? 0) > (previous.best.weight_kg ?? 0)
        || ((set.weight_kg ?? 0) === (previous.best.weight_kg ?? 0) && (set.reps ?? 0) > (previous.best.reps ?? 0))) {
        previous.best = set
      }
    }
  }
  return [...history.values()]
}

export default function GymTraining() {
  const { user } = useAuth()
  const { showToast } = useData()
  const { selectedDate } = useSettings()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<GymPlan[]>([])
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [editingPlan, setEditingPlan] = useState<{ plan: GymPlan | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextPlans, nextSessions] = await Promise.all([
        gymApi.getGymPlans(), gymApi.getRecentGymSessions(selectedDate),
      ])
      setPlans(nextPlans)
      setSessions(nextSessions)
    } catch {
      showToast('Errore caricamento allenamenti palestra')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, showToast])

  useEffect(() => { void refresh() }, [refresh])

  async function savePlan(name: string, exercises: gymApi.GymPlanExerciseInput[]) {
    if (!user) return
    await gymApi.saveGymPlan(user.id, editingPlan?.plan?.id ?? null, name, exercises)
    setEditingPlan(null)
    await refresh()
    showToast('Scheda salvata')
  }

  async function deletePlan(plan: GymPlan) {
    if (!window.confirm(`Eliminare la scheda “${plan.name}”? Le sessioni passate resteranno nello storico.`)) return
    try {
      await gymApi.deleteGymPlan(plan.id)
      await refresh()
      showToast('Scheda eliminata')
    } catch {
      showToast('Errore eliminazione scheda')
    }
  }

  async function startPlan(plan: GymPlan) {
    if (!user || busy) return
    setBusy(true)
    try {
      const session = await gymApi.startGymSession(user.id, plan.id, selectedDate)
      navigate(`/fitness/session/${session.id}`)
    } catch {
      showToast('Errore avvio allenamento')
    } finally {
      setBusy(false)
    }
  }

  if (editingPlan) return <GymPlanEditor key={editingPlan.plan?.id ?? 'new'} plan={editingPlan.plan}
    onSave={savePlan} onCancel={() => setEditingPlan(null)} />

  const active = sessions.find(session => !session.completed_at)
  const daySessions = sessions.filter(session => session.date === selectedDate && session.completed_at)
  const recentSessions = sessions.filter(session => session.completed_at && session.date !== selectedDate)
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')).slice(0, 10)
  const progress = gymProgress(sessions)

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Palestra</p>
        <h2 className="text-lg font-bold">Le tue schede</h2></div>
      <button type="button" onClick={() => setEditingPlan({ plan: null })}
        className="rounded-xl bg-primary-500 px-3 py-2 text-sm font-semibold">+ Nuova scheda</button>
    </div>
    {active && <button type="button" onClick={() => navigate(`/fitness/session/${active.id}`)}
      className="w-full rounded-2xl border border-primary-600/50 bg-primary-950/30 p-4 text-left">
      <span className="block text-xs font-semibold uppercase text-primary-400">Riprendi allenamento</span>
      <span className="mt-1 block font-semibold">{active.plan_name}</span>
      <span className="text-xs text-gray-400">{active.sets.filter(set => set.done).length}/{active.sets.length} serie completate</span>
    </button>}
    {loading ? <div className="h-28 animate-pulse rounded-2xl bg-gray-800" /> : plans.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-gray-700 p-5 text-sm text-gray-400">
        Crea una scheda e aggiungi gli esercizi che fai in palestra.
      </p>
    ) : <div className="space-y-3">
      {plans.map(plan => <div key={plan.id} className="rounded-2xl border border-gray-700 bg-gray-900/35 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{plan.exercises.length} esercizi · {plan.exercises.map(exercise => exercise.exercise_name).join(', ')}</p></div>
          <button type="button" onClick={() => void deletePlan(plan)} aria-label={`Elimina ${plan.name}`}
            className="text-gray-600 hover:text-red-400">✕</button>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => void startPlan(plan)} disabled={busy || Boolean(active)}
            className="rounded-xl bg-primary-600 py-2.5 text-sm font-semibold disabled:opacity-40">Inizia allenamento</button>
          <button type="button" onClick={() => setEditingPlan({ plan })}
            className="rounded-xl border border-gray-700 px-3 py-2.5 text-sm text-gray-300">Modifica</button>
        </div>
      </div>)}
    </div>}
    {daySessions.length > 0 && <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300">Sessioni del giorno</h3>
      {daySessions.map(session => <button key={session.id} type="button" onClick={() => navigate(`/fitness/session/${session.id}`)}
        className="flex w-full justify-between rounded-xl bg-gray-800/70 px-3 py-3 text-left text-sm">
        <span>{session.plan_name}</span>
        <span className="text-gray-400">{session.sets.filter(set => set.done).length} serie ›</span>
      </button>)}
    </section>}
    {recentSessions.length > 0 && <details className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
      <summary className="cursor-pointer font-semibold">Sessioni recenti</summary>
      <div className="mt-3 space-y-2">
        {recentSessions.map(session => <button key={session.id} type="button" onClick={() => navigate(`/fitness/session/${session.id}`)}
          className="flex w-full justify-between rounded-xl bg-gray-800/70 px-3 py-3 text-left text-sm">
          <span>{session.plan_name} <span className="text-gray-500">· {session.date}</span></span>
          <span className="text-gray-400">{session.sets.filter(set => set.done).length} serie ›</span>
        </button>)}
      </div>
    </details>}
    {progress.length > 0 && <details className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
      <summary className="cursor-pointer font-semibold">Progressi per esercizio</summary>
      <p className="mt-2 text-xs text-gray-500">Dalle ultime 30 sessioni</p>
      <div className="mt-3 space-y-3">
        {progress.map(item => <div key={`${item.name}:${item.equipment}`} className="border-t border-gray-700 pt-3 text-sm">
          <p className="font-medium">{item.name} <span className="text-xs font-normal text-gray-500">· {item.equipment}</span></p>
          <p className="mt-1 text-xs text-gray-400">Ultima: {formatPerformance(item.last)} · Migliore: {formatPerformance(item.best)}</p>
        </div>)}
      </div>
    </details>}
  </div>
}
