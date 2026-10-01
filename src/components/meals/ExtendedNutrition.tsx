import type { ExtendedNutritionTotals } from '../../utils/extendedNutrition'
import { formatDecimal } from '../../utils/decimal'

interface Props {
  totals: ExtendedNutritionTotals
  detailedLabels?: boolean
}

const NUTRIENTS = [
  { key: 'fiber_g' as const, label: 'Fibre' },
  { key: 'sugars_g' as const, label: 'Zuccheri' },
  { key: 'salt_g' as const, label: 'Sale' },
]

export default function ExtendedNutrition({ totals, detailedLabels = false }: Props) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
      {NUTRIENTS.map(({ key, label }) => {
        const nutrient = totals[key]
        return (
          <div key={key} className="rounded-xl bg-black/10 p-2">
            <p className="text-[10px] text-gray-500">{detailedLabels && key === 'sugars_g' ? 'di cui zuccheri' : label}</p>
            <p className="text-sm font-semibold text-gray-300" title={nutrient.partial ? 'Totale parziale: alcuni ingredienti non hanno questo dato' : undefined}>
              {nutrient.value == null ? '—' : `${nutrient.partial ? '≈ ' : ''}${formatDecimal(nutrient.value)}g`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
