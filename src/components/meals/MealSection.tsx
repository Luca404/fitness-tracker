import type { Meal } from '../../types'
import MealItemRow from './MealItemRow'

const LABELS: Record<string, string> = {
  breakfast: '☀️ Colazione',
  lunch:     '🍽️ Pranzo',
  dinner:    '🌙 Cena',
  snack:     '🍎 Spuntino',
}

interface Props {
  meal: Meal
  onDeleteItem: (itemId: string) => void
  onAddItem: (mealType: string) => void
}

export default function MealSection({ meal, onDeleteItem, onAddItem }: Props) {
  const total = meal.items.reduce((s, i) => s + i.calories, 0)

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-300">{LABELS[meal.meal_type] ?? meal.meal_type}</h3>
        <span className="text-sm text-gray-500">{Math.round(total)} kcal</span>
      </div>
      {meal.items.map(item => (
        <MealItemRow key={item.id} item={item} onDelete={() => onDeleteItem(item.id)} />
      ))}
      <button
        onClick={() => onAddItem(meal.meal_type)}
        className="text-sm text-emerald-400 mt-2 flex items-center gap-1"
      >
        + Aggiungi alimento
      </button>
    </div>
  )
}
