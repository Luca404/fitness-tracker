import { Suspense, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import AppErrorBoundary from '../common/AppErrorBoundary'
import PageLoading from '../common/PageLoading'
import Icon, { type IconName } from '../common/Icon'

const NAV: { to: string; label: string; icon: IconName; order: number; desktopOnly?: boolean }[] = [
  { to: '/fitness', label: 'Fitness', icon: 'fitness', order: 3 },
  { to: '/kitchen', label: 'Cucina', icon: 'kitchen', order: 4 },
  { to: '/meals', label: 'Pasti', icon: 'meals', order: 1 },
  { to: '/meals/wellbeing', label: 'Benessere', icon: 'heart', order: 2, desktopOnly: true },
  { to: '/weight', label: 'Peso', icon: 'weight', order: 5 },
  { to: '/history', label: 'Storico', icon: 'history', order: 6 },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [location.pathname])

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Vai al contenuto</a>
    <header className="app-header">
      <button onClick={() => navigate('/meals')} className="brand" aria-label="fitTrackr"><Icon name="leaf" /><span>fitTrackr</span></button>
      <button onClick={() => navigate('/settings')} className="mobile-settings icon-button" title="Impostazioni" aria-label="Impostazioni"><Icon name="settings" /></button>
    </header>
    <main ref={mainRef} id="main-content" className="app-main" tabIndex={-1}>
      <AppErrorBoundary key={`${location.pathname}${location.search}`}>
        <Suspense fallback={<PageLoading />}><Outlet /></Suspense>
      </AppErrorBoundary>
    </main>
    <nav className="app-navigation safe-area-pb" aria-label="Navigazione principale">
      {NAV.map(({ to, label, icon, order, desktopOnly }) => <NavLink key={to} to={to} end={to === '/meals'} style={{ '--nav-order': order } as CSSProperties}
        className={({ isActive }) => `nav-item ${desktopOnly ? 'nav-desktop-only' : ''} ${isActive ? 'nav-item-active' : ''} ${to === '/meals' && location.pathname === '/meals/wellbeing' ? 'nav-item-parent' : ''}`}>
        <Icon name={icon} /><span>{label}</span>
      </NavLink>)}
      <NavLink to="/settings" className={({ isActive }) => `nav-item nav-settings nav-desktop-only ${isActive ? 'nav-item-active' : ''}`}><Icon name="settings" /><span>Impostazioni</span></NavLink>
    </nav>
  </div>
}
