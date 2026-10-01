// src/components/meals/MealItemRow.tsx
import type { MealItem } from '../../types'
import { formatPieceQuantity } from '../../utils/portionEstimates'
import { formatDecimal } from '../../utils/decimal'

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
        <p className="text-xs text-gray-500">
          {item.piece_size && item.piece_count
            ? `${formatPieceQuantity(item.category, item.food_name, item.piece_size, item.piece_count)} · ≈ ${formatDecimal(item.quantity_g)} g`
            : `${formatDecimal(item.quantity_g)}${item.unit ?? 'g'}`}
          {' · '}P {formatDecimal(item.protein_g)}g · C {formatDecimal(item.carbs_g)}g · G {formatDecimal(item.fat_g)}g
        </p>
        {hasExtendedNutrition && (
          <p className="mt-0.5 text-[11px] text-gray-600">
            {item.fiber_g != null && `Fibre ${formatDecimal(item.fiber_g)}g`}
            {item.sugars_g != null && `${item.fiber_g != null ? ' · ' : ''}Zuccheri ${formatDecimal(item.sugars_g)}g`}
            {item.salt_g != null && `${item.fiber_g != null || item.sugars_g != null ? ' · ' : ''}Sale ${formatDecimal(item.salt_g)}g`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm text-primary-400 font-medium">{formatDecimal(item.calories)} kcal</span>
        {onDelete && (
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors text-lg">✕</button>
        )}
      </div>
    </div>
  )
}
