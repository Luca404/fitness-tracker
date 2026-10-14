import { roundToTwo } from '../../utils/decimal'

export interface NutritionFieldValues {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  sugars_g?: number | null
  saturated_fat_g?: number | null
  fiber_g?: number | null
  salt_g?: number | null
}

interface Props {
  values: NutritionFieldValues
  onChange: (key: keyof NutritionFieldValues, value: number | null) => void
  basis?: 'portion' | 'per100g' | 'per100ml'
  includeSaturatedFat?: boolean
  disabled?: boolean
}

const labels: Record<keyof NutritionFieldValues, string> = {
  calories: 'Calorie', protein_g: 'Proteine', carbs_g: 'Carboidrati', fat_g: 'Grassi',
  sugars_g: 'di cui zuccheri', saturated_fat_g: 'di cui grassi saturi', fiber_g: 'Fibre', salt_g: 'Sale',
}

export default function NutritionFields({ values, onChange, basis = 'portion', includeSaturatedFat = false, disabled = false }: Props) {
  const suffix = basis === 'portion' ? '' : basis === 'per100ml' ? '/100ml' : '/100g'
  function field(key: keyof NutritionFieldValues, optional = false) {
    const unit = key === 'calories' ? 'kcal' : 'g'
    const value = values[key]
    return <label key={key} className="block min-w-0 text-xs text-gray-400">
      {labels[key]} ({unit}{suffix})
      <input type="number" min={0} step="any" inputMode="decimal" disabled={disabled}
        value={value == null ? '' : String(value)}
        onChange={event => onChange(key, event.target.value === '' ? (optional ? null : 0) : roundToTwo(Number(event.target.value)))}
        className="mt-1 w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />
    </label>
  }
  return <div className="space-y-3">
    <p className="text-xs text-gray-400">{basis === 'portion' ? 'Valori della porzione' : `Valori per 100 ${basis === 'per100ml' ? 'ml' : 'g'}`}</p>
    <div className="grid grid-cols-2 gap-3">
      {field('calories')}{field('protein_g')}{field('carbs_g')}{field('fat_g')}
    </div>
    <details className="rounded-xl border border-gray-700 p-3">
      <summary className="cursor-pointer text-xs font-medium text-gray-400">Altri valori nutrizionali (facoltativi)</summary>
      <p className="mt-2 text-xs text-gray-500">Lascia vuoti i valori che non conosci; zero indica un valore noto.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {field('sugars_g', true)}{includeSaturatedFat && field('saturated_fat_g', true)}
        {field('fiber_g', true)}{field('salt_g', true)}
      </div>
    </details>
  </div>
}
