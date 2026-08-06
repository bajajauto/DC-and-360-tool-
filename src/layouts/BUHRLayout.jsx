import { ClipboardList, FileText, LayoutDashboard, LogOut } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

const navItems = [
  { to: '/buhr/dashboard', label: 'BU Dashboard', icon: LayoutDashboard },
  { to: '/buhr/tracker', label: 'Trackers & Exports', icon: ClipboardList },
  { to: '/buhr/reports', label: 'Report Repository', icon: FileText },
]

export default function BUHRLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, switchRole } = useUser()

  if (!user || !user.roles.includes('buhr')) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-[#0f172a]">
      <header className="sticky top-0 z-30 h-[52px] border-b border-[#d5dce5] bg-white px-6 flex items-center gap-4">
        <img src={bajajBrandLockup} alt="Bajaj Auto" className="h-8 w-auto rounded" />
        <div className="h-5 w-px bg-slate-300" />
        <p className="text-xs tracking-wide text-slate-500">BUHR Workspace</p>
        <div className="flex-1" />
        {user.roles.includes('participant') && (
          <button
            type="button"
            onClick={() => { switchRole('participant'); navigate('/participant/dashboard') }}
            className="rounded-lg border border-[#bfdbfe] bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1e4d8c] hover:bg-blue-100"
          >
            Participant View
          </button>
        )}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#d6e4f7] bg-[#ebf2fa] px-3.5 py-1.5 text-xs font-semibold text-[#1e5fba]" title="Your mapped business unit">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
          {user.bu || 'Business Unit'}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e5fba] text-[11px] font-bold text-white">{user.initials}</span>
          <span>{user.name}</span>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-52px)]">
        <aside className="sticky top-[52px] h-[calc(100vh-52px)] w-[228px] shrink-0 border-r border-[#d5dce5] bg-white px-3 py-4">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Workspace</p>
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(`${to}/`)
              return (
                <Link
                  key={label}
                  to={to}
                  className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-[13px] transition-colors ${
                    active
                      ? 'border-[#d6e4f7] bg-[#ebf2fa] font-semibold text-[#1e5fba]'
                      : 'border-transparent text-slate-500 hover:bg-[#f4f7fb] hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-4 left-3 right-3 border-t border-[#d5dce5] pt-3">
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-xs font-medium text-slate-500 hover:bg-[#f4f7fb] hover:text-[#1e5fba]"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
