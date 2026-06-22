import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const navItems = [
  { to: '/respondent/dashboard', label: 'My Feedback Tasks', icon: TasksIcon },
]

function TasksIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8h6m-6 4h4" />
    </svg>
  )
}

export default function RespondentLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, switchRole, pendingParticipantCount } = useUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!user) {
    return <Navigate to="/" replace />
  }

  const isParticipantToo = user.roles.includes('participant')

  function handleSwitchToParticipant() {
    setDropdownOpen(false)
    switchRole('participant')
    navigate('/participant/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-[#f8f9fc]">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-60 shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1e4d8c] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1a1f2e] leading-tight">Bajaj Auto</p>
              <p className="text-[10px] text-gray-400 leading-tight">DC Tool</p>
            </div>
          </div>
        </div>

        {/* Role switcher dropdown */}
        {isParticipantToo && (
          <div className="px-3 pt-3 pb-1 relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">View</p>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
              <span className="text-[11px] font-semibold text-violet-700 flex-1 text-left tracking-wide">360 Respondent</span>
              {pendingParticipantCount > 0 && (
                <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                  {pendingParticipantCount}
                </span>
              )}
              <svg
                className={`w-3.5 h-3.5 text-violet-600 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-3 right-3 top-[calc(100%-4px)] mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-30 overflow-hidden">
                {/* Current — Respondent */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-violet-50 border-b border-[#e2e8f0]">
                  <svg className="w-3.5 h-3.5 text-violet-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-violet-700">360 Respondent</p>
                    <p className="text-[10px] text-violet-400">Current view</p>
                  </div>
                </div>
                {/* Switch to — Participant */}
                <button
                  onClick={handleSwitchToParticipant}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium text-gray-700 group-hover:text-[#1e4d8c]">DC Participant</p>
                    {pendingParticipantCount > 0 && (
                      <p className="text-[10px] text-amber-500">{pendingParticipantCount} pending</p>
                    )}
                  </div>
                  {pendingParticipantCount > 0 && (
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                      {pendingParticipantCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1f2e]'
                }`}
              >
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User card */}
        <div className="shrink-0 px-3 py-4 border-t border-[#e2e8f0]">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#1e4d8c] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#1a1f2e] truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.employeeId}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-2 px-3 py-1.5 mt-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 overflow-auto" onClick={() => setDropdownOpen(false)}>
        {/* DC journey pending alert — kept minimal */}
        {isParticipantToo && pendingParticipantCount > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-3">
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-amber-700 flex-1">
              You have <span className="font-semibold">{pendingParticipantCount} pending tasks</span> in your DC journey.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); handleSwitchToParticipant() }}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
            >
              Go to Participant View →
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
