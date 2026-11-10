import { useNumberFormat } from '../../hooks/useNumberFormat'
import NumberInput from '../common/NumberInput'
import { useState } from 'react'
import { fractionOfPreparedDish } from '../../utils/preparedDishes'
import { roundToTwo, formatInputDecimal } from '../../utils/decimal'

interface Props {
  totalCookedG: number
  remainingG: number
  value: number
  onChange: (grams: number) => void
  allowZero?: boolean
}

export default function PreparedPortionInput({ totalCookedG, remainingG, value, onChange, allowZero = false }: Props) {
  const { formatDecimal } = useNumberFormat()
  const [draftValue, setDraftValue] = useState<string | null>(null)
  const isRest = value > 0 && roundToTwo(value) === roundToTwo(remainingG)
  const shortcutClass = (selected: boolean) => `rounded-lg border px-2 py-2 text-sm disabled:opacity-35 ${selected
    ? 'border-primary-400 bg-primary-500/15 font-semibold text-primary-200'
    : 'border-gray-600 bg-gray-700 hover:bg-gray-600'}`

  function choose(grams: number) {
    setDraftValue(null)
    onChange(roundToTwo(grams))
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-700 bg-gray-900/30 p-4">
      <div>
        <p className="text-sm font-semibold">Quanto ne mangi? <span className="font-normal text-gray-400">(peso cotto)</span></p>
        <p className="mt-1 text-xs text-gray-500">Totale preparato: {formatDecimal(totalCookedG)} g · Restano: {formatDecimal(remainingG)} g</p>
      </div>
      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Frazione del piatto preparato">
        {([1, 2, 3] as const).map(numerator => {
          const grams = fractionOfPreparedDish(totalCookedG, numerator)
          return <button key={numerator} type="button" onClick={() => choose(grams)}
            disabled={grams <= 0 || grams > remainingG}
            aria-pressed={!isRest && value > 0 && roundToTwo(value) === roundToTwo(grams)}
            className={shortcutClass(!isRest && value > 0 && roundToTwo(value) === roundToTwo(grams))}>
            {numerator === 2 ? '1/2' : `${numerator}/4`}
          </button>
        })}
        <button type="button" onClick={() => choose(remainingG)} disabled={remainingG <= 0}
          aria-pressed={isRest} className={`${shortcutClass(isRest)} text-xs`}>
          Tutto il resto
        </button>
      </div>
      <label data-tour={allowZero ? 'preparation-amount' : undefined} className="block text-xs text-gray-400">Grammi mangiati
        <NumberInput min={allowZero ? 0 : 0.1} max={remainingG} step="0.1" inputMode="decimal"
          value={draftValue ?? (value === 0 ? '' : formatInputDecimal(value))}
          onValueChange={rawValue => {
            const raw = rawValue
            setDraftValue(raw)
            if (raw === '') { onChange(0); return }
            const number = Number(raw)
            if (Number.isFinite(number)) onChange(roundToTwo(number))
          }}
          onBlur={() => setDraftValue(null)}
          className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-lg font-semibold outline-none focus:border-primary-500" />
      </label>
      {allowZero && <p className="text-xs text-gray-500">Lascia 0 se prepari il piatto senza mangiarlo adesso.</p>}
    </div>
  )
}
