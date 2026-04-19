import type { Workout } from '../../types'
import { MET_ACTIVITIES } from '../../utils/met'

interface Props {
  workout: Workout
  onDelete: () => void
}

export default function WorkoutRow({ workout, onDelete }: Props) {
  const activity = MET_ACTIVITIES[workout.activity]
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{activity?.icon ?? '🏃'}</span>
        <div>
          <p className="font-medium text-sm">{activity?.label ?? workout.activity}</p>
          <p className="text-xs text-gray-500">{workout.duration_min} min</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-orange-400 font-medium text-sm">{Math.round(workout.calories_burned)} kcal</span>
        <button type="button" onClick={onDelete} className="text-gray-600 hover:text-red-400 text-lg" aria-label="Elimina workout">✕</button>
      </div>
    </div>
  )
}
