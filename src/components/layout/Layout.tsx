import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import AppErrorBoundary from '../common/AppErrorBoundary'
import PageLoading from '../common/PageLoading'

const NAV = [
  { to: '/fitness', label: 'Fitness', icon: '💪', description: 'Allenamenti, schede e progressi.' },
  { to: '/kitchen', label: 'Cucina', icon: '🍳', description: 'I tuoi ingredienti e i tuoi piatti, in un unico posto.' },
  { to: '/meals', label: 'Pasti', icon: '🍽️', description: 'Il tuo diario alimentare, giorno per giorno.' },
  { to: '/weight', label: 'Peso', icon: '⚖️', description: 'Misurazioni e andamento del peso corporeo.' },
  { to: '/history', label: 'Storico', icon: '📈', description: 'Una panoramica della tua alimentazione e delle tue attività.' },
]

const ICON_PATHS: Record<string, string> = {
  '/fitness': 'M6 5v14M3 8v8M6 12h12M18 5v14M21 8v8',
  '/kitchen': 'M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9ZM2 9h20M8 5h8M10 2h4',
  '/meals': 'M4 3v5a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 8h5M19 3v18',
  '/weight': 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM7 9a6 6 0 0 1 10 0M12 7v6',
  '/history': 'M4 20V10M12 20V4M20 20v-7',
  '/settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
}

function NavigationIcon({ to, className }: { to: string; className?: string }) {
  return (
    <svg className={className} width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[to]} />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const page = location.pathname === '/settings'
    ? { label: 'Impostazioni', description: 'Il tuo profilo e i tuoi obiettivi personali.' }
    : location.pathname === '/meals/wellbeing'
      ? { label: 'Buone abitudini', description: 'Il dettaglio delle tue abitudini alimentari.' }
      : NAV.find(item => location.pathname.startsWith(item.to)) ?? NAV[2]

  return (
    <div className="app-shell flex h-dvh max-w-md flex-col mx-auto bg-gray-900 text-white lg:max-w-none">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-3">
        Vai al contenuto
      </a>
      <header className="app-sidebar z-10 flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-4">
        <button
          type="button"
          onClick={() => navigate('/meals')}
          className="app-brand flex items-center gap-3 font-display text-xl font-bold text-primary-400 transition-colors hover:text-primary-300"
        >
          <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-primary-500/10 ring-1 ring-primary-500/20 lg:flex" aria-hidden="true">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 4c-9-1-15 2-15 8a6 6 0 0 0 6 6c6 0 9-6 9-14ZM3 21 15 9" />
            </svg>
          </span>
          fitTrackr
        </button>
        <nav aria-label="Navigazione principale" className="app-navigation fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-800 bg-gray-900 safe-area-pb">
          <div className="app-nav-list flex h-16 items-center justify-around">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `app-nav-link flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                    isActive ? 'text-primary-400' : 'text-gray-500'
                  }`
                }
              >
                {({ isActive }) => <>
                  <span className={`mb-0.5 flex h-9 w-12 items-center justify-center rounded-2xl text-2xl transition-colors lg:hidden ${isActive ? 'bg-primary-500/15 ring-1 ring-primary-500/25' : ''}`}
                    aria-hidden="true">{icon}</span>
                  <NavigationIcon to={to} className="hidden shrink-0 lg:block" />
                  <span className="text-xs lg:text-sm">{label}</span>
                </>}
              </NavLink>
            ))}
          </div>
        </nav>
        <NavLink
          to="/settings"
          aria-label="Impostazioni"
          className={({ isActive }) => `app-settings inline-flex h-6 w-6 items-center justify-center gap-3 transition-colors hover:text-gray-200 ${isActive ? 'text-primary-400' : 'text-gray-400'}`}
          title="Impostazioni"
        >
          <NavigationIcon to="/settings" className="shrink-0" />
          <span className="hidden text-sm lg:inline">Impostazioni</span>
        </NavLink>
      </header>

      <main id="main-content" tabIndex={-1} className="desktop-main min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-none outline-none">
        <div className={`app-content ${location.pathname === '/meals' ? 'app-content-meals' : ''}`}>
          <div className="desktop-page-heading hidden lg:block">
            <h1 className="text-3xl font-bold tracking-tight">{page.label}</h1>
            <p className="mt-2 text-sm text-gray-400">{page.description}</p>
          </div>
          <AppErrorBoundary key={`${location.pathname}${location.search}`}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </AppErrorBoundary>
        </div>
      </main>
    </div>
  )
}
