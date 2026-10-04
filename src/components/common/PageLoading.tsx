import { useEffect, useState } from 'react'

export default function PageLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15_000)
    return () => clearTimeout(timer)
  }, [])

  return <div role="status" className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-6 text-center">
    <p className="text-gray-400">Caricamento…</p>
    {slow && <>
      <p className="text-sm text-gray-500">Il caricamento sta richiedendo più tempo del previsto.</p>
      <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Ricarica app</button>
    </>}
  </div>
}
