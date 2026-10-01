import { useState } from 'react'
import type { PieceSize } from '../../types'
import type { DishItemDraft } from './DishEditor'
import IngredientQuantityInput from './IngredientQuantityInput'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

export default function SingleIngredientEditor({ item, onSave, onCancel }: {
  item: DishItemDraft
  onSave: (updated: DishItemDraft) => Promise<void>
  onCancel: () => void
}) {
  const [quantity, setQuantity] = useState(item.quantity_g)
  const [piece, setPiece] = useState<{ size: PieceSize; count: number } | null>(
    item.piece_size && item.piece_count ? { size: item.piece_size, count: item.piece_count } : null,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const factor = quantity / item.quantity_g

  async function save() {
    if (saving || !Number.isFinite(quantity) || quantity <= 0) return
    setSaving(true)
    setError(false)
    try {
      await onSave({
        ...item,
        quantity_g: roundToTwo(quantity),
        piece_count: piece == null ? null : roundToTwo(piece.count),
        piece_size: piece?.size ?? null,
        calories: roundToTwo(item.calories * factor),
        protein_g: roundToTwo(item.protein_g * factor),
        carbs_g: roundToTwo(item.carbs_g * factor),
        fat_g: roundToTwo(item.fat_g * factor),
        fiber_g: item.fiber_g == null ? null : roundToTwo(item.fiber_g * factor),
        sugars_g: item.sugars_g == null ? null : roundToTwo(item.sugars_g * factor),
        salt_g: item.salt_g == null ? null : roundToTwo(item.salt_g * factor),
      })
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-4">
    <p className="text-sm text-gray-400">{item.food_name}</p>
    <IngredientQuantityInput foodName={item.food_name} category={item.category}
      grams={quantity} unit={item.unit} onChange={setQuantity}
      pieceCount={piece?.count} pieceSize={piece?.size} onPieceChange={setPiece} />
    <p className="text-sm text-gray-400">{Number.isFinite(factor) ? formatDecimal(item.calories * factor) : 0} kcal</p>
    {error && <p className="text-sm text-red-400">Impossibile aggiornare la quantità. Riprova.</p>}
    <button type="button" onClick={() => void save()} disabled={saving || !Number.isFinite(quantity) || quantity <= 0}
      className="w-full rounded-xl bg-primary-500 py-3 font-semibold disabled:opacity-40">
      {saving ? 'Salvataggio…' : 'Salva quantità'}
    </button>
    <button type="button" onClick={onCancel} className="w-full text-sm text-gray-400">Annulla</button>
  </div>
}
