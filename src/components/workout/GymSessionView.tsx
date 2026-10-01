import { useState } from 'react'
import { useData } from '../../contexts/DataContext'
import * as gymApi from '../../services/gymApi'
import type { GymSession, GymSet } from '../../types'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

function GymSetRow({ set, onSaved, onDeleted, canDelete }: {
  set: GymSet
  onSaved: (set: GymSet) => void
  onDeleted: (id: string) => void
  canDelete: boolean
}) {
  const { showToast } = useData()
  const [weight, setWeight] = useState(set.weight_kg == null ? '' : formatDecimal(set.weight_kg))
  const [reps, setReps] = useState((set.reps ?? set.target_reps ?? '').toString())
  const [saving, setSaving] = useState(false)
  const valid = reps.trim() !== '' && Number.isInteger(Number(reps)) && Number(reps) > 0
    && Number(reps) <= 100 && (weight.trim() === '' || (Number.isFinite(Number(weight)) && Number(weight) >= 0))

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    try {
      onSaved(await gymApi.saveGymSet(set.id, weight.trim() === '' ? null : roundToTwo(Number(weight)), Number(reps)))
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
          onChange={event => setWeight(event.target.value)} onBlur={() => {
            const value = Number(weight)
            if (weight.trim() !== '' && Number.isFinite(value)) setWeight(formatDecimal(value))
          }} placeholder="Corpo libero"
          className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-2 text-white" />
      </label>
      <label className="text-xs text-gray-400">{set.per_side ? 'Ripetizioni per lato' : 'Ripetizioni'}
        <input type="number" min={1} max={100} step={1} inputMode="numeric" value={reps}
          onChange={event => setReps(event.target.value)}
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
  const groups = [...new Set(sets.map(set => set.exercise_position))].sort((a, b) => a - b)
    .map(position => sets.filter(set => set.exercise_position === position))
  const completed = sets.filter(set => set.done).length

  function updateSet(updated: GymSet) {
    setSets(current => current.map(set => set.id === updated.id ? updated : set))
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
    if (busy || completed === 0) return
    setBusy(true)
    try {
      await gymApi.completeGymSession(session.id)
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
      <p className="mt-1 text-sm text-gray-400">{session.date} · {completed}/{sets.length} serie completate</p>
    </div>
    {groups.map(group => <section key={group[0].exercise_position} className="space-y-2">
      <div className="px-1">
        <h3 className="font-semibold">{group[0].exercise_name}</h3>
        <p className="text-xs text-gray-500">{group[0].equipment}{group[0].equipment === 'Manubri' ? ' · peso per manubrio' : ''}</p>
      </div>
      {group.map(set => <GymSetRow key={set.id} set={set} onSaved={updateSet}
        onDeleted={id => setSets(current => current.filter(item => item.id !== id))}
        canDelete={!session.completed_at && group.length > 1} />)}
      {!session.completed_at && <button type="button" onClick={() => void addSet(group)} disabled={busy}
        className="w-full rounded-xl border border-dashed border-gray-700 py-2 text-sm text-gray-400 disabled:opacity-40">+ Serie</button>}
    </section>)}
    {!session.completed_at && <button type="button" onClick={() => void complete()} disabled={busy || completed === 0}
      className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">Termina allenamento</button>}
    <button type="button" onClick={() => void removeSession()} disabled={busy}
      className="w-full py-2 text-sm text-red-400 disabled:opacity-40">Elimina sessione</button>
  </div>
}
