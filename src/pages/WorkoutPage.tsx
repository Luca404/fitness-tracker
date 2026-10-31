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
import Modal from '../components/common/Modal'

export default function WorkoutPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const { workouts, currentWeightKg, addWorkout, removeWorkout, showToast } = useData()
  const { selectedDate, setSelectedDate } = useSettings()
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)
  const [activityPickerOpen, setActivityPickerOpen] = useState(false)

  const totalBurned = workouts.reduce((s, w) => s + w.calories_burned, 0)

  async function handleSave(activityKey: string, durationMin: number, caloriesBurned: number, distanceKm: number | null) {
    if (!user) throw new Error('Sessione non valida')
    try {
      await addWorkout({
        user_id: user.id,
        date: selectedDate,
        activity: activityKey,
        duration_min: durationMin,
        distance_km: distanceKm,
        calories_burned: caloriesBurned,
        notes: null,
      })
      setSelectedActivity(null)
    } catch {
      showToast('Errore salvataggio workout')
      throw new Error('Salvataggio non riuscito')
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

      <button type="button" onClick={() => setActivityPickerOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-primary-500/30 bg-primary-950/25 p-4 text-left transition hover:bg-primary-950/40">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-2xl">+</span>
        <span><span className="block font-semibold">Altre attività</span>
          <span className="mt-1 block text-xs text-gray-400">Registra camminata, corsa, ciclismo e altro</span></span>
      </button>

      <GymTraining />

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
      <Modal open={activityPickerOpen} onClose={() => setActivityPickerOpen(false)} title="Altre attività">
        <p className="mb-4 text-sm text-gray-400">Scegli l’attività: potrai inserire durata e, quando prevista, distanza.</p>
        <ActivityGrid onSelect={key => { setActivityPickerOpen(false); setSelectedActivity(key) }} />
      </Modal>
      <WorkoutDrawer
        activityKey={selectedActivity}
        weightKg={currentWeightKg ?? 70}
        onSave={handleSave}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  )
}
