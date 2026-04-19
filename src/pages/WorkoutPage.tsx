import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { useSettings } from '../contexts/SettingsContext'
import ActivityGrid from '../components/workout/ActivityGrid'
import WorkoutDrawer from '../components/workout/WorkoutDrawer'
import WorkoutRow from '../components/workout/WorkoutRow'
import DaySelector from '../components/common/DaySelector'

export default function WorkoutPage() {
  const { user } = useAuth()
  const { workouts, profile, loading, fetchForDate, addWorkout, removeWorkout, showToast } = useData()
  const { selectedDate, setSelectedDate } = useSettings()
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  useEffect(() => {
    fetchForDate(selectedDate)
  }, [selectedDate, fetchForDate])

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)

  async function handleSave(activityKey: string, durationMin: number, caloriesBurned: number) {
    if (!user) return
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

  return (
    <div className="p-4 pb-24 space-y-6">
      <DaySelector date={selectedDate} onChange={setSelectedDate} />

      <h2 className="font-semibold text-gray-300">Seleziona attività</h2>

      {loading ? (
        <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />
      ) : (
        <ActivityGrid onSelect={setSelectedActivity} />
      )}

      {/* Today's workouts */}
      {workouts.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-gray-300">Workout di oggi</h3>
            <span className="text-sm text-orange-400">🔥 {Math.round(totalBurned)} kcal</span>
          </div>
          {workouts.map(w => (
            <WorkoutRow key={w.id} workout={w} onDelete={() => removeWorkout(w.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      <WorkoutDrawer
        activityKey={selectedActivity}
        weightKg={profile?.weight_kg ?? 70}
        onSave={handleSave}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  )
}
