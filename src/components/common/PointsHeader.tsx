import { Link } from 'react-router-dom'
import { useFitnessPoints } from '../../contexts/FitnessPointsContext'

export function PointsIcon({ streak = false }: { streak?: boolean }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={streak ? 'M12 3c1 5-4 6-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s5 3 5 7a8 8 0 0 1-16 0C4 10 11 9 12 3Z' : 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'} />
  </svg>
}

export default function PointsHeader() {
  const points = useFitnessPoints()
  if (!points) return null
  const active = points?.data?.enabled ? points.data : null
  return <Link to="/points" className="inline-flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold tabular-nums transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 lg:w-full lg:justify-between lg:border lg:border-gray-700 lg:px-3"
    aria-label={active ? `${active.total.toLocaleString('it-IT')} punti totali, streak di ${active.streak} giorni. Apri riepilogo punti` : 'Apri riepilogo punti e streak'}>
    <span className="inline-flex items-center gap-1.5 text-primary-300"><PointsIcon />
      {points?.loading ? '…' : points?.error ? '—' : active ? active.total.toLocaleString('it-IT') : '0'}
      <span className="hidden text-xs lg:inline">PT</span>
    </span>
    <span className="inline-flex items-center gap-1 text-amber-300"><PointsIcon streak />{points?.loading ? '…' : points?.error ? '—' : active?.streak ?? 0}</span>
  </Link>
}
