import type { MealEntry } from '../../types'
import { getMealEntryTotals } from '../../utils/mealEntries'
import { getFoodIcon } from '../../utils/foodIcons'
import { alcoholStrength } from '../../utils/alcohol'
import { formatDecimal } from '../../utils/decimal'

interface Props {
  entry: MealEntry
  onOpen: () => void
}

export default function MealEntryCard({ entry, onOpen }: Props) {
  const totals = getMealEntryTotals(entry)
  const strength = entry.items.length === 1 ? alcoholStrength(entry.items[0]) : null
  const quantityLabel = entry.cooked_portion_g != null
    ? `${formatDecimal(entry.cooked_portion_g)} g da cotto`
    : [totals.weight > 0 || totals.volumeMl === 0 ? `${formatDecimal(totals.weight)} g` : null,
      totals.volumeMl > 0 ? `${formatDecimal(totals.volumeMl)} ml` : null].filter(Boolean).join(' + ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-gray-700/80 bg-gray-800/80 p-3.5 text-left transition hover:border-primary-700 hover:bg-gray-700/60 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-xl ring-1 ring-primary-500/20">
          {entry.dish_icon || getFoodIcon(entry.items)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-gray-100">{entry.name}</p>
            <span className="shrink-0 font-semibold text-primary-400">{formatDecimal(totals.calories)} kcal</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {quantityLabel}{strength != null && <> · {formatDecimal(strength)}% vol</>} · P {formatDecimal(totals.protein)}g · C {formatDecimal(totals.carbs)}g · G {formatDecimal(totals.fat)}g
          </p>
        </div>
        <svg className="h-4 w-4 shrink-0 text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
