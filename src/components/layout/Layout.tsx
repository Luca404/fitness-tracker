import { NavLink, Outlet } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import Toast from '../common/Toast'

const NAV = [
  { to: '/meals',   label: 'Meals',   icon: '🍽️' },
  { to: '/workout', label: 'Workout', icon: '💪' },
  { to: '/history', label: 'History', icon: '📈' },
  { to: '/settings',label: 'Settings',icon: '⚙️' },
]

export default function Layout() {
  const { toast } = useData()

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-gray-800 border-t border-gray-700">
        <div className="flex">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-gray-400'
                }`
              }
            >
              <span className="text-xl">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      {toast && <Toast message={toast} />}
    </div>
  )
}
