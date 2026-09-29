import { useState } from 'react'
import { searchGymExercises, type GymExerciseDefinition } from '../../data/gymExercises'
import type { GymPlan } from '../../types'
import type { GymPlanExerciseInput } from '../../services/gymApi'

export default function GymPlanEditor({ plan, onSave, onCancel }: {
  plan: GymPlan | null
  onSave: (name: string, exercises: GymPlanExerciseInput[]) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(plan?.name ?? '')
  const [exercises, setExercises] = useState<GymPlanExerciseInput[]>(plan?.exercises.map(exercise => ({
    exercise_key: exercise.exercise_key,
    exercise_name: exercise.exercise_name,
    equipment: exercise.equipment,
    target_sets: exercise.target_sets,
    target_reps: exercise.target_reps,
  })) ?? [])
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const results = searchGymExercises(query).slice(0, 12)

  function addExercise(exercise: GymExerciseDefinition | null) {
    setExercises(current => [...current, {
      exercise_key: exercise?.key ?? null,
      exercise_name: exercise?.name ?? query.trim(),
      equipment: exercise?.equipment ?? 'Personalizzato',
      target_sets: 3,
      target_reps: 10,
    }])
    setSearchOpen(false)
    setQuery('')
  }

  function updateExercise(index: number, change: Partial<GymPlanExerciseInput>) {
    setExercises(current => current.map((exercise, i) => i === index ? { ...exercise, ...change } : exercise))
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const next = [...exercises]
    const other = index + direction
    if (other < 0 || other >= next.length) return
    const moved = next[index]
    next[index] = next[other]
    next[other] = moved
    setExercises(next)
  }

  async function save() {
    if (saving || !name.trim() || exercises.length === 0 || exercises.some(exercise =>
      !exercise.exercise_name.trim() || !exercise.equipment.trim()
      || !Number.isInteger(exercise.target_sets) || exercise.target_sets < 1 || exercise.target_sets > 20
      || !Number.isInteger(exercise.target_reps) || exercise.target_reps < 1 || exercise.target_reps > 100)) return
    setSaving(true)
    setError(false)
    try {
      await onSave(name.trim(), exercises)
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Scheda palestra</p>
      <h2 className="mt-1 text-xl font-bold">{plan ? 'Modifica scheda' : 'Nuova scheda'}</h2>
    </div>
    <label className="block text-sm text-gray-400">Nome della scheda
      <input value={name} onChange={event => setName(event.target.value)} placeholder="Es. Scheda A · Petto e tricipiti"
        className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-3 text-white outline-none focus:border-primary-500" />
    </label>
    <div className="space-y-3">
      {exercises.map((exercise, index) => <div key={`${exercise.exercise_key ?? exercise.exercise_name}-${index}`}
        className="rounded-2xl border border-gray-700 bg-gray-900/40 p-3">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1"><span className="block font-semibold">{exercise.exercise_name}</span>
            <span className="text-xs text-gray-500">{exercise.equipment}</span></span>
          <button type="button" onClick={() => moveExercise(index, -1)} disabled={index === 0}
            aria-label={`Sposta su ${exercise.exercise_name}`} className="px-1 text-gray-400 disabled:opacity-30">↑</button>
          <button type="button" onClick={() => moveExercise(index, 1)} disabled={index === exercises.length - 1}
            aria-label={`Sposta giù ${exercise.exercise_name}`} className="px-1 text-gray-400 disabled:opacity-30">↓</button>
          <button type="button" onClick={() => setExercises(current => current.filter((_, i) => i !== index))}
            aria-label={`Rimuovi ${exercise.exercise_name}`} className="px-1 text-red-400">✕</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-400">Serie
            <input type="number" min={1} max={20} value={exercise.target_sets}
              onChange={event => updateExercise(index, { target_sets: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-white" />
          </label>
          <label className="text-xs text-gray-400">Ripetizioni
            <input type="number" min={1} max={100} value={exercise.target_reps}
              onChange={event => updateExercise(index, { target_reps: Number(event.target.value) })}
              className="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-white" />
          </label>
        </div>
        {exercise.exercise_key === null && <label className="mt-3 block text-xs text-gray-400">Attrezzo
          <input value={exercise.equipment} onChange={event => updateExercise(index, { equipment: event.target.value })}
            className="mt-1 w-full rounded-lg bg-gray-800 px-3 py-2 text-white" />
        </label>}
      </div>)}
    </div>
    {searchOpen ? <div className="space-y-2 rounded-2xl border border-gray-700 bg-gray-900/40 p-3">
      <input value={query} onChange={event => setQuery(event.target.value)} autoFocus
        placeholder="Cerca esercizio o attrezzo..." aria-label="Cerca esercizio o attrezzo"
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 outline-none focus:border-primary-500" />
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {results.map(exercise => <button key={exercise.key} type="button" onClick={() => addExercise(exercise)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-gray-800">
          <span className="text-sm">{exercise.name}</span>
          <span className="ml-2 text-xs text-gray-500">{exercise.equipment} · {exercise.muscle}</span>
        </button>)}
      </div>
      {query.trim() && <button type="button" onClick={() => addExercise(null)}
        className="w-full rounded-xl border border-dashed border-gray-600 px-3 py-2 text-left text-sm text-primary-300">
        + Aggiungi “{query.trim()}” come esercizio personalizzato
      </button>}
      <button type="button" onClick={() => setSearchOpen(false)} className="w-full py-2 text-sm text-gray-400">Chiudi ricerca</button>
    </div> : <button type="button" onClick={() => setSearchOpen(true)}
      className="w-full rounded-xl border border-dashed border-primary-700 px-3 py-3 text-sm text-primary-300">
      + Aggiungi esercizio
    </button>}
    {error && <p className="text-sm text-red-400">Impossibile salvare la scheda. Riprova.</p>}
    <button type="button" onClick={() => void save()} disabled={saving || !name.trim() || exercises.length === 0}
      className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">
      {saving ? 'Salvataggio…' : 'Salva scheda'}
    </button>
    <button type="button" onClick={onCancel} className="w-full text-sm text-gray-400">Annulla</button>
  </div>
}
