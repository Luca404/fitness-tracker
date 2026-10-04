import { formatDecimal, roundToTwo } from '../../utils/decimal'
import { PHOTO_NUTRIENT_FIELDS } from '../../utils/pantryDraft'
import type { PendingFood, NutrientFieldKey } from '../../utils/pantryDraft'

const CORE_NUTRIENT_KEYS = new Set<NutrientFieldKey>([
  'calories_100g', 'protein_100g', 'carbs_100g', 'fat_100g',
])

export function NutrientNumberInput({ label, value, onChange, optional = false }: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  optional?: boolean
}) {
  return (
    <label className="block min-w-0 text-xs text-gray-400">
      {label}
      <input type="number" min={0} step="0.1" inputMode="decimal"
        value={value === 0 && !optional ? '' : value == null ? '' : formatDecimal(value)}
        onChange={event => onChange(event.target.value === '' ? (optional ? null : 0) : roundToTwo(Number(event.target.value)))}
        className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm outline-none focus:border-primary-500" />
    </label>
  )
}

export function PendingNutritionFields({ food, onChange }: {
  food: PendingFood
  onChange: (key: NutrientFieldKey, value: number | null) => void
}) {
  function field(key: NutrientFieldKey) {
    const definition = PHOTO_NUTRIENT_FIELDS.find(item => item.key === key)!
    return <NutrientNumberInput key={key} label={`${definition.label} (${definition.unit})`}
      value={food[key] ?? null} optional={!CORE_NUTRIENT_KEYS.has(key)}
      onChange={value => onChange(key, value)} />
  }

  return (
    <div className="mt-2 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {field('calories_100g')}
        {field('protein_100g')}
      </div>
      <fieldset aria-label="Carboidrati" className="rounded-xl border border-gray-700 p-3">
        {field('carbs_100g')}
        <div className="mt-2 border-l-2 border-gray-600 pl-3">{field('sugars_100g')}</div>
      </fieldset>
      <fieldset aria-label="Grassi" className="rounded-xl border border-gray-700 p-3">
        {field('fat_100g')}
        <div className="mt-2 border-l-2 border-gray-600 pl-3">{field('saturated_fat_100g')}</div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        {field('fiber_100g')}
        {field('salt_100g')}
      </div>
    </div>
  )
}
