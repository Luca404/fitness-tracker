import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { calculateBMR, calculateTDEE, calculateDeficit, suggestGoals } from '../utils/bmr'

export default function SettingsPage() {
  const { signOut } = useAuth()
  const { profile, goals, saveGoals, showToast } = useData()

  const [calories, setCalories] = useState(goals?.calorie_target ?? 2000)
  const [protein, setProtein] = useState(goals?.protein_g ?? 150)
  const [carbs, setCarbs] = useState(goals?.carbs_g ?? 200)
  const [fat, setFat] = useState(goals?.fat_g ?? 67)

  async function handleSaveGoals() {
    if (!goals) return
    try {
      await saveGoals({
        user_id: goals.user_id,
        calorie_target: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
      })
      showToast('Goal salvati')
    } catch {
      showToast('Errore salvataggio')
    }
  }

  function handleRecalculate() {
    if (!profile) return
    const bmr = calculateBMR(profile)
    const tdee = calculateTDEE(bmr, profile.activity_level)
    const deficit = calculateDeficit(profile)
    const suggested = suggestGoals(tdee, deficit)
    setCalories(suggested.calorie_target)
    setProtein(suggested.protein_g)
    setCarbs(suggested.carbs_g)
    setFat(suggested.fat_g)
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold">Impostazioni</h1>

      {profile && (
        <div className="card space-y-1 text-sm">
          <h2 className="font-semibold mb-2">Profilo</h2>
          <p className="text-gray-400">Peso: <span className="text-white">{profile.weight_kg} kg</span></p>
          <p className="text-gray-400">Altezza: <span className="text-white">{profile.height_cm} cm</span></p>
          <p className="text-gray-400">Obiettivo: <span className="text-white capitalize">{profile.objective.replace('_', ' ')}</span></p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Goal calorici</h2>
          <button type="button" onClick={handleRecalculate}
            className="text-xs text-primary-400 border border-primary-600 px-3 py-1 rounded-full hover:bg-primary-900/30 transition-colors">
            Ricalcola da TDEE
          </button>
        </div>

        {[
          { label: 'Calorie (kcal)', val: calories, set: setCalories },
          { label: 'Proteine (g)', val: protein, set: setProtein },
          { label: 'Carboidrati (g)', val: carbs, set: setCarbs },
          { label: 'Grassi (g)', val: fat, set: setFat },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-sm text-gray-400 mb-1 block">{label}</label>
            <input type="number" value={val}
              onChange={e => set(parseInt(e.target.value) || 0)}
              className="input-field py-3" />
          </div>
        ))}

        <button type="button" onClick={handleSaveGoals}
          className="w-full btn-primary py-3">
          Salva goal
        </button>
      </div>

      <button type="button" onClick={signOut}
        className="w-full py-3 border border-red-500 text-red-400 rounded-xl font-semibold mt-8">
        Logout
      </button>
    </div>
  )
}
