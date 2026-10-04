/// <reference types="vite-plugin-pwa/react" />
import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function PwaUpdateNotice() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [failed, setFailed] = useState(false)
  if (!needRefresh) return null
  return <div role="status" className="fixed inset-x-4 top-4 z-[110] mx-auto max-w-md rounded-xl border border-primary-700 bg-gray-800 p-4 shadow-xl">
    <p className="text-sm">{failed ? 'Aggiornamento non riuscito. Riprova quando sei online.' : 'È disponibile una nuova versione di fitTrackr.'}</p>
    <div className="mt-3 flex gap-3">
      <button type="button" className="btn-primary text-sm" onClick={() => {
        void updateServiceWorker(true).catch(() => setFailed(true))
      }}>Aggiorna</button>
      <button type="button" className="text-sm text-gray-400" onClick={() => setNeedRefresh(false)}>Più tardi</button>
    </div>
  </div>
}
