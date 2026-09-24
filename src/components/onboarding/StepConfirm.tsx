import { useState } from 'react'
import type { UserHealthProfile, SuggestedGoals } from '../../types'
import { calculateNutritionGoals } from '../../utils/bmr'

interface Props {
  profile: Omit<UserHealthProfile, 'user_id' | 'created_at' | 'updated_at'>
  onConfirm: (goals: SuggestedGoals) => void
  onBack: () => void
}

export default function StepConfirm({ profile, onConfirm, onBack }: Props) {
  const recommendation = calculateNutritionGoals({
    ...profile,
    user_id: '',
    created_at: '',
    updated_at: '',
  })
  const suggested = recommendation.goals

  const [calories, setCalories] = useState(suggested.calorie_target)
  const [protein, setProtein] = useState(suggested.protein_g)
  const [carbs, setCarbs] = useState(suggested.carbs_g)
  const [fat, setFat] = useState(suggested.fat_g)

  const goalsValid = calories > 0 && protein >= 0 && carbs >= 0 && fat >= 0

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Riepilogo</h2>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">BMR</span><span>{Math.round(recommendation.bmr)} kcal</span></div>
        <div className="flex justify-between"><span className="text-gray-400">TDEE stimato</span><span>{Math.round(recommendation.tdee)} kcal</span></div>
        <div className="flex justify-between">
          <span className="text-gray-400">Aggiustamento</span>
          <span className={recommendation.calorieAdjustment < 0 ? 'text-orange-400' : 'text-primary-400'}>
            {recommendation.calorieAdjustment > 0 ? '+' : ''}{Math.round(recommendation.calorieAdjustment)} kcal
          </span>
        </div>
        {recommendation.appliedWeeklyLossRate !== null && (
          <div className="flex justify-between">
            <span className="text-gray-400">Ritmo usato</span>
            <span>{(recommendation.appliedWeeklyLossRate * 100).toFixed(2)}%/settimana</span>
          </div>
        )}
      </div>

      {recommendation.warnings.map(warning => (
        <p key={warning.code} className="rounded-lg bg-orange-400/10 p-3 text-sm text-orange-300">
          ⚠️ {warning.message}
        </p>
      ))}

      <div>
        <h3 className="font-semibold">Goal giornalieri modificabili</h3>
        <p className="mt-1 text-xs text-gray-400">
          Proteine {recommendation.proteinPerKg.toFixed(1)} g/kg · Grassi {recommendation.fatPerKg.toFixed(1)} g/kg · carboidrati dalle calorie rimanenti
          {recommendation.usesAdjustedWeight && ` · peso di riferimento ${Math.round(recommendation.referenceWeightKg)} kg`}
        </p>
      </div>

      {[
        { label: 'Calorie (kcal)', val: calories, set: setCalories },
        { label: 'Proteine (g)', val: protein, set: setProtein },
        { label: 'Carboidrati (g)', val: carbs, set: setCarbs },
        { label: 'Grassi (g)', val: fat, set: setFat },
      ].map(({ label, val, set }) => (
        <div key={label}>
          <label className="text-sm text-gray-400 mb-1 block">{label}</label>
          <input
            type="number"
            min={label.startsWith('Calorie') ? 1 : 0}
            value={val === 0 ? '' : val}
            onChange={e => set(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-primary-500 outline-none"
          />
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={() => onConfirm({ calorie_target: calories, protein_g: protein, carbs_g: carbs, fat_g: fat })}
          disabled={!goalsValid}
          className="flex-1 py-4 rounded-xl bg-primary-600 font-semibold text-lg disabled:opacity-40"
        >
          Inizia!
        </button>
      </div>
    </div>
  )
}
