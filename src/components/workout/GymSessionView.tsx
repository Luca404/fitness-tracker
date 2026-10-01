import { useEffect, useState } from 'react'
import { useData } from '../../contexts/DataContext'
import * as gymApi from '../../services/gymApi'
import type { GymSession, GymSet } from '../../types'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

const REST_DURATION_KEY = 'gym-rest-duration'

interface RestTimer {
  setId: string
  exerciseName: string
  setNumber: number
  endsAt: number
}

function restTimerKey(sessionId: string) {
  return `gym-rest-${sessionId}`
}

function storeRestTimer(sessionId: string, timer: RestTimer | null) {
  try {
    if (timer) localStorage.setItem(restTimerKey(sessionId), JSON.stringify(timer))
    else localStorage.removeItem(restTimerKey(sessionId))
  } catch {
    // The countdown still works while this page is open if storage is unavailable.
  }
}

function readRestTimer(session: GymSession): RestTimer | null {
  if (session.completed_at) return null
  try {
    const stored = localStorage.getItem(restTimerKey(session.id))
    if (!stored) return null
    const timer = JSON.parse(stored) as RestTimer
    return session.sets.some(set => set.id === timer.setId && set.done) && Number.isFinite(timer.endsAt)
      ? timer : null
  } catch {
    return null
  }
}

function readRestDuration(): number {
  try {
    const stored = Number(localStorage.getItem(REST_DURATION_KEY))
    return [60, 90, 120, 180].includes(stored) ? stored : 90
  } catch {
    return 90
  }
}

function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

interface SetDraft {
  weight: string
  reps: string
}

function GymSetRow({ set, draft, onDraftChange, onSaved, onDeleted, canDelete }: {
  set: GymSet
  draft?: SetDraft
  onDraftChange: (draft: SetDraft) => void
  onSaved: (set: GymSet, justCompleted: boolean) => void
  onDeleted: (id: string) => void
  canDelete: boolean
}) {
  const { showToast } = useData()
  const [weight, setWeight] = useState(draft?.weight ?? (set.weight_kg == null ? '' : formatDecimal(set.weight_kg)))
  const [reps, setReps] = useState(draft?.reps ?? (set.reps ?? set.target_reps ?? '').toString())
  const [saving, setSaving] = useState(false)
  const valid = reps.trim() !== '' && Number.isInteger(Number(reps)) && Number(reps) > 0
    && Number(reps) <= 100 && (weight.trim() === '' || (Number.isFinite(Number(weight)) && Number(weight) >= 0))

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    try {
      const updated = await gymApi.saveGymSet(set.id, weight.trim() === '' ? null : roundToTwo(Number(weight)), Number(reps))
      onSaved(updated, !set.done && updated.done)
    } catch {
      showToast('Errore salvataggio serie')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (saving) return
    setSaving(true)
    try {
      await gymApi.deleteGymSet(set.id)
      onDeleted(set.id)
    } catch {
      showToast('Errore eliminazione serie')
      setSaving(false)
    }
  }

  return <div className={`rounded-xl p-3 ${set.done ? 'bg-primary-950/30 ring-1 ring-primary-800/40' : 'bg-gray-800/70'}`}>
    <div className="mb-2 flex items-center justify-between text-xs">
      <span className="font-semibold text-gray-300">Serie {set.set_number} · obiettivo {
        set.target_reps === null ? 'libero' : `${set.target_reps}${set.target_reps_max && set.target_reps_max !== set.target_reps ? `–${set.target_reps_max}` : ''} rip.${set.per_side ? ' per lato' : ''}`
      }</span>
      {set.done && <span className="text-primary-400">✓ Completata</span>}
    </div>
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
      <label className="text-xs text-gray-400">Peso (kg)
        <input type="number" min={0} step="0.01" inputMode="decimal" value={weight}
          onChange={event => {
            setWeight(event.target.value)
            onDraftChange({ weight: event.target.value, reps })
          }} onBlur={() => {
            const value = Number(weight)
            if (weight.trim() !== '' && Number.isFinite(value)) {
              setWeight(formatDecimal(value))
              onDraftChange({ weight: formatDecimal(value), reps })
            }
          }} placeholder="Corpo libero"
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-white" />
      </label>
      <label className="text-xs text-gray-400">{set.per_side ? 'Ripetizioni per lato' : 'Ripetizioni'}
        <input type="number" min={1} max={100} step={1} inputMode="numeric" value={reps}
          onChange={event => {
            setReps(event.target.value)
            onDraftChange({ weight, reps: event.target.value })
          }}
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-white" />
      </label>
      <button type="button" onClick={() => void save()} disabled={!valid || saving}
        className="self-end rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">
        {set.done ? 'Salva' : 'Fatto'}
      </button>
    </div>
    {canDelete && <button type="button" onClick={() => void remove()} disabled={saving}
      className="mt-2 text-xs text-gray-500 hover:text-red-400">Rimuovi serie</button>}
  </div>
}

