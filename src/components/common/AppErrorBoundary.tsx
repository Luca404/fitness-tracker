import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('fitTrackr: errore della pagina', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return <div role="alert" className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-semibold">Non è stato possibile aprire questa pagina.</p>
      <p className="text-sm text-gray-400">Controlla la connessione e ricarica l’app per riprovare.</p>
      <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Ricarica app</button>
      <a href="/meals" className="text-sm text-primary-400">Torna ai pasti</a>
    </div>
  }
}
