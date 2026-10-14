import FormActions from '../common/FormActions'
import { useState } from 'react'
import type { PieceSize } from '../../types'
import type { DishItemDraft } from './DishEditor'
import IngredientPortionCard from './IngredientPortionCard'
import { roundToTwo } from '../../utils/decimal'
import AlcoholStrengthInput from './AlcoholStrengthInput'
import { alcoholStrength, validAlcoholStrength, withAlcoholStrength } from '../../utils/alcohol'
import { scaleIngredient } from '../../utils/nutrition'

export default function SingleIngredientEditor({ item, onSave, onCancel }: {
  item: DishItemDraft
  onSave: (updated: DishItemDraft) => Promise<void>
  onCancel: () => void
}) {
  const [quantity, setQuantity] = useState(item.quantity_g)
  const [quantityValid, setQuantityValid] = useState(true)
  const [piece, setPiece] = useState<{ size: PieceSize; count: number } | null>(
    item.piece_size && item.piece_count ? { size: item.piece_size, count: item.piece_count } : null,
  )
  const [abv, setAbv] = useState(() => alcoholStrength(item))
  const alcoholic = item.category === 'alcohol' || abv != null
  const validAbv = !alcoholic || abv == null || validAlcoholStrength(abv)
  const updated = withAlcoholStrength(scaleIngredient(item, quantity), abv)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function save() {
    if (saving || !quantityValid || !Number.isFinite(quantity) || quantity <= 0 || !validAbv) return
    setSaving(true)
    setError(false)
    try {
      await onSave({
        ...updated,
        piece_count: piece == null ? null : roundToTwo(piece.count),
        piece_size: piece?.size ?? null,
      })
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-4">
    <IngredientPortionCard item={{ ...updated, piece_count: piece?.count ?? null, piece_size: piece?.size ?? null }}
      onQuantityChange={setQuantity} onValidityChange={setQuantityValid} onPieceChange={setPiece} disabled={saving} />
    {alcoholic && <AlcoholStrengthInput value={abv} onChange={setAbv} volumeMl={item.unit === 'ml' ? quantity : undefined} disabled={saving} />}
    {error && <p className="text-sm text-red-400">Impossibile aggiornare la quantità. Riprova.</p>}
    <FormActions onSave={() => void save()} onCancel={onCancel} saveLabel="Salva quantità" saving={saving}
      disabled={!quantityValid || !Number.isFinite(quantity) || quantity <= 0 || !validAbv} />
  </div>
}