export default function GymSessionView({ session, onBack, onCompleted, onDeleted }: {
  session: GymSession
  onBack: () => void
  onCompleted: () => Promise<void>
  onDeleted: () => Promise<void>
}) {
  const { showToast } = useData()
  const [busy, setBusy] = useState(false)
  const [sets, setSets] = useState(session.sets)
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const groups = [...new Set(sets.map(set => set.exercise_position))].sort((a, b) => a - b)
    .map(position => sets.filter(set => set.exercise_position === position).sort((a, b) => a.set_number - b.set_number))
  const [activeIndex, setActiveIndex] = useState(() => {
    const firstPending = groups.findIndex(group => group.some(set => !set.done))
    return firstPending === -1 ? 0 : firstPending
  })
  const [restDuration, setRestDuration] = useState(readRestDuration)
  const [restTimer, setRestTimer] = useState(() => readRestTimer(session))
  const [now, setNow] = useState(Date.now)
  const completed = sets.filter(set => set.done).length
  const activeGroup = groups[Math.min(activeIndex, groups.length - 1)]
  const remaining = restTimer ? Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000)) : 0

  useEffect(() => {
    if (!restTimer) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [restTimer])

  function startRest(set: GymSet) {
    const timer = {
      setId: set.id,
      exerciseName: set.exercise_name,
      setNumber: set.set_number,
      endsAt: Date.now() + restDuration * 1000,
    }
    setNow(Date.now())
    setRestTimer(timer)
    storeRestTimer(session.id, timer)
  }

  function clearRest() {
    setRestTimer(null)
    storeRestTimer(session.id, null)
  }

  function changeRestDuration(seconds: number) {
    setRestDuration(seconds)
    try { localStorage.setItem(REST_DURATION_KEY, String(seconds)) } catch { /* Keep the choice for this visit. */ }
  }

  function updateSet(updated: GymSet, justCompleted: boolean) {
    setSets(current => current.map(set => set.id === updated.id ? updated : set))
    if (justCompleted && !session.completed_at) startRest(updated)
  }

  async function addSet(group: GymSet[]) {
    const last = group[group.length - 1]
    setBusy(true)
    try {
      const added = await gymApi.addGymSet({
        session_id: session.id,
        exercise_position: last.exercise_position,
        exercise_key: last.exercise_key,
        exercise_name: last.exercise_name,
        equipment: last.equipment,
        set_number: last.set_number + 1,
        target_reps: last.target_reps,
        target_reps_max: last.target_reps_max,
        per_side: last.per_side,
        weight_kg: last.weight_kg,
        reps: last.reps ?? last.target_reps,
        done: false,
      })
      setSets(current => [...current, added])
    } catch {
      showToast('Errore aggiunta serie')
    } finally {
      setBusy(false)
    }
  }

  async function complete() {
    if (busy) return
    if (completed < sets.length && !window.confirm(`Terminare l’allenamento con ${sets.length - completed} serie non completate?`)) return
    setBusy(true)
    try {
      await gymApi.completeGymSession(session.id)
      clearRest()
      await onCompleted()
    } catch {
      showToast('Errore chiusura allenamento')
    } finally {
      setBusy(false)
    }
  }

  async function removeSession() {
    if (busy || !window.confirm(`Eliminare la sessione “${session.plan_name}”?`)) return
    setBusy(true)
    try {
      await gymApi.deleteGymSession(session.id)
      clearRest()
      await onDeleted()
    } catch {
      showToast('Errore eliminazione allenamento')
    } finally {
      setBusy(false)
    }
  }

  return <div className="space-y-5">
    <button type="button" onClick={onBack} className="text-sm text-gray-400">← Allenamenti</button>
    <div className="rounded-2xl bg-primary-950/20 p-4 ring-1 ring-primary-800/30">
      <p className="text-xs uppercase tracking-wide text-primary-400">{session.completed_at ? 'Allenamento completato' : 'Allenamento in corso'}</p>
      <h2 className="mt-1 text-xl font-bold">{session.plan_name}</h2>
      <p className="mt-1 text-sm text-gray-400">{completed}/{sets.length} serie completate</p>
    </div>
    {activeGroup && <>
      <nav aria-label="Navigazione esercizi" className="flex items-center gap-3">
        <button type="button" onClick={() => setActiveIndex(index => index - 1)} disabled={activeIndex === 0}
          aria-label="Esercizio precedente" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-primary-300 shadow-sm transition hover:border-primary-500 hover:bg-gray-700 disabled:opacity-30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Esercizio {activeIndex + 1} di {groups.length}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-700" role="progressbar" aria-label="Avanzamento esercizi" aria-valuenow={activeIndex + 1} aria-valuemin={1} aria-valuemax={groups.length}>
            <div className="h-full rounded-full bg-primary-500" style={{ width: `${(activeIndex + 1) / groups.length * 100}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => setActiveIndex(index => index + 1)} disabled={activeIndex === groups.length - 1}
          aria-label="Esercizio successivo" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-700 bg-gray-800 text-primary-300 shadow-sm transition hover:border-primary-500 hover:bg-gray-700 disabled:opacity-30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true"><path d="m10 5 7 7-7 7" /></svg>
        </button>
      </nav>
      <section className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/35 p-3 sm:p-4" aria-label={activeGroup[0].exercise_name}>
        <div className="px-1">
          <h3 className="text-lg font-semibold">{activeGroup[0].exercise_name}</h3>
          <p className="text-xs text-gray-400">{activeGroup[0].equipment}{activeGroup[0].equipment === 'Manubri' ? ' · peso per manubrio' : ''} · {activeGroup.filter(set => set.done).length}/{activeGroup.length} serie</p>
        </div>
        {activeGroup.map(set => <GymSetRow key={set.id} set={set} draft={drafts[set.id]}
          onDraftChange={draft => setDrafts(current => ({ ...current, [set.id]: draft }))}
          onSaved={updateSet}
          onDeleted={id => {
            setSets(current => current.filter(item => item.id !== id))
            if (restTimer?.setId === id) clearRest()
          }}
          canDelete={!session.completed_at && activeGroup.length > 1} />)}
        {!session.completed_at && <button type="button" onClick={() => void addSet(activeGroup)} disabled={busy}
          className="w-full rounded-xl border border-dashed border-gray-600 py-2 text-sm text-gray-300 disabled:opacity-40">+ Serie</button>}
      </section>
    </>}
    {!session.completed_at && <section aria-label="Riposo" className="rounded-2xl border border-primary-800/50 bg-primary-950/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400">Riposo dopo ogni serie</p>
          {restTimer ? <p className="mt-1 text-xs text-gray-400">Dopo la serie {restTimer.setNumber} · {restTimer.exerciseName}</p>
            : <p className="mt-1 text-xs text-gray-400">Parte quando segni una serie come fatta, anche dopo l’ultima.</p>}
        </div>
        <span role="timer" className="font-mono text-3xl font-bold tabular-nums text-white">{restTimer ? formatTime(remaining) : formatTime(restDuration)}</span>
      </div>
      {restTimer && <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`text-sm font-medium ${remaining === 0 ? 'text-primary-300' : 'text-gray-300'}`}>{remaining === 0 ? 'Riposo terminato' : 'Recupero in corso'}</span>
        <button type="button" onClick={clearRest} className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200">Chiudi timer</button>
      </div>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-gray-400">{restTimer ? 'Prossime serie' : 'Durata'}</span>
        {[60, 90, 120, 180].map(seconds => <button key={seconds} type="button" onClick={() => changeRestDuration(seconds)}
          aria-pressed={restDuration === seconds}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${restDuration === seconds ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
          {formatTime(seconds)}
        </button>)}
      </div>
    </section>}
    <div className="space-y-2 border-t border-gray-700 pt-4">
      {!session.completed_at && <button type="button" onClick={() => void complete()} disabled={busy}
        className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">Termina allenamento</button>}
      <button type="button" onClick={() => void removeSession()} disabled={busy}
        className="w-full rounded-xl border border-red-900/60 py-2.5 text-sm text-red-400 disabled:opacity-40">Elimina sessione</button>
    </div>
  </div>
}
