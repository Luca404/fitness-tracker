// src/components/meals/MealItemRow.tsx
import type { MealItem } from '../../types'

interface Props {
  item: MealItem
  onDelete?: () => void
}

export default function MealItemRow({ item, onDelete }: Props) {
  const hasExtendedNutrition = [item.fiber_g, item.sugars_g, item.salt_g]
    .some(value => value != null)
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.food_name}</p>
        <p className="text-xs text-gray-500">{item.quantity_g}{item.unit ?? 'g'} · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g</p>
        {hasExtendedNutrition && (
          <p className="mt-0.5 text-[11px] text-gray-600">
            {item.fiber_g != null && `Fibre ${item.fiber_g}g`}
            {item.sugars_g != null && `${item.fiber_g != null ? ' · ' : ''}Zuccheri ${item.sugars_g}g`}
            {item.salt_g != null && `${item.fiber_g != null || item.sugars_g != null ? ' · ' : ''}Sale ${item.salt_g}g`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm text-primary-400 font-medium">{Math.round(item.calories)} kcal</span>
        {onDelete && (
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors text-lg">✕</button>
        )}
      </div>
    </div>
  )
}
