import { Link, useSearchParams } from 'react-router-dom'
import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { useFitnessPoints } from '../contexts/FitnessPointsContext'
import type { ActiveFitnessPoints, PointsAward, PointsDay } from '../services/fitnessPoints'
import { MET_ACTIVITIES } from '../utils/met'
import { formatDecimal } from '../utils/decimal'
import DaySelector from '../components/common/DaySelector'
import { useSettings } from '../contexts/SettingsContext'
import Leaderboard from '../components/points/Leaderboard'

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toLocaleString('it-IT')}`
const displayDate = (value: string) => format(new Date(`${value}T12:00:00`), 'EEE d MMM', { locale: it })

function awardNote({ detail: d }: PointsAward) {
  return d.status === 'incomplete' ? 'Dati incompleti' : d.status === 'pending' ? (d.weekly ? 'A fine periodo' : 'A fine giornata') : d.status === 'insufficient' ? 'Dati del periodo insufficienti'
    : d.status === 'missed' ? 'Obiettivo non raggiunto' : d.status === 'target' ? 'Obiettivo da raggiungere' : d.capped ? 'Tetto movimento raggiunto' : null
}

function WellbeingTable({ awards }: { awards: PointsAward[] }) {
  return <table aria-label="Punti benessere" className="mt-6 w-full text-sm">
    <thead><tr className="text-xs uppercase tracking-wider text-gray-400">
      <th scope="col" className="pb-2 text-left font-semibold">Benessere</th>
      <th scope="col" className="pb-2 text-right font-semibold">PT</th>
    </tr></thead>
    <tbody className="divide-y divide-gray-700/60">{awards.map(award => <tr key={award.key}>
      <th scope="row" className="py-2 text-left font-normal text-gray-200">{award.label}</th>
      <td className={`py-2 text-right font-bold tabular-nums ${award.points < 0 ? 'text-orange-300' : award.points > 0 ? 'text-primary-300' : 'text-gray-500'}`}>
        {signed(award.points)}
        {awardNote(award) && <span className="sr-only"> {awardNote(award)}</span>}
      </td>
    </tr>)}</tbody>
  </table>
}

function AwardRow({ award }: { award: PointsAward }) {
  const d = award.detail
  const name = award.kind === 'activity' ? MET_ACTIVITIES[award.label]?.label ?? award.label : award.label
  const note = awardNote(award)
  return <li className="flex items-start justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-200">{name}</p>
      {d.target != null && <p className="mt-1 text-xs text-gray-400">{d.partial && d.value != null ? '≥ ' : ''}{d.value == null ? '—' : formatDecimal(d.value)} / {formatDecimal(d.target)} {d.unit}{d.weekly ? ' nel periodo' : ''}</p>}
      {d.minutes != null && <p className="mt-1 text-xs text-gray-400">{formatDecimal(d.minutes)} min{d.km != null ? ` · ${formatDecimal(d.km)} km` : ''}{d.met != null ? ` · ${formatDecimal(d.met)} MET` : ''}{d.kcal != null ? ` · ≈ ${d.kcal} kcal` : ''}</p>}
      {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
    </div>
    <span className={`shrink-0 text-sm font-bold tabular-nums ${award.points < 0 ? 'text-orange-300' : award.points > 0 ? 'text-primary-300' : 'text-gray-500'}`}>{signed(award.points)} <span className="text-xs font-normal">PT</span></span>
  </li>
}

function DayDetail({ day, data }: { day: PointsDay; data: ActiveFitnessPoints }) {
  const { setSelectedDate } = useSettings()
  const elapsed = differenceInCalendarDays(new Date(`${day.date}T12:00:00`), new Date(`${data.started_on}T12:00:00`))
  const checkpoint = format(addDays(new Date(`${day.date}T12:00:00`), 6 - elapsed % 7), 'yyyy-MM-dd')
  const groups = [
    { label: 'Diario e costanza', kinds: ['diary', 'streak'] },
    { label: 'Benessere', kinds: ['habit', 'penalty'] },
    { label: 'Attività e allenamenti', kinds: ['activity', 'gym'] },
  ]
  return <section className="card min-w-0" aria-labelledby="points-day-title">
    <div className="flex items-start justify-between gap-3">
      <div><h2 id="points-day-title" className="text-xl font-bold capitalize">{displayDate(day.date)}</h2>
        <p className="mt-1 text-xs text-gray-400">{day.registered ? 'Diario registrato' : `${Math.min(day.meal_count,2)} di 2 momenti alimentari`}</p>
      </div>
      <span className="text-2xl font-bold tabular-nums">{signed(day.points)} <small className="text-xs font-medium text-gray-400">PT</small></span>
    </div>
    {!day.registered && <Link to="/meals" onClick={() => setSelectedDate(day.date)} className="mt-3 inline-flex min-h-11 items-center text-sm text-primary-300">Completa il diario →</Link>}
    {groups.map(group => {
      const awards = day.awards.filter(a => group.kinds.includes(a.kind))
      if (group.label === 'Benessere') return <WellbeingTable key={group.label} awards={awards} />
      return <div key={group.label} className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{group.label}</h3>
        {awards.length > 0 ? <ul className="mt-1 divide-y divide-gray-700/60">{awards.map(award => <AwardRow key={`${award.kind}:${award.key}`} award={award} />)}</ul>
          : <p className="mt-3 text-sm text-gray-400">Nessuna attività o allenamento concluso.</p>}
      </div>
    })}
    <p className="mt-4 border-t border-gray-700 pt-4 text-xs text-gray-400">Checkpoint settimanale: {displayDate(checkpoint)}</p>
  </section>
}

function Rules({ data }: { data?: ActiveFitnessPoints }) {
  return <details className="card">
    <summary className="min-h-6 cursor-pointer text-sm font-semibold">Come si guadagnano i punti</summary>
    <dl className="mt-4 space-y-4 text-sm">
      <div><dt className="font-semibold text-gray-200">Diario · 2 PT al giorno</dt><dd className="mt-1 leading-relaxed text-gray-400">Punti automatici appena registri almeno due momenti alimentari validi. Nessun minimo di calorie da mangiare.</dd></div>
      <div><dt className="font-semibold text-gray-200">Costanza · +2 / +4 / +10 PT</dt><dd className="mt-1 leading-relaxed text-gray-400">+2 al terzo giorno consecutivo, +4 ogni sette giorni consecutivi e +10 al trentesimo. Saltare un giorno interrompe la streak e conserva i punti già ottenuti.</dd></div>
      <div><dt className="font-semibold text-gray-200">Benessere · +1 / −1 PT per obiettivo</dt><dd className="mt-1 leading-relaxed text-gray-400">Verdura ≥400 g, frutta ≥360 g e fibre ≥25 g. Sale ≤5 g, zuccheri totali{data ? ` ≤${formatDecimal(data.sugars_target)} g` : ' entro il riferimento personale'} e alcol{data ? ` ≤${data.alcohol_target} UA` : ' entro il riferimento personale'} danno punti a fine giornata, con almeno due momenti alimentari e dati completi. Verdura, frutta e fibre si valutano a fine giornata: +1 PT se raggiunte, −1 PT se mancate con dati sufficienti. Legumi ≥450 g e pesce ≥300 g: +3 PT ciascuno alla fine di ogni periodo di sette giorni dall’inizio del conteggio; −3 PT ciascuno se mancati in un periodo registrato.</dd></div>
      <div><dt className="font-semibold text-gray-200">Sale, zuccheri e alcol · penalità progressive</dt><dd className="mt-1 leading-relaxed text-gray-400">Qualsiasi superamento costa almeno 1 PT. Con limite sale di 5 g: oltre 5 g costa 1 PT, da 10 g costa 2 PT, da 15 g costa 3 PT, e così via. Le detrazioni si calcolano a fine giornata sulle quantità note, anche se il diario è incompleto; se il riferimento alcol è zero, qualsiasi quantità nota costa almeno 1 PT, poi un punto per ogni UA intera.</dd></div>
      <div><dt className="font-semibold text-gray-200">Attività · minuti, intensità e km</dt><dd className="mt-1 leading-relaxed text-gray-400">Minuti × MET ÷ 100, più punti per km: camminata 0,1, corsa 0,2, ciclismo 0,05, tapis roulant 0,15. Il risultato viene arrotondato al punto intero sul cumulato del movimento. I MET stimano l’intensità dal tipo di attività e, se disponibile, dalla velocità. Contributo limitato a 120 minuti e 100 km per attività.</dd></div>
      <div><dt className="font-semibold text-gray-200">Allenamenti · tempo e calorie stimate</dt><dd className="mt-1 leading-relaxed text-gray-400">0,04 × minuti + 0,003 × kcal stimate, arrotondati al punto intero sul cumulato del movimento. Serve una sessione conclusa con almeno una serie svolta. Contributo limitato a 120 minuti e 1.200 kcal; sessioni oltre quattro ore non danno punti. Gli intervalli sovrapposti fra sessioni palestra contano una sola volta.</dd></div>
      <div><dt className="font-semibold text-gray-200">Movimento · massimo 12 PT al giorno</dt><dd className="mt-1 leading-relaxed text-gray-400">Tetto condiviso fra attività e palestra. Registra ogni allenamento una sola volta. Non ci sono penalità per il riposo, né punti per il peso perso o per mangiare meno.</dd></div>
    </dl>
    <p className="mt-5 border-t border-gray-700 pt-4 text-xs leading-relaxed text-gray-400">{data ? `Punti dal ${displayDate(data.started_on)} · ${data.timezone}. ` : ''}Il saldo minimo è zero. I punti non sono una valutazione della salute.</p>
  </details>
}

export default function PointsPage() {
  const points = useFitnessPoints()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedDate } = useSettings()
  const showLeaderboard = searchParams.get('tab') === 'leaderboard'
  if (!points) return null
  const { data, loading, error } = points
  const active = data ?? undefined
  const routeDate = searchParams.get('date')
  const selectorDate = active?.selected_date ?? (routeDate && /^\d{4}-\d{2}-\d{2}$/.test(routeDate) && isValid(parseISO(routeDate)) ? routeDate : selectedDate)
  function selectDate(date: string) {
    setSearchParams(previous => { const next = new URLSearchParams(previous); next.set('date', date); return next })
    document.getElementById('main-content')?.scrollTo({ top: 0 })
  }
  return <div className="desktop-page space-y-5 p-4 pb-24">
    {!showLeaderboard && <div className="desktop-date"><DaySelector date={selectorDate} onChange={selectDate} /></div>}
    <h1 className="text-xl font-bold lg:hidden">Punti e costanza</h1>
    <nav aria-label="Sezioni punti" className="flex gap-1 rounded-xl bg-gray-800 p-1">
      {[{ label: 'I miei punti', value: 'personal' }, { label: 'Classifica', value: 'leaderboard' }].map(tab => {
        const selected = showLeaderboard === (tab.value === 'leaderboard')
        const params = new URLSearchParams(searchParams)
        if (tab.value === 'leaderboard') params.set('tab', 'leaderboard')
        else params.delete('tab')
        return <Link key={tab.value} to={{ pathname: '/points', search: params.toString() }} aria-current={selected ? 'page' : undefined}
          className={`flex min-h-12 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 ${selected ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>{tab.label}</Link>
      })}
    </nav>
    {showLeaderboard ? <Leaderboard total={active?.total} /> : <>
    {error ? <div role="alert" className="card space-y-3"><p className="text-sm text-orange-300">{error}</p><button className="btn-secondary min-h-11" onClick={() => void points.refresh()}>Riprova</button></div>
      : !active ? <p role="status" className="py-8 text-sm text-gray-400">Caricamento punti…</p> : <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Riepilogo punti">
            {[
              { label: 'Punti totali', value: active.total.toLocaleString('it-IT'), color: 'text-primary-300' },
              { label: 'Streak attuale', value: `${active.streak} ${active.streak === 1 ? 'giorno' : 'giorni'}`, color: 'text-amber-300' },
              { label: 'Record streak', value: `${active.best_streak} ${active.best_streak === 1 ? 'giorno' : 'giorni'}`, color: 'text-gray-100' },
              { label: 'Giorni registrati', value: active.registered_days.toLocaleString('it-IT'), color: 'text-gray-100' },
            ].map(metric => <div key={metric.label} className="rounded-2xl border border-gray-700/70 bg-gray-800/60 p-4"><p className="text-xs text-gray-400">{metric.label}</p><p className={`mt-2 text-2xl font-bold tabular-nums ${metric.color}`}>{metric.value}</p></div>)}
          </section>
          {loading && <span role="status" className="text-xs text-gray-400">Aggiorno…</span>}
          {active.day ? <DayDetail key={active.day.date} day={active.day} data={active} />
            : <div className="card text-sm text-gray-400">Data fuori dal periodo punti. Inizio: {displayDate(active.started_on)}.</div>}
          {active.net_total < 0 && <p className="text-xs text-gray-400">Saldo netto: {signed(active.net_total)} PT</p>}
        </>}
    <Rules data={active} />
    </>}
  </div>
}
