import { BarChart3, ChevronDown, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useUser } from '../context/UserContext'

const navItems = [
  { to: '/td/cohorts', label: 'Cohorts', icon: Users },
  { to: '/td/reports', label: 'Reports', icon: BarChart3 },
  { to: '/td/settings', label: 'Programme setup', icon: Settings },
]

export default function TDLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useUser()
  const [cohortOpen, setCohortOpen] = useState(false)

  if (!user || !user.roles.includes('td')) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex bg-[#f6f8fb]">
      <aside className="sticky top-0 h-screen w-64 shrink-0 bg-[#123b70] text-white flex flex-col print:hidden">
        <div className="h-20 px-6 flex items-center border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#123b70] font-extrabold">B</div>
          <div className="ml-3">
            <p className="text-sm font-semibold leading-tight">Bajaj Auto</p>
            <p className="text-[11px] text-blue-200">Talent Development</p>
          </div>
        </div>

        <div className="px-4 pt-5">
          <p className="px-2 text-[10px] font-semibold tracking-[0.14em] text-blue-300 uppercase mb-2">Workspace</p>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 px-3 py-3">
            <LayoutDashboard size={17} className="text-blue-200" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">TD Admin</p>
              <p className="text-[10px] text-blue-200">Programme operations</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 pt-6 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to === '/td/cohorts' && pathname.startsWith('/td/participants'))
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-white text-[#123b70] font-semibold' : 'text-blue-100 hover:bg-white/10'}`}>
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button onClick={() => setCohortOpen(!cohortOpen)} className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 text-left">
            <div className="w-8 h-8 rounded-full bg-blue-200 text-[#123b70] flex items-center justify-center text-xs font-bold">{user.initials}</div>
            <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{user.name}</p><p className="text-[10px] text-blue-200">TD administrator</p></div>
            <ChevronDown size={14} className={cohortOpen ? 'rotate-180' : ''} />
          </button>
          {cohortOpen && <button onClick={() => { logout(); navigate('/') }} className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-100 hover:bg-white/10 rounded-lg"><LogOut size={14} /> Sign out</button>}
        </div>
      </aside>
      <main className="min-w-0 flex-1"><Outlet /></main>
    </div>
  )
}
