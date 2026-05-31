import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: string
}

const masterNav: NavItem[] = [
  { to: '/master/dashboard', label: 'Dashboard KPI', icon: '📊' },
  { to: '/master/assignments', label: 'Assegnazioni', icon: '📋' },
  { to: '/master/problems', label: 'Problematiche', icon: '🔴' },
  { to: '/master/reports', label: 'Report', icon: '📄' },
  { to: '/master/areas', label: 'Aree competenza', icon: '🏷️' },
  { to: '/master/sessions', label: 'Sessioni', icon: '📅' },
  { to: '/master/activities', label: 'Attività', icon: '✏️' },
  { to: '/master/users', label: 'Utenti', icon: '👥' },
]

const userNav: NavItem[] = [
  { to: '/user/activities', label: 'Le mie attività', icon: '📋' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const nav = user?.ruolo === 'MASTER' ? masterNav : userNav

  return (
    <aside className="w-60 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
          <div>
            <p className="text-sm font-semibold text-gray-100">KPI Formazione</p>
            <p className="text-xs text-gray-500">ERP Adoption</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300">
            {user?.nome?.[0]}{user?.cognome?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{user?.nome} {user?.cognome}</p>
            <p className="text-xs text-gray-500 truncate">{user?.ruolo}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span>→</span>
          <span>Esci</span>
        </button>
      </div>
    </aside>
  )
}
