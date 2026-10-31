import { format, addDays, subDays, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'

interface Props {
  date: string
  onChange: (date: string) => void
}

function cap(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

export default function DaySelector({ date, onChange }: Props) {
  const parsed = parseISO(date)
  const dayLabel = cap(format(parsed, 'EEEE', { locale: it }))
  const dateLabel = cap(format(parsed, 'd MMMM yyyy', { locale: it }))

  return (
    <div className="relative bg-gray-800 rounded-lg border border-gray-700 py-3 px-16 text-center">
      <button
        type="button"
        onClick={() => onChange(format(subDays(parsed, 1), 'yyyy-MM-dd'))}
        className="absolute left-0 top-0 bottom-0 w-16 flex items-center justify-center active:bg-gray-700 rounded-l-lg transition-all duration-75"
        aria-label="Giorno precedente"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="text-lg font-semibold text-white mb-0.5">{dayLabel}</div>
      <div className="text-sm text-gray-400">{dateLabel}</div>

      <button
        type="button"
        onClick={() => onChange(format(addDays(parsed, 1), 'yyyy-MM-dd'))}
        className="absolute right-0 top-0 bottom-0 w-16 flex items-center justify-center active:bg-gray-700 rounded-r-lg transition-all duration-75"
        aria-label="Giorno successivo"
      >
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
