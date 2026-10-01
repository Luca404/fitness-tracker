import { useCallback, useEffect, useState } from 'react'
import * as api from '../../services/api'
import { useData } from '../../contexts/DataContext'
import { useSettings } from '../../contexts/SettingsContext'
import type { DishMealType, PreparedBatch } from '../../types'
import { DISH_MEAL_TYPES } from '../../data/dishMealTypes'
import PreparedPortionInput from './PreparedPortionInput'
import { formatDecimal } from '../../utils/decimal'

export default function PreparedDishesPanel({ mealType, onConsumed, compact = false, onCountChange, onSelect }: {
  mealType?: DishMealType
  onConsumed?: () => Promise<void>
  compact?: boolean
  onCountChange?: (count: number) => void
  onSelect?: (batch: PreparedBatch) => void
}) {
  const { selectedDate } = useSettings()
  const { fetchForDate, showToast } = useData()
  const [batches, setBatches] = useState<PreparedBatch[]>([])
  const [selected, setSelected] = useState<PreparedBatch | null>(null)
  const [selectedMealType, setSelectedMealType] = useState<DishMealType>('lunch')
  const [grams, setGrams] = useState(0)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const nextBatches = await api.getPreparedBatches()
      setBatches(nextBatches)
      onCountChange?.(mealType ? nextBatches.filter(batch => batch.dish.meal_types.includes(mealType)).length : nextBatches.length)
    } catch {
      showToast('Errore caricamento piatti preparati')
    }
  }, [showToast, onCountChange, mealType])

  useEffect(() => { void refresh() }, [refresh])

  async function consume() {
    if (!selected || !Number.isFinite(grams) || grams <= 0 || grams > selected.remaining_g || busy) return
    setBusy(true)
    try {
      await api.consumePreparedBatch(selected.id, selectedDate, mealType ?? selectedMealType, grams)
      if (onConsumed) await onConsumed()
      else await fetchForDate(selectedDate)
      await refresh()
      setSelected(null)
      setGrams(0)
      showToast('Porzione registrata')
    } catch {
      showToast('Errore registrazione porzione')
    } finally {
      setBusy(false)
    }
  }

  async function closeBatch(batch: PreparedBatch) {
    if (!window.confirm(`Concludere “${batch.dish.name}”? Il resto non sarà più tra i piatti pronti.`)) return
    try {
      await api.closePreparedBatch(batch.id)
      setSelected(null)
      await refresh()
      showToast('Preparazione conclusa')
    } catch {
      showToast('Errore chiusura preparazione')
    }
  }

  const visibleBatches = mealType ? batches.filter(batch => batch.dish.meal_types.includes(mealType)) : batches
  if (visibleBatches.length === 0) return null

  return <section className={compact ? 'space-y-2' : 'space-y-3'}>
    {!compact && <div className="px-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Pronti da mangiare</p>
      <p className="text-xs text-gray-500">Preparazioni con una quantità rimasta</p>
    </div>}
    {visibleBatches.map(batch => <div key={batch.id} className={`rounded-2xl border ${compact ? 'border-gray-700/70 bg-gray-900/30 p-2 transition hover:border-primary-600' : 'border-primary-700/40 bg-primary-950/20 p-3'}`}>
      <button type="button" onClick={() => { if (onSelect) onSelect(batch); else { setSelected(batch); setGrams(0) } }}
        className={`flex w-full items-center text-left ${compact ? 'gap-3 rounded-xl p-2' : 'gap-3'}`}>
        <span className={compact ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 text-xl' : 'text-2xl'}>{batch.dish.icon ?? '🍲'}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${compact ? 'text-sm' : ''}`}>{batch.dish.name}</span>
          <span className="block text-xs text-gray-400">{formatDecimal(batch.remaining_g)} g rimasti · {formatDecimal(batch.dish.items.reduce((sum, item) => sum + item.calories, 0) * batch.remaining_g / batch.total_cooked_g)} kcal</span>
          {compact && <span className="mt-0.5 block text-[11px] font-medium text-primary-400">Pronto da mangiare</span>}
        </span>
        <span className="text-primary-400">›</span>
      </button>
      {!onSelect && selected?.id === batch.id && <div className="mt-3 space-y-3 border-t border-gray-700 pt-3">
        {!mealType && <label className="block text-xs text-gray-400">Quando lo mangi?
          <select value={selectedMealType} onChange={event => setSelectedMealType(event.target.value as DishMealType)}
            className="mt-1 w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm">
            {DISH_MEAL_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select>
        </label>}
        <PreparedPortionInput totalCookedG={batch.total_cooked_g} remainingG={batch.remaining_g}
          value={grams} onChange={setGrams} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button type="button" onClick={() => void consume()} disabled={busy || grams <= 0 || grams > batch.remaining_g}
            className="rounded-xl bg-primary-600 px-3 py-2.5 text-sm font-semibold disabled:opacity-40">Registra porzione</button>
          <button type="button" onClick={() => void closeBatch(batch)} disabled={busy}
            className="rounded-xl border border-gray-700 px-3 py-2.5 text-xs text-gray-400 disabled:opacity-40">Concludi</button>
        </div>
      </div>}
    </div>)}
  </section>
}
