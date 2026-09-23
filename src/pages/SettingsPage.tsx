import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { calculateNutritionGoals, type NutritionGoalRecommendation } from '../utils/bmr'
import { NUTRITION_GOAL_CONFIG, RECOMPOSITION_TRAINING_ADVICE } from '../config/nutritionGoals'
import Modal from '../components/common/Modal'
import ProfileGoalEditor from '../components/settings/ProfileGoalEditor'
import type { UserHealthProfile } from '../types'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const {
    profile, currentWeightKg, rollingWeightKg, rollingWeightSampleCount, goals,
    saveGoals, saveProfileAndRecalculate, showToast,
  } = useData()

  const [calories, setCalories] = useState(goals?.calorie_target ?? 2000)
  const [protein, setProtein] = useState(goals?.protein_g ?? 150)
  const [carbs, setCarbs] = useState(goals?.carbs_g ?? 200)
  const [fat, setFat] = useState(goals?.fat_g ?? 67)
  const [calculationWeightKg, setCalculationWeightKg] = useState(goals?.calculation_weight_kg ?? null)
  const [recommendation, setRecommendation] = useState<NutritionGoalRecommendation | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)

  async function handleSaveGoals() {
    if (!user) return
    if (calories <= 0 || protein < 0 || carbs < 0 || fat < 0) {
      showToast('I valori dei goal non sono validi')
      return
    }
    try {
      await saveGoals({
        user_id: user.id,
        calorie_target: calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        calculation_weight_kg: calculationWeightKg ?? currentWeightKg ?? profile?.weight_kg ?? null,
      })
      showToast('Goal salvati')
    } catch {
      showToast('Errore salvataggio')
    }
  }

  function handleRecalculate() {
    if (!profile) return
    const canUseRollingWeight = rollingWeightKg !== null
      && rollingWeightSampleCount >= NUTRITION_GOAL_CONFIG.weightRecalculation.minimumSamples
    const referenceWeightKg = canUseRollingWeight
      ? rollingWeightKg
      : (currentWeightKg ?? profile.weight_kg)
    const effectiveProfile = {
      ...profile,
      weight_kg: referenceWeightKg,
    }
    const nextRecommendation = calculateNutritionGoals(effectiveProfile)
    const suggested = nextRecommendation.goals
    setCalories(suggested.calorie_target)
    setProtein(suggested.protein_g)
    setCarbs(suggested.carbs_g)
    setFat(suggested.fat_g)
    setCalculationWeightKg(referenceWeightKg)
    setRecommendation(nextRecommendation)
  }

  async function handleSaveProfile(nextProfile: UserHealthProfile) {
    try {
      const nextGoals = await saveProfileAndRecalculate(nextProfile)
      setCalories(nextGoals.calorie_target)
      setProtein(nextGoals.protein_g)
      setCarbs(nextGoals.carbs_g)
      setFat(nextGoals.fat_g)
      setCalculationWeightKg(nextGoals.calculation_weight_kg)
      setRecommendation(null)
      showToast('Profilo e target aggiornati')
    } catch {
      showToast('Errore aggiornamento profilo')
      throw new Error('Profile update failed')
    }
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
        <div className="card space-y-2 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Profilo</h2>
            <button type="button" onClick={() => setEditingProfile(true)} className="text-xs text-primary-400">
              Modifica dati
            </button>
          </div>
          <p className="text-gray-400">Peso attuale: <span className="text-white">{currentWeightKg ?? profile.weight_kg} kg</span></p>
          <p className="text-gray-400">Altezza: <span className="text-white">{profile.height_cm} cm</span></p>
          <p className="text-gray-400">Obiettivo: <span className="text-white">{profile.objective === 'recomposition' ? 'Ricomposizione corporea' : profile.objective.replace('_', ' ')}</span></p>
          <p className="text-gray-400">Forza/pesi: <span className="text-white">{profile.does_resistance_training ? 'Sì' : 'No'}</span></p>
          {profile.objective === 'recomposition' && !profile.does_resistance_training && (
            <p className="text-orange-300">⚠️ {RECOMPOSITION_TRAINING_ADVICE}</p>
          )}
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

        <div className="rounded-xl bg-gray-800/70 p-3 text-xs text-gray-400">
          {rollingWeightKg !== null && rollingWeightSampleCount >= NUTRITION_GOAL_CONFIG.weightRecalculation.minimumSamples
            ? <>Media peso 7 giorni: <span className="text-white">{rollingWeightKg} kg</span> su {rollingWeightSampleCount} misurazioni. Ricalcolo automatico al ±2% rispetto a {goals?.calculation_weight_kg ?? profile?.weight_kg} kg.</>
            : <>Servono almeno {NUTRITION_GOAL_CONFIG.weightRecalculation.minimumSamples} pesate negli ultimi 7 giorni per il ricalcolo automatico.</>}
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

      {profile && (
        <Modal open={editingProfile} onClose={() => setEditingProfile(false)} title="Modifica dati profilo">
          <ProfileGoalEditor
            profile={profile}
            currentWeightKg={currentWeightKg ?? profile.weight_kg}
            onSave={handleSaveProfile}
            onClose={() => setEditingProfile(false)}
          />
        </Modal>
      )}
    </div>
  )
}
