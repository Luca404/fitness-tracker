import type { MealEntry } from '../../types'
import { getMealEntryTotals } from '../../utils/mealEntries'
import { useNumberFormat } from '../../hooks/useNumberFormat'
import { roundToTwo } from '../../utils/decimal'
import FormActions from '../common/FormActions'
import PreparedPortionInput from './PreparedPortionInput'

export default function PreparedPortionEditor({ entry, amounts, grams, onChange, onSave, onCancel, saving }: {
  entry: MealEntry
  amounts: { total_cooked_g: number; remaining_g: number }
  grams: number
  onChange: (grams: number) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const { formatDecimal } = useNumberFormat()
  const original = entry.cooked_portion_g ?? 0
  const available = roundToTwo(amounts.remaining_g + original)
  const valid = Number.isFinite(grams) && grams > 0 && grams <= available
  const totals = getMealEntryTotals(entry)
  const ratio = original > 0 && valid ? grams / original : null

  return <fieldset disabled={saving} className="space-y-4">
    <PreparedPortionInput totalCookedG={amounts.total_cooked_g} remainingG={available} value={grams} onChange={onChange} />
    <section aria-label="Anteprima porzione" aria-live="polite" className="space-y-3 rounded-2xl border border-primary-500/25 bg-primary-950/20 p-4">
      <h3 className="text-sm font-semibold">Nuova porzione</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-gray-400">Porzione precedente</dt><dd>{formatDecimal(original, 2)} g</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-gray-400">Dopo la modifica</dt><dd>{valid ? `${formatDecimal(grams, 2)} g` : '—'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-gray-400">Avanzo risultante</dt><dd>{valid ? `${formatDecimal(available - grams, 2)} g` : '—'}</dd></div>
      </dl>
      <p className="text-xl font-bold text-primary-300">{ratio === null ? '—' : formatDecimal(totals.calories * ratio)} kcal</p>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {([['Proteine', totals.protein], ['Carboidrati', totals.carbs], ['Grassi', totals.fat]] as const).map(([label, amount]) => <div key={label} className="rounded-lg bg-black/15 p-2">
          <p className="text-gray-400">{label}</p><p className="mt-1 font-semibold">{ratio === null ? '—' : formatDecimal(amount * ratio)} g</p>
        </div>)}
      </div>
    </section>
    <FormActions onSave={onSave} onCancel={onCancel} saveLabel="Salva porzione" saving={saving} disabled={!valid} />
  </fieldset>
}
