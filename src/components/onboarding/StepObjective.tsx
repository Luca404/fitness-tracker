import { useMemo } from 'react'
import type { Objective } from '../../types'
import { differenceInDays, format, addMonths } from 'date-fns'

interface ObjectiveData {
  objective: Objective
  target_weight_kg: number | null
  target_date: string | null
}

interface Props {
  data: ObjectiveData
  currentWeightKg: number
  onChange: (d: ObjectiveData) => void
  onNext: () => void
  onBack: () => void
}

const OBJECTIVES: { key: Objective; label: string; desc: string; icon: string }[] = [
  { key: 'lose_weight', label: 'Perdi peso',   desc: 'Deficit calorico personalizzato', icon: '📉' },
  { key: 'gain_muscle', label: 'Metti massa',  desc: '+250 kcal/giorno sul TDEE',       icon: '💪' },
  { key: 'maintain',    label: 'Mantieni',     desc: 'Calorie = TDEE calcolato',        icon: '⚖️' },
]

export default function StepObjective({ data, currentWeightKg, onChange, onNext, onBack }: Props) {
  function set<K extends keyof ObjectiveData>(key: K, val: ObjectiveData[K]) {
    onChange({ ...data, [key]: val })
  }

  const rateKgPerWeek = useMemo(() => {
    if (data.objective !== 'lose_weight' || !data.target_weight_kg || !data.target_date) return null
    const days = differenceInDays(new Date(data.target_date), new Date())
    if (days <= 0) return null
    const weeks = days / 7
    const deltaKg = currentWeightKg - data.target_weight_kg
    return (deltaKg / weeks).toFixed(2)
  }, [data, currentWeightKg])

  const isAggressive = rateKgPerWeek !== null && parseFloat(rateKgPerWeek) > 1

  const valid =
    data.objective === 'maintain' ||
    data.objective === 'gain_muscle' ||
    (data.objective === 'lose_weight' && !!data.target_weight_kg && !!data.target_date)

  const defaultTargetDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Qual è il tuo obiettivo?</h2>

      <div className="space-y-3">
        {OBJECTIVES.map(({ key, label, desc, icon }) => (
          <button
            key={key}
            onClick={() => onChange({
              objective: key,
              target_weight_kg: key === 'maintain' ? null : data.target_weight_kg,
              target_date: key === 'lose_weight' ? (data.target_date ?? defaultTargetDate) : null,
            })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${
              data.objective === key
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-gray-700 bg-gray-800'
            }`}
          >
            <span className="text-2xl mr-3">{icon}</span>
            <span className="font-semibold">{label}</span>
            <p className="text-sm text-gray-400 mt-1 ml-9">{desc}</p>
          </button>
        ))}
      </div>

      {(data.objective === 'lose_weight' || data.objective === 'gain_muscle') && (
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Peso target (kg){data.objective === 'gain_muscle' ? ' — opzionale' : ''}
          </label>
          <input
            type="number"
            min={30}
            max={300}
            value={data.target_weight_kg ?? ''}
            onChange={e => set('target_weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
        </div>
      )}

      {data.objective === 'lose_weight' && (
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Entro quando?</label>
          <input
            type="date"
            value={data.target_date ?? defaultTargetDate}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={e => set('target_date', e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-emerald-500 outline-none"
          />
          {rateKgPerWeek && (
            <p className={`text-sm mt-2 ${isAggressive ? 'text-orange-400' : 'text-emerald-400'}`}>
              {isAggressive && '⚠️ '}Ritmo stimato: {rateKgPerWeek} kg/settimana
              {isAggressive && ' — considera un obiettivo più graduale'}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-4 rounded-xl border border-gray-600 text-gray-400">
          ← Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!valid}
          className="flex-1 py-4 rounded-xl bg-emerald-500 font-semibold disabled:opacity-40"
        >
          Continua →
        </button>
      </div>
    </div>
  )
}
