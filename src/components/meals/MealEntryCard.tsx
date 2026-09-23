import type { MealEntry } from '../../types'
import { getMealEntryTotals } from '../../utils/mealEntries'
import { getFoodIcon } from '../../utils/foodIcons'

interface Props {
  entry: MealEntry
  onOpen: () => void
}

export default function MealEntryCard({ entry, onOpen }: Props) {
  const totals = getMealEntryTotals(entry)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-2xl border border-gray-700/80 bg-gray-800/80 p-3.5 text-left transition hover:border-primary-700 hover:bg-gray-700/60 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/10 text-xl ring-1 ring-primary-500/20">
          {getFoodIcon(entry.items)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-gray-100">{entry.name}</p>
            <span className="shrink-0 font-semibold text-primary-400">{Math.round(totals.calories)} kcal</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {Math.round(totals.weight)} g{totals.volumeMl > 0 ? ` + ${Math.round(totals.volumeMl)} ml` : ''} · P {Math.round(totals.protein)}g · C tot. {Math.round(totals.carbs)}g · G tot. {Math.round(totals.fat)}g
          </p>
        </div>
        <svg className="h-4 w-4 shrink-0 text-gray-600 transition group-hover:translate-x-0.5 group-hover:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
