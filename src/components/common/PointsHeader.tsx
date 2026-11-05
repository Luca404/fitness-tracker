import { Link } from 'react-router-dom'
import { useFitnessPoints } from '../../contexts/FitnessPointsContext'

export function PointsIcon({ streak = false }: { streak?: boolean }) {
  return <svg className="block shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={streak ? 'M12 3c1 4-3 5-3 9a3 3 0 0 0 6 0c0-1-1-3-1-3s5 2 5 5a7 7 0 0 1-14 0c0-5 6-7 7-11Z' : 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z'} />
  </svg>
}

export default function PointsHeader() {
  const points = useFitnessPoints()
  if (!points) return null
  const active = points.summary
  return <Link to="/points" className="inline-flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold leading-none tabular-nums transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 lg:w-full lg:justify-between lg:border lg:border-gray-700 lg:px-3"
    aria-label={active ? `${active.total.toLocaleString('it-IT')} punti totali, streak di ${active.streak} giorni. Apri riepilogo punti` : 'Apri riepilogo punti e streak'}>
    <span className="inline-flex h-5 items-center gap-1.5 text-primary-300"><PointsIcon />
      {active ? active.total.toLocaleString('it-IT') : points.loading ? '…' : points.error ? '—' : '0'}
      <span className="hidden text-xs lg:inline">PT</span>
    </span>
    <span className="inline-flex h-5 items-center gap-1 text-amber-300"><PointsIcon streak />{active ? active.streak : points.loading ? '…' : points.error ? '—' : '0'}</span>
  </Link>
}
