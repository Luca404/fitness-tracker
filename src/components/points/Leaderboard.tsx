import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getFitnessLeaderboard, LEADERBOARD_PAGE_SIZE } from '../../services/fitnessLeaderboard'
import type { FitnessLeaderboard, LeaderboardEntry } from '../../services/fitnessLeaderboard'

function ScoreRow({ entry }: { entry: LeaderboardEntry }) {
  return <div className={`flex min-h-16 items-center gap-3 rounded-xl px-3 py-3 ${entry.is_me ? 'bg-primary-500/10 ring-1 ring-inset ring-primary-500/30' : ''}`}>
    <span className={`w-10 shrink-0 text-center text-lg font-bold tabular-nums ${entry.rank === 1 ? 'text-amber-300' : entry.rank <= 3 ? 'text-primary-300' : 'text-gray-400'}`}>
      <span className="sr-only">Posizione </span>{entry.rank}
    </span>
    <span className="min-w-0 flex-1 break-all text-sm font-medium">{entry.username}{entry.is_me && <span className="ml-2 inline-block rounded bg-primary-500/20 px-1.5 py-0.5 text-xs text-primary-300">Tu</span>}</span>
    <span className="shrink-0 text-right font-bold tabular-nums">{entry.total.toLocaleString('it-IT')} <small className="text-xs font-normal text-gray-400">PT</small></span>
  </div>
}

function LeaderboardContent({ total }: { total?: number }) {
  const [offset, setOffset] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<{ key: string; data: FitnessLeaderboard | null; error: boolean } | null>(null)
  const key = `${offset}:${attempt}:${total}`
  useEffect(() => {
    let active = true
    getFitnessLeaderboard(offset).then(data => {
      if (active) setState({ key, data, error: false })
    }).catch(() => { if (active) setState({ key, data: null, error: true }) })
    return () => { active = false }
  }, [offset, key])
  useEffect(() => {
    const refresh = () => setAttempt(n => n + 1)
    window.addEventListener('focus', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => { window.removeEventListener('focus', refresh); window.clearInterval(timer) }
  }, [])
  const loading = state?.key !== key
  const data = state?.key === key ? state.data : null
  return <section className="space-y-5" aria-labelledby="leaderboard-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="leaderboard-title" className="text-lg font-bold">Classifica generale</h2>
        <p className="mt-1 text-sm text-gray-400">Punti totali · a parità di punti, stessa posizione.</p></div>
      <button type="button" className="btn-secondary min-h-11 disabled:opacity-50" disabled={loading} onClick={() => setAttempt(n => n + 1)}>Aggiorna</button>
    </div>
    {loading ? <p role="status" className="py-8 text-sm text-gray-400">Caricamento classifica…</p>
      : state?.error ? <div role="alert" className="card space-y-3"><p className="text-sm text-orange-300">Impossibile caricare la classifica.</p><button type="button" className="btn-secondary min-h-11" onClick={() => setAttempt(n => n + 1)}>Riprova</button></div>
      : data && <>
        {data.me && <div className="card space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-primary-400">La tua posizione</h3>
          <ScoreRow entry={data.me} />
          <Link to="/settings" className="inline-flex min-h-11 items-center text-sm text-primary-300">Modifica nome utente →</Link>
        </div>}
        <div className="card min-w-0">
          <p className="mb-3 text-sm text-gray-400">{data.total_users.toLocaleString('it-IT')} {data.total_users === 1 ? 'partecipante' : 'partecipanti'}</p>
          {data.entries.length ? <ol aria-label="Classifica utenti" className="space-y-1">{data.entries.map(entry => <li key={entry.username}><ScoreRow entry={entry} /></li>)}</ol>
            : <p className="py-5 text-sm text-gray-400">{data.total_users ? 'Nessun utente in questa pagina.' : 'La classifica è ancora vuota.'}</p>}
          {(offset > 0 || data.has_more) && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-700 pt-3">
            <button type="button" className="min-h-11 text-sm text-primary-300 disabled:text-gray-500" disabled={offset === 0} onClick={() => setOffset(n => Math.max(0, n - LEADERBOARD_PAGE_SIZE))}>← Precedenti</button>
            <span className="text-xs text-gray-400">Pagina {offset / LEADERBOARD_PAGE_SIZE + 1}</span>
            <button type="button" className="min-h-11 text-sm text-primary-300 disabled:text-gray-500" disabled={!data.has_more} onClick={() => setOffset(n => n + LEADERBOARD_PAGE_SIZE)}>Successivi →</button>
          </div>}
        </div>
        <p className="text-xs leading-relaxed text-gray-400">Partecipano tutti gli utenti di FitTrackr con un profilo completato. I punti si ricalcolano anche dopo modifiche al diario.</p>
      </>}
  </section>
}

export default function Leaderboard({ total }: { total?: number }) {
  const { user } = useAuth()
  return user ? <LeaderboardContent key={user.id} total={total} /> : null
}
