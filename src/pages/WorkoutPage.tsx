import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { formatDecimal } from '../utils/decimal'
import { useSettings } from '../contexts/SettingsContext'
import ActivityGrid from '../components/workout/ActivityGrid'
import WorkoutDrawer from '../components/workout/WorkoutDrawer'
import WorkoutRow from '../components/workout/WorkoutRow'
import DaySelector from '../components/common/DaySelector'
import GymTraining from '../components/workout/GymTraining'

export default function WorkoutPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const { workouts, currentWeightKg, addWorkout, removeWorkout, showToast } = useData()
  const { selectedDate, setSelectedDate } = useSettings()
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)

  async function handleSave(activityKey: string, durationMin: number, caloriesBurned: number) {
    if (!user) return
    if (durationMin <= 0 || caloriesBurned < 0) {
      showToast('Durata workout non valida')
      return
    }
    try {
      await addWorkout({
        user_id: user.id,
        date: selectedDate,
        activity: activityKey,
        duration_min: durationMin,
        calories_burned: caloriesBurned,
        notes: null,
      })
      setSelectedActivity(null)
    } catch {
      showToast('Errore salvataggio workout')
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeWorkout(id)
    } catch {
      showToast('Errore eliminazione workout')
    }
  }

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 p-4 pb-24'}>
      <DaySelector date={selectedDate} onChange={setSelectedDate} />

      <GymTraining />

      <details className="rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
        <summary className="cursor-pointer font-semibold">Altre attività</summary>
        <p className="mt-2 text-xs text-gray-500">Per registrare solo durata e calorie stimate. Per serie e carichi usa una scheda palestra.</p>
        <div className="mt-4"><ActivityGrid onSelect={setSelectedActivity} /></div>
      </details>

      {/* Other logged activities for the selected day */}
      {workouts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-300">Altre attività del giorno</h3>
            <span className="text-sm text-orange-400">🔥 {formatDecimal(totalBurned, 0)} kcal</span>
          </div>
          {workouts.map(w => (
            <WorkoutRow key={w.id} workout={w} onDelete={() => handleDelete(w.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <WorkoutDrawer
        activityKey={selectedActivity}
        weightKg={currentWeightKg ?? 70}
        onSave={handleSave}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  )
}
