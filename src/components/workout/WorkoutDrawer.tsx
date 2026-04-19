import { useState } from 'react'
import { MET_ACTIVITIES, calculateCaloriesBurned } from '../../utils/met'
import Modal from '../common/Modal'

interface Props {
  activityKey: string | null
  weightKg: number
  onSave: (activityKey: string, durationMin: number, caloriesBurned: number) => void
  onClose: () => void
}

export default function WorkoutDrawer({ activityKey, weightKg, onSave, onClose }: Props) {
  const [duration, setDuration] = useState(30)

  if (!activityKey) return null
  const activity = MET_ACTIVITIES[activityKey]
  if (!activity) return null

  const calories = calculateCaloriesBurned(activityKey, duration, weightKg)

  return (
    <Modal open onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          <span aria-hidden="true">{activity.icon}</span> {activity.label}
        </h2>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Durata (minuti)</label>
          <input
            type="number"
            min={1}
            max={300}
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 outline-none focus:border-primary-500 text-lg"
          />
        </div>
        <div className="bg-gray-700 rounded-lg px-4 py-3 flex justify-between items-center">
          <span className="text-gray-400 text-sm">Calorie bruciate</span>
          <span className="text-2xl font-bold text-orange-400">{calories} kcal</span>
        </div>
        <button
          type="button"
          onClick={() => onSave(activityKey, duration, calories)}
          className="w-full py-4 bg-primary-600 rounded-xl font-semibold text-lg"
        >
          Salva workout
        </button>
      </div>
    </Modal>
  )
}
