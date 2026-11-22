import { useNumberFormat } from '../../hooks/useNumberFormat'
import type { Workout } from '../../types'
import { MET_ACTIVITIES } from '../../utils/met'

interface Props {
  workout: Workout
  onDelete: () => void
}

export default function WorkoutRow({ workout, onDelete }: Props) {
  const { formatDecimal } = useNumberFormat()
  const activity = MET_ACTIVITIES[workout.activity]
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-800">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{activity?.icon ?? '🏃'}</span>
        <div>
          <p className="font-medium text-sm">{activity?.label ?? workout.activity}</p>
          <p className="text-xs text-gray-400">
            {formatDecimal(workout.duration_min)} min
            {workout.distance_km != null && ` · ${formatDecimal(workout.distance_km)} km`}
            {workout.incline_pct != null && ` · Inclinazione ${formatDecimal(workout.incline_pct, 2)}%`}
            {workout.stroke_rate_spm != null && ` · ${formatDecimal(workout.stroke_rate_spm, 2)} SPM`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-orange-400 font-medium text-sm">{formatDecimal(workout.calories_burned)} kcal</span>
        <button type="button" onClick={onDelete} className="text-gray-600 hover:text-red-400 text-lg" aria-label="Elimina workout">✕</button>
      </div>
    </div>
  )
}
