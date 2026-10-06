import { useState } from 'react'
import type { PreparedBatch } from '../../types'
import { useData } from '../../contexts/DataContext'
import { correctPreparedBatchWeight } from '../../services/api'
import { formatDecimal, roundToTwo } from '../../utils/decimal'

export default function PreparedWeightCorrection({ batch, disabled, onBusyChange, onCorrected }: {
  batch: PreparedBatch
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  onCorrected: (batch: PreparedBatch) => void | Promise<void>
}) {
  const { refreshDiary, showToast } = useData()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const grams = draft.trim() === '' ? NaN : roundToTwo(Number(draft))
  const total = roundToTwo(batch.total_cooked_g - batch.remaining_g + grams)
  const valid = Number.isFinite(grams) && grams >= 0 && total > 0 && total < 100000000

  async function save() {
    if (!valid || disabled || saving) return
    setSaving(true)
    onBusyChange(true)
    let corrected: PreparedBatch | null = null
    try {
      const amounts = await correctPreparedBatchWeight(batch, grams)
      corrected = { ...batch, ...amounts }
      setEditing(false)
      await onCorrected(corrected)
      await refreshDiary()
      showToast('Peso corretto e pasti precedenti ricalcolati')
    } catch (error) {
      const code = (error as { code?: string })?.code
      showToast(corrected ? 'Peso salvato e pasti ricalcolati. Riapri la schermata per aggiornare i dati.' : code === '40001'
        ? 'La preparazione è cambiata. Riaprila prima di correggere il peso.'
        : 'Errore correzione peso')
    } finally {
      setSaving(false)
      onBusyChange(false)
    }
  }

  if (!editing) return <button type="button" disabled={disabled}
    onClick={() => { setDraft(String(batch.remaining_g)); setEditing(true) }}
    className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-40">
    Correggi il peso rimasto
  </button>

  return <div className="space-y-3 rounded-2xl border border-primary-700/40 bg-gray-900/30 p-4">
    <label className="block text-xs text-gray-400">Peso reale rimasto (g)
      <input type="number" min="0" step="0.01" inputMode="decimal" value={draft}
        disabled={disabled} onChange={event => setDraft(event.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-lg outline-none focus:border-primary-500" />
    </label>
    <p className="text-xs text-gray-400">Pesa tutto il piatto rimasto, prima di prelevare la porzione e senza il contenitore. Le calorie e i nutrienti dei pasti precedenti saranno ricalcolati; i grammi mangiati restano quelli pesati.</p>
    {valid && <p className="text-xs text-gray-400">Totale preparato corretto: {formatDecimal(total)} g</p>}
    <div className="flex gap-2">
      <button type="button" disabled={disabled || !valid} onClick={() => void save()}
        className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">
        {saving ? 'Ricalcolo…' : 'Salva peso e ricalcola'}
      </button>
      <button type="button" disabled={disabled} onClick={() => setEditing(false)}
        className="rounded-xl border border-gray-700 px-3 py-2 text-sm disabled:opacity-40">Annulla</button>
    </div>
  </div>
}
