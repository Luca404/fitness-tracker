import type { ExtendedNutritionTotals } from '../../utils/extendedNutrition'

interface Props {
  totals: ExtendedNutritionTotals
}

const NUTRIENTS = [
  { key: 'fiber_g' as const, label: 'Fibre' },
  { key: 'sugars_g' as const, label: 'di cui zuccheri' },
  { key: 'salt_g' as const, label: 'Sale' },
]

function formatValue(value: number, key: (typeof NUTRIENTS)[number]['key']) {
  const precision = key === 'salt_g' ? 100 : 10
  return Math.round(value * precision) / precision
}

export default function ExtendedNutrition({ totals }: Props) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
      {NUTRIENTS.map(({ key, label }) => {
        const nutrient = totals[key]
        return (
          <div key={key} className="rounded-xl bg-black/10 p-2">
            <p className="text-[10px] text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-gray-300" title={nutrient.partial ? 'Totale parziale: alcuni ingredienti non hanno questo dato' : undefined}>
              {nutrient.value == null ? '—' : `${nutrient.partial ? '≈ ' : ''}${formatValue(nutrient.value, key)}g`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
