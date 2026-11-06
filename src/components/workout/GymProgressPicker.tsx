import { GYM_MUSCLE_GROUPS, type GymMuscleGroup } from '../../data/gymExercises'
import { exerciseDescription, type ExerciseProgress } from '../../utils/gymProgress'

export type ProgressMuscleFilter = GymMuscleGroup | 'Tutti'

export default function GymProgressPicker({ exercises, filtered, selectedKey, group, query, onGroupChange, onQueryChange, onSelect }: {
  exercises: ExerciseProgress[]
  filtered: ExerciseProgress[]
  selectedKey?: string
  group: ProgressMuscleFilter
  query: string
  onGroupChange: (group: ProgressMuscleFilter) => void
  onQueryChange: (query: string) => void
  onSelect: (key: string) => void
}) {
  const groups: ProgressMuscleFilter[] = ['Tutti', ...GYM_MUSCLE_GROUPS]
  if (exercises.some(exercise => exercise.muscle === 'Altro')) groups.push('Altro')

  return <div className="space-y-3">
    <div role="group" aria-label="Gruppo muscolare" className="grid grid-cols-3 gap-2 min-[360px]:grid-cols-4 lg:flex lg:flex-wrap">
      {groups.map(muscle => {
        const count = muscle === 'Tutti' ? exercises.length : exercises.filter(exercise => exercise.muscle === muscle).length
        return <button key={muscle} type="button" aria-pressed={group === muscle} disabled={count === 0}
          onClick={() => onGroupChange(muscle)}
          className={`flex min-h-12 min-w-0 items-center justify-center rounded-xl border px-1.5 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:opacity-35 lg:flex-auto lg:px-4 ${group === muscle ? 'border-primary-500 bg-primary-500/15 text-primary-300' : 'border-gray-700 bg-gray-900/40 text-gray-300 enabled:hover:border-gray-500'}`}>
          {muscle}<span className="sr-only"> · {count} {count === 1 ? 'esercizio' : 'esercizi'}</span>
        </button>
      })}
    </div>
    <label className="relative block">
      <span className="sr-only">Cerca esercizio nei progressi</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-500"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
      <input type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Cerca esercizio o attrezzo"
        className="min-h-12 w-full rounded-xl border border-gray-700 bg-gray-900/50 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-gray-500 focus:border-primary-400" />
    </label>
    {filtered.length > 0 ? <div role="group" aria-label="Esercizio" className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto overscroll-contain p-1 lg:grid-cols-2">
      {filtered.map(exercise => {
        const active = exercise.key === selectedKey
        return <button key={exercise.key} type="button" aria-pressed={active} aria-label={`${exercise.name} · ${exerciseDescription(exercise)}`} onClick={() => onSelect(exercise.key)}
          className={`flex min-h-16 min-w-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${active ? 'border-primary-500/70 bg-primary-500/10' : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'}`}>
          <span className="min-w-0 flex-1">
            <span className={`block text-sm font-semibold ${active ? 'text-primary-300' : 'text-gray-100'}`}>{exercise.name}</span>
            <span className="mt-1 block text-xs text-gray-400">{exerciseDescription(exercise)}</span>
          </span>
          <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? 'border-primary-400 bg-primary-500 text-gray-950' : 'border-gray-600'}`}>
            {active && <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 8 3 3 7-7" /></svg>}
          </span>
        </button>
      })}
    </div> : <div className="rounded-xl border border-dashed border-gray-700 p-4 text-center text-sm text-gray-400">
      <p>Nessun esercizio trovato.</p>
      <button type="button" onClick={() => { onGroupChange('Tutti'); onQueryChange('') }} className="mt-2 min-h-12 rounded-lg px-3 font-medium text-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">Mostra tutti</button>
    </div>}
  </div>
}
