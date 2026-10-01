import { useState } from 'react'
import { fractionOfPreparedDish } from '../../utils/preparedDishes'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

interface Props {
  totalCookedG: number
  remainingG: number
  value: number
  onChange: (grams: number) => void
  allowZero?: boolean
}

export default function PreparedPortionInput({ totalCookedG, remainingG, value, onChange, allowZero = false }: Props) {
  const [draftValue, setDraftValue] = useState<string | null>(null)

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
            className="rounded-lg bg-gray-700 px-2 py-2 text-sm hover:bg-gray-600 disabled:opacity-35">
            {numerator === 2 ? '1/2' : `${numerator}/4`}
          </button>
        })}
        <button type="button" onClick={() => choose(remainingG)} disabled={remainingG <= 0}
          className="rounded-lg bg-primary-900/50 px-2 py-2 text-xs text-primary-200 hover:bg-primary-900 disabled:opacity-35">
          Tutto il resto
        </button>
      </div>
      <label className="block text-xs text-gray-400">Grammi mangiati
        <input type="number" min={allowZero ? 0 : 0.01} max={remainingG} step="0.01" inputMode="decimal"
          value={draftValue ?? (value === 0 ? '' : formatDecimal(value))}
          onChange={event => {
            const raw = event.target.value
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
