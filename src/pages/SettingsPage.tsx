import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { calculateNutritionGoals, type NutritionGoalRecommendation } from '../utils/bmr'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { profile, currentWeightKg, goals, saveGoals, saveResistanceTraining, showToast } = useData()

  const [calories, setCalories] = useState(goals?.calorie_target ?? 2000)
  const [protein, setProtein] = useState(goals?.protein_g ?? 150)
  const [carbs, setCarbs] = useState(goals?.carbs_g ?? 200)
  const [fat, setFat] = useState(goals?.fat_g ?? 67)
  const [doesResistanceTraining, setDoesResistanceTraining] = useState(profile?.does_resistance_training ?? false)
  const [recommendation, setRecommendation] = useState<NutritionGoalRecommendation | null>(null)

  async function handleSaveGoals() {
    if (!user) return
    if (calories <= 0 || protein < 0 || carbs < 0 || fat < 0) {
      showToast('I valori dei goal non sono validi')
      return
    }
    try {
      await Promise.all([
        saveGoals({
          user_id: user.id,
          calorie_target: calories,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
        }),
        saveResistanceTraining(doesResistanceTraining),
      ])
      showToast('Goal salvati')
    } catch {
      showToast('Errore salvataggio')
    }
  }

  function handleRecalculate() {
    if (!profile) return
    const effectiveProfile = {
      ...profile,
      weight_kg: currentWeightKg ?? profile.weight_kg,
      does_resistance_training: doesResistanceTraining,
    }
    const nextRecommendation = calculateNutritionGoals(effectiveProfile)
    const suggested = nextRecommendation.goals
    setCalories(suggested.calorie_target)
    setProtein(suggested.protein_g)
    setCarbs(suggested.carbs_g)
    setFat(suggested.fat_g)
    setRecommendation(nextRecommendation)
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      showToast('Errore durante il logout')
    }
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      <h1 className="text-xl font-bold">Impostazioni</h1>

      {profile && (
        <div className="card space-y-1 text-sm">
          <h2 className="font-semibold mb-2">Profilo</h2>
          <p className="text-gray-400">Peso: <span className="text-white">{currentWeightKg ?? profile.weight_kg} kg</span></p>
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

        <div className="card space-y-3">
          <div>
            <p className="font-medium">Allenamento di forza/pesi</p>
            <p className="mt-1 text-xs text-gray-400">Separato dall’attività generale; serve soprattutto per stimare le proteine.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: true, label: 'Sì' }, { value: false, label: 'No' }].map(option => (
              <button
                key={option.label}
                type="button"
                onClick={() => setDoesResistanceTraining(option.value)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  doesResistanceTraining === option.value
                    ? 'border-primary-500 bg-primary-600/10 text-primary-300'
                    : 'border-gray-700 text-gray-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {recommendation && (
          <div className="space-y-2 rounded-xl bg-gray-800 p-4 text-xs text-gray-400">
            <p>
              TDEE {Math.round(recommendation.tdee)} kcal · Proteine {recommendation.proteinPerKg.toFixed(1)} g/kg · Grassi {recommendation.fatPerKg.toFixed(1)} g/kg
              {recommendation.usesAdjustedWeight && ` · peso di riferimento ${Math.round(recommendation.referenceWeightKg)} kg`}
            </p>
            {recommendation.warnings.map(warning => (
              <p key={warning.code} className="text-orange-300">⚠️ {warning.message}</p>
            ))}
          </div>
        )}

        {[
          { label: 'Calorie (kcal)', val: calories, set: setCalories },
          { label: 'Proteine (g)', val: protein, set: setProtein },
          { label: 'Carboidrati (g)', val: carbs, set: setCarbs },
          { label: 'Grassi (g)', val: fat, set: setFat },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-sm text-gray-400 mb-1 block">{label}</label>
            <input type="number" min={label.startsWith('Calorie') ? 1 : 0} value={val === 0 ? '' : val}
              onChange={e => set(parseInt(e.target.value) || 0)}
              className="input-field py-3" />
          </div>
        ))}

        <button type="button" onClick={handleSaveGoals}
          className="w-full btn-primary py-3">
          Salva goal
        </button>
      </div>

      <button type="button" onClick={handleSignOut}
        className="w-full py-3 border border-red-500 text-red-400 rounded-xl font-semibold mt-8">
        Logout
      </button>
    </div>
  )
}
