import { useState } from 'react'
import type { UserHealthProfile, SuggestedGoals } from '../../types'
import { calculateBMR, calculateTDEE, calculateDeficit, suggestGoals } from '../../utils/bmr'

interface Props {
  profile: Omit<UserHealthProfile, 'user_id' | 'created_at' | 'updated_at'>
  onConfirm: (goals: SuggestedGoals) => void
  onBack: () => void
}

export default function StepConfirm({ profile, onConfirm, onBack }: Props) {
  const bmr = calculateBMR({ ...profile, user_id: '', created_at: '', updated_at: '' })
  const tdee = calculateTDEE(bmr, profile.activity_level)
  const deficit = calculateDeficit({ ...profile, user_id: '', created_at: '', updated_at: '' })
  const suggested = suggestGoals(tdee, deficit)

  const [calories, setCalories] = useState(suggested.calorie_target)
  const [protein, setProtein] = useState(suggested.protein_g)
  const [carbs, setCarbs] = useState(suggested.carbs_g)
  const [fat, setFat] = useState(suggested.fat_g)

  const isAggressive = deficit < -900

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Riepilogo</h2>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-400">BMR</span><span>{Math.round(bmr)} kcal</span></div>
        <div className="flex justify-between"><span className="text-gray-400">TDEE</span><span>{Math.round(tdee)} kcal</span></div>
        <div className="flex justify-between">
          <span className="text-gray-400">Aggiustamento</span>
          <span className={deficit < 0 ? 'text-orange-400' : 'text-emerald-400'}>
            {deficit > 0 ? '+' : ''}{Math.round(deficit)} kcal
          </span>
        </div>
      </div>

      {isAggressive && (
        <p className="text-orange-400 text-sm bg-orange-400/10 rounded-lg p-3">
          Attenzione: Il ritmo è aggressivo (&gt;1000 kcal/giorno di deficit). Il target è stato limitato a -1000 kcal/giorno.
        </p>
      )}

      <h3 className="font-semibold">Goal calorici (modificabili)</h3>

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
            value={val}
            onChange={e => set(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      ))}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={() => onConfirm({ calorie_target: calories, protein_g: protein, carbs_g: carbs, fat_g: fat })}
          className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold text-lg"
        >
          Inizia!
        </button>
      </div>
    </div>
  )
}
