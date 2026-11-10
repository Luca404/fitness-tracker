import { useNumberFormat } from '../../hooks/useNumberFormat'

export default function NumberFormatSettings() {
  const { decimalSeparator, setDecimalSeparator, formatDecimal } = useNumberFormat()
  return <section className="card space-y-3" aria-labelledby="number-format-title">
    <h2 id="number-format-title" className="font-semibold">Formato dei numeri</h2>
    <fieldset>
      <legend className="mb-2 text-sm text-gray-400">Separatore decimale</legend>
      <div className="grid grid-cols-2 gap-3">
        {([['.', 'Punto (.)'], [',', 'Virgola (,)']] as const).map(([separator, label]) => <label key={separator}
          className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${decimalSeparator === separator ? 'border-primary-500 bg-primary-500/15 text-primary-200' : 'border-gray-700 text-gray-300'}`}>
          <input type="radio" name="decimal-separator" value={separator} checked={decimalSeparator === separator}
            onChange={() => setDecimalSeparator(separator)} className="accent-primary-500" />
          {label}
        </label>)}
      </div>
    </fieldset>
    <p className="text-sm text-gray-400">Esempio: {formatDecimal(12.35, 2)}. Il formato si applica a tutta l’app ed è salvato su questo dispositivo.</p>
  </section>
}
