// src/components/meals/MealItemRow.tsx
import type { MealItem } from '../../types'

interface Props {
  item: MealItem
  onDelete: () => void
}

export default function MealItemRow({ item, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.food_name}</p>
        <p className="text-xs text-gray-500">{item.quantity_g}g · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g</p>
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="text-sm text-primary-400 font-medium">{Math.round(item.calories)} kcal</span>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors text-lg">
          ✕
        </button>
      </div>
    </div>
  )
}
