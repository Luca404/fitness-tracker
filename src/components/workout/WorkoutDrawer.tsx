import { useRef, useState } from 'react'
import { MET_ACTIVITIES, calculateCaloriesBurned, supportsWorkoutDistance, workoutDistanceError } from '../../utils/met'
import Modal from '../common/Modal'
import { formatDecimal } from '../../utils/decimal'

interface Props {
  activityKey: string | null
  weightKg: number
  onSave: (activityKey: string, durationMin: number, caloriesBurned: number, distanceKm: number | null) => void | Promise<void>
  onClose: () => void
}

export default function WorkoutDrawer({ activityKey, weightKg, onSave, onClose }: Props) {
  if (!activityKey || !MET_ACTIVITIES[activityKey]) return null
  return <WorkoutForm key={activityKey} activityKey={activityKey} weightKg={weightKg} onSave={onSave} onClose={onClose} />
}

function WorkoutForm({ activityKey, weightKg, onSave, onClose }: Props & { activityKey: string }) {
  const [durationText, setDuration] = useState('30')
  const [distanceText, setDistance] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const saveLock = useRef(false)
  const activity = MET_ACTIVITIES[activityKey]
  const duration = Number(durationText)
  const distanceKm = supportsWorkoutDistance(activityKey) && distanceText.trim() !== '' ? Number(distanceText) : null
  const distanceError = workoutDistanceError(activityKey, duration, distanceKm)
  const valid = Number.isInteger(duration) && duration >= 1 && duration <= 300
    && Number.isFinite(weightKg) && weightKg > 0 && !distanceError
  const calories = valid ? calculateCaloriesBurned(activityKey, duration, weightKg, distanceKm) : 0

  async function save() {
    if (!valid || saveLock.current) return
    saveLock.current = true
    setSaving(true)
    setSaveError(false)
    try { await onSave(activityKey, duration, calories, distanceKm) }
    catch { setSaveError(true) }
    finally { saveLock.current = false; setSaving(false) }
  }

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <span aria-hidden="true">{activity.icon}</span> {activity.label}
        </h2>
        <div>
          <label htmlFor="workout-duration" className="text-sm text-gray-400 mb-1 block">Durata (minuti)</label>
          <input
            id="workout-duration"
            type="number"
            min={1}
            max={300}
            step={1}
            value={durationText}
            disabled={saving}
            onChange={e => setDuration(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500 text-lg"
          />
        </div>
        {supportsWorkoutDistance(activityKey) && <div>
          <label htmlFor="workout-distance" className="mb-1 block text-sm text-gray-400">Distanza (km, facoltativa)</label>
          <input id="workout-distance" type="number" min="0.01" max="1000" step="any" inputMode="decimal"
            value={distanceText} disabled={saving} onChange={event => setDistance(event.target.value)} placeholder="Es. 3.5"
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-lg outline-none focus:border-primary-500" />
          {valid && distanceKm != null && <p className="mt-2 text-xs text-gray-400">Velocità media: {formatDecimal(distanceKm * 60 / duration)} km/h</p>}
          <p className="mt-1 text-xs text-gray-500">Con i km, la stima considera anche la velocità media su percorso pianeggiante.</p>
          {distanceError && <p role="alert" className="mt-2 text-xs text-amber-300">{distanceError}</p>}
        </div>}
        <div className="bg-gray-700 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Calorie bruciate</span>
          <span className="text-2xl font-bold text-orange-400">{calories} kcal</span>
        </div>
        {saveError && <p role="alert" className="text-sm text-red-300">Salvataggio non riuscito. Riprova.</p>}
        <button
          type="button"
          onClick={() => void save()}
          disabled={!valid || saving}
          className="w-full py-4 bg-primary-600 rounded-xl font-semibold text-lg"
        >
          {saving ? 'Salvataggio…' : 'Salva workout'}
        </button>
      </div>
    </Modal>
  )
}
