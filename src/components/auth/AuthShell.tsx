import type { ReactNode } from 'react'
import Icon from '../common/Icon'

export default function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-shell">
    <div className="auth-layout">
      <div>
        <div className="brand auth-brand"><Icon name="leaf" /><span>fitTrackr</span></div>
        <div className="auth-editorial">
          <h2>Il tuo diario,<br />il tuo ritmo.</h2>
          <p>Pasti, allenamenti e benessere.<br />Uno spazio per prenderti cura di te,<br />un giorno alla volta.</p>
          <div className="auth-topics"><span>Alimentazione</span><span>Movimento</span><span>Equilibrio</span></div>
        </div>
      </div>
      <div className="auth-form">
        {children}
        <p className="auth-footnote">Un solo account per le app Trackrs.</p>
      </div>
    </div>
  </main>
}
