import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { useSettings } from '../../contexts/SettingsContext'
import { useNavigate } from 'react-router-dom'
import * as gymApi from '../../services/gymApi'
import { getLatestWeightLog, getWeightLogs } from '../../services/api'
import type { GymPlan, GymSession, WeightLog } from '../../types'
import GymSessionCard from './GymSessionCard'
import GymPlanEditor from './GymPlanEditor'
import type { GymExerciseDefinition } from '../../data/gymExercises'

export default function GymTraining() {
  const { user } = useAuth()
  const { showToast, currentWeightKg } = useData()
  const { selectedDate } = useSettings()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<GymPlan[]>([])
  const [customExercises, setCustomExercises] = useState<GymExerciseDefinition[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const [sessions, setSessions] = useState<GymSession[]>([])
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [editingPlan, setEditingPlan] = useState<{ plan: GymPlan | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [ordering, setOrdering] = useState(false)
  const orderInProgress = useRef(false)
  const orderRevision = useRef(0)

  async function movePlan(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (orderInProgress.current || busy || nextIndex < 0 || nextIndex >= plans.length) return
    const previous = plans
    const reordered = [...plans]
    const moved = reordered.splice(index, 1)[0]
    reordered.splice(nextIndex, 0, moved)
    const next = reordered.map((plan, position) => ({ ...plan, position }))
    orderInProgress.current = true
    orderRevision.current += 1
    setOrdering(true)
    setPlans(next)
    try { await gymApi.reorderGymPlans(next.map(plan => plan.id)) }
    catch { setPlans(previous); showToast('Errore salvataggio ordine delle schede. Riprova.') }
    finally { orderRevision.current += 1; orderInProgress.current = false; setOrdering(false) }
  }

  const refresh = useCallback(async () => {
    const revision = orderRevision.current
    setLoading(true)
    try {
      const [nextPlans, nextSessions] = await Promise.all([
        gymApi.getGymPlans(), gymApi.getGymTrainingSessions(selectedDate),
      ])
      if (revision === orderRevision.current && !orderInProgress.current) setPlans(nextPlans)
      setSessions(nextSessions)
      const completedDates = nextSessions.filter(session => session.completed_at).map(session => session.date).sort()
      if (completedDates.length > 0) {
        try {
          const [earlier, withinRange] = await Promise.all([
            getLatestWeightLog(completedDates[0]),
            getWeightLogs(completedDates[0], completedDates[completedDates.length - 1]),
          ])
          setWeightLogs(earlier ? [earlier, ...withinRange] : withinRange)
        } catch {
          setWeightLogs([])
        }
      } else {
        setWeightLogs([])
      }
    } catch {
      showToast('Errore caricamento allenamenti palestra')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, showToast])

  useEffect(() => { void refresh() }, [refresh])

  const refreshCatalog = useCallback(async () => {
    try {
      setCustomExercises(await gymApi.getCustomGymExercises())
      setCatalogError(false)
    } catch {
      setCatalogError(true)
    }
  }, [])
  useEffect(() => { void refreshCatalog() }, [refreshCatalog])

  async function savePlan(name: string, exercises: gymApi.GymPlanExerciseInput[]) {
    if (!user) return
    await gymApi.saveGymPlan(user.id, editingPlan?.plan?.id ?? null, name, exercises)
    setEditingPlan(null)
    await refresh()
    await refreshCatalog()
    showToast('Scheda salvata')
  }

  async function deletePlan(plan: GymPlan) {
    if (busy || orderInProgress.current) return
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
    if (!user || busy || orderInProgress.current) return
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
    customExercises={customExercises} catalogError={catalogError} onRetryCatalog={() => void refreshCatalog()}
    onSave={savePlan} onCancel={() => setEditingPlan(null)} />

  const active = sessions.find(session => !session.completed_at)
  const daySessions = sessions.filter(session => session.date === selectedDate && session.completed_at)
    .sort((a, b) => b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id))

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Palestra</p>
        <h2 className="text-lg font-bold">Le tue schede</h2></div>
      <button type="button" disabled={ordering || busy} onClick={() => setEditingPlan({ plan: null })}
        className="rounded-xl bg-primary-500 px-3 py-2 text-sm font-semibold disabled:opacity-40">+ Nuova scheda</button>
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
    ) : <div className="desktop-plan-list space-y-3">
      {ordering && <p style={{ gridColumn: '1 / -1' }} role="status" className="text-xs text-gray-500">Salvo l’ordine…</p>}
      {plans.map((plan, index) => <div key={plan.id} className="rounded-2xl border border-gray-700 bg-gray-900/35 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1"><h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-1 text-xs text-gray-500">{plan.exercises.length} esercizi · {plan.exercises.map(exercise => exercise.exercise_name).join(', ')}</p></div>
          <div className="flex shrink-0 items-center gap-1">
            {plans.length > 1 && <>
              <button type="button" onClick={() => void movePlan(index, -1)} disabled={index === 0 || ordering || busy}
                aria-label={`Sposta su ${plan.name}`} title="Sposta su"
                className="h-9 w-9 rounded-lg border border-gray-700 text-gray-300 disabled:opacity-30">↑</button>
              <button type="button" onClick={() => void movePlan(index, 1)} disabled={index === plans.length - 1 || ordering || busy}
                aria-label={`Sposta giù ${plan.name}`} title="Sposta giù"
                className="h-9 w-9 rounded-lg border border-gray-700 text-gray-300 disabled:opacity-30">↓</button>
            </>}
            <button type="button" onClick={() => void deletePlan(plan)} disabled={ordering || busy} aria-label={`Elimina ${plan.name}`}
              className="h-9 w-9 text-gray-600 hover:text-red-400 disabled:opacity-30">✕</button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => void startPlan(plan)} disabled={busy || ordering || Boolean(active)}
            className="rounded-xl bg-primary-600 py-2.5 text-sm font-semibold disabled:opacity-40">Inizia allenamento</button>
          <button type="button" disabled={ordering || busy} onClick={() => setEditingPlan({ plan })}
            className="rounded-xl border border-gray-700 px-3 py-2.5 text-sm text-gray-300 disabled:opacity-40">Modifica</button>
        </div>
      </div>)}
    </div>}
    {daySessions.length > 0 && <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300">Sessioni del giorno</h3>
      {daySessions.map(session => <GymSessionCard key={session.id} session={session}
        weightLogs={weightLogs} fallbackWeightKg={currentWeightKg}
        onOpen={() => navigate(`/fitness/session/${session.id}`)} />)}
    </section>}
  </div>
}
