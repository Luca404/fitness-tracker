import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import Toast from '../common/Toast'

const NAV = [
  { to: '/meals',   label: 'Pasti',   icon: '🍽️' },
  { to: '/workout', label: 'Workout', icon: '💪' },
  { to: '/history', label: 'Storico', icon: '📈' },
]

export default function Layout() {
  const { toast } = useData()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col bg-gray-900 text-white max-w-md mx-auto" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 flex-shrink-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/meals')}
            className="text-xl font-bold text-primary-400 hover:text-primary-300 transition-colors"
          >
            fitTrackr
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex h-6 w-6 items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
            title="Impostazioni"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-none">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-900 border-t border-gray-800 z-40 safe-area-pb">
        <div className="flex justify-around items-center h-16">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-primary-400' : 'text-gray-500'
                }`
              }
            >
              <span className="text-2xl mb-1" aria-hidden="true">{icon}</span>
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {toast && <Toast message={toast} />}
    </div>
  )
}
