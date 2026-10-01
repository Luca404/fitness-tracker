import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import GymSessionView from '../components/workout/GymSessionView'
import { useData } from '../contexts/DataContext'
import { getGymSession } from '../services/gymApi'
import type { GymSession } from '../types'

export default function GymSessionPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useData()
  const [session, setSession] = useState<GymSession | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let current = true
    if (!sessionId) return
    getGymSession(sessionId).then(result => {
      if (current) setSession(result)
    }).catch(() => {
      if (current) setError(true)
    })
    return () => { current = false }
  }, [sessionId])

  function back() {
    navigate('/fitness')
  }

  return <div className="mx-auto flex h-dvh max-w-md flex-col bg-gray-900 text-white">
    <main className="flex-1 overflow-y-auto overscroll-none p-4 pb-8 safe-area-pb">
      {error || !sessionId ? <div className="space-y-4 rounded-2xl border border-gray-700 p-5">
        <p className="text-sm text-gray-300">Impossibile caricare la sessione.</p>
        <button type="button" onClick={back} className="text-sm font-semibold text-primary-400">← Allenamenti</button>
      </div> : session ? <GymSessionView session={session} onBack={back}
        onCompleted={async () => { showToast('Allenamento completato'); back() }}
        onDeleted={async () => { showToast('Sessione eliminata'); back() }} />
        : <div className="h-32 animate-pulse rounded-2xl bg-gray-800" aria-label="Caricamento allenamento" />}
    </main>
  </div>
}
