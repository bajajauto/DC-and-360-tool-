import { LogOut, UsersRound } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const navItems = [
  { to: '/assessor/candidates', label: 'Candidate Profiles', icon: UsersRound },
]

export default function AssessorLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useUser()

  if (!user || !user.roles.includes('assessor')) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex bg-[#f6f8fb]">
      <aside className="sticky top-0 h-screen w-64 shrink-0 bg-[#173f72] text-white flex flex-col">
        <div className="h-20 px-6 flex items-center border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#173f72] font-extrabold">B</div>
          <div className="ml-3">
            <p className="text-sm font-semibold leading-tight">Bajaj Auto</p>
            <p className="text-[11px] text-blue-200">Assessor Workspace</p>
          </div>
        </div>

        <nav className="flex-1 px-4 pt-5 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link key={to} to={to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? 'bg-white text-[#173f72] font-semibold' : 'text-blue-100 hover:bg-white/10'}`}>
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="w-full flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-200 text-[#173f72] flex items-center justify-center text-xs font-bold">{user.initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
              <p className="text-[10px] text-blue-200">DC assessor</p>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/') }} className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-100 hover:bg-white/10 rounded-lg">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
