import type { DishItemDraft, PieceSize } from '../../types'
import { formatDecimal } from '../../utils/decimal'
import IngredientQuantityInput from './IngredientQuantityInput'

interface Props {
  item: DishItemDraft
  onQuantityChange: (quantity: number) => void
  onValidityChange?: (valid: boolean) => void
  onPieceChange?: (piece: { size: PieceSize; count: number } | null) => void
  onRemove?: () => void
  disabled?: boolean
}

export default function IngredientPortionCard({ item, onQuantityChange, onValidityChange, onPieceChange, onRemove, disabled = false }: Props) {
  return <fieldset disabled={disabled} className="min-w-0 rounded-xl border border-gray-700 bg-gray-900/30 p-3 text-sm">
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate font-medium text-gray-300">{item.food_name}</span>
      <span className="shrink-0 text-xs text-primary-400">{formatDecimal(item.calories)} kcal</span>
      {onRemove && <button type="button" onClick={onRemove} aria-label={`Rimuovi ${item.food_name}`}
        className="px-1 text-lg text-gray-500 hover:text-red-300">✕</button>}
    </div>
    <p className="mt-1 text-xs text-gray-500">P {formatDecimal(item.protein_g)}g · C {formatDecimal(item.carbs_g)}g · G {formatDecimal(item.fat_g)}g</p>
    <div className="mt-2"><IngredientQuantityInput foodName={item.food_name} category={item.category} grams={item.quantity_g}
      unit={item.unit} compact onChange={onQuantityChange} onValidityChange={onValidityChange}
      pieceSize={item.piece_size} pieceCount={item.piece_count} onPieceChange={onPieceChange} /></div>
    <details className="mt-2 text-xs text-gray-500">
      <summary className="cursor-pointer">Valori aggiuntivi</summary>
      <p className="mt-1">Fibre {item.fiber_g == null ? '—' : `${formatDecimal(item.fiber_g)}g`} · Zuccheri {item.sugars_g == null ? '—' : `${formatDecimal(item.sugars_g)}g`} · Sale {item.salt_g == null ? '—' : `${formatDecimal(item.salt_g)}g`}</p>
    </details>
  </fieldset>
}
