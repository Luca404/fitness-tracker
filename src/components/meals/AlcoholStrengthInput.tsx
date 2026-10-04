import { formatDecimal } from '../../utils/decimal'
import { alcoholUnits, validAlcoholStrength } from '../../utils/alcohol'

export default function AlcoholStrengthInput({ value, onChange, volumeMl, estimated = false, disabled = false }: {
  value: number | null; onChange: (value: number | null) => void; volumeMl?: number; estimated?: boolean; disabled?: boolean
}) {
  return <div className="space-y-2">
    <label className="block text-xs text-gray-400">Gradazione (% vol)
      <input type="number" min={0} max={100} step="0.1" inputMode="decimal"
        value={value == null ? '' : formatDecimal(value)} disabled={disabled}
        onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}
        className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm outline-none focus:border-primary-500" />
    </label>
    {value != null && !validAlcoholStrength(value) && <p className="text-xs text-orange-400">Inserisci una gradazione tra 0 e 100.</p>}
    {volumeMl != null && volumeMl > 0 && validAlcoholStrength(value) && <p className="text-xs text-gray-400">≈ {formatDecimal(alcoholUnits(volumeMl, value))} UA · 1 UA = 12 g di alcol</p>}
    <p className="text-[11px] text-gray-500">{estimated ? 'Cocktail: volume senza ghiaccio, gradazione e calorie indicativi. Correggili in base alla preparazione.' : 'Inserisci la gradazione riportata sull’etichetta.'}</p>
  </div>
}
