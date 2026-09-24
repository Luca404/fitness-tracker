import { useState } from 'react'
import type { FoodCategory, MealItemUnit, PieceSize } from '../../types'
import { getPortionEstimates, type PortionEstimateId } from '../../utils/portionEstimates'

interface Props {
  foodName: string
  category: FoodCategory
  grams: number
  onChange: (grams: number) => void
  compact?: boolean
  unit?: MealItemUnit
  pieceSize?: PieceSize | null
  pieceCount?: number | null
  onPieceChange?: (piece: { size: PieceSize; count: number } | null) => void
}

type QuantityMode = 'grams' | PortionEstimateId

function roundQuantity(value: number): number {
  return Math.round(value * 10) / 10
}

function isPieceSize(mode: QuantityMode): mode is PieceSize {
  return mode === 'small' || mode === 'medium' || mode === 'large'
}

export default function IngredientQuantityInput({ foodName, category, grams, onChange, compact = false, unit = 'g', pieceSize, pieceCount, onPieceChange }: Props) {
  const selectionKey = `${category}:${foodName}:${unit}`
  const [selection, setSelection] = useState<{ key: string; mode: QuantityMode }>({
    key: selectionKey,
    mode: pieceSize ?? 'grams',
  })
  const mode = selection.key === selectionKey ? selection.mode : 'grams'
  const estimates = unit === 'g' ? getPortionEstimates(category, foodName) : []
  const activeEstimate = estimates.find(estimate => estimate.id === mode)
  const effectiveMode: QuantityMode = activeEstimate ? mode : 'grams'
  const displayedQuantity = activeEstimate ? roundQuantity(isPieceSize(effectiveMode) && pieceCount ? pieceCount : grams / activeEstimate.grams) : roundQuantity(grams)
  const [draftValue, setDraftValue] = useState<string | null>(null)

  function changeMode(nextMode: QuantityMode) {
    setSelection({ key: selectionKey, mode: nextMode })
    setDraftValue(null)
    if (nextMode === 'grams') { onPieceChange?.(null); return }
    const estimate = estimates.find(option => option.id === nextMode)
    if (estimate) {
      onChange(estimate.grams)
      onPieceChange?.(isPieceSize(nextMode) ? { size: nextMode, count: 1 } : null)
    }
  }

  function changeQuantity(rawValue: string) {
    setDraftValue(rawValue)
    if (rawValue === '') return
    const value = Number(rawValue)
    if (!Number.isFinite(value) || value <= 0) return
    onChange(roundQuantity(activeEstimate ? value * activeEstimate.grams : value))
    if (isPieceSize(effectiveMode)) onPieceChange?.({ size: effectiveMode, count: value })
  }

  return (
    <div className={compact ? 'min-w-0' : ''}>
      <div className={`flex items-center overflow-hidden rounded-xl border border-gray-600 bg-gray-800/70 ${compact ? '' : 'mt-1'}`}>
        <input
          type="number"
          min={activeEstimate ? 0.5 : 1}
          step={activeEstimate ? 0.5 : 1}
          value={draftValue ?? (displayedQuantity > 0 ? displayedQuantity : '')}
          onChange={event => changeQuantity(event.target.value)}
          onBlur={() => { if (draftValue === '') setDraftValue(null) }}
          onFocus={event => event.currentTarget.select()}
          aria-label={`Quantità di ${foodName}`}
          className={`min-w-0 flex-1 bg-transparent font-semibold outline-none ${compact ? 'px-2 py-2 text-sm' : 'px-3 py-2.5 text-lg'}`}
        />
        {estimates.length > 0 ? (
          <select
            value={effectiveMode}
            onChange={event => changeMode(event.target.value as QuantityMode)}
            aria-label={`Unità per ${foodName}`}
            className={`border-l border-gray-600 bg-gray-700 outline-none ${compact ? 'px-2 py-2 text-xs' : 'px-3 py-3 text-sm'}`}
          >
            <option value="grams">{unit === 'ml' ? 'millilitri' : 'grammi'}</option>
            {estimates.map(estimate => (
              <option key={estimate.id} value={estimate.id}>{estimate.label}</option>
            ))}
          </select>
        ) : (
          <span className={`text-gray-500 ${compact ? 'px-2 text-xs' : 'px-3 text-sm'}`}>{unit === 'ml' ? 'millilitri' : 'grammi'}</span>
        )}
      </div>
      {activeEstimate && (
        <p className={`text-gray-500 ${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-xs'}`}>
          ≈ {roundQuantity(grams)} g · 1 {activeEstimate.singularLabel} ≈ {activeEstimate.grams} g
        </p>
      )}
    </div>
  )
}
