import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const navItems = [
  { to: '/participant/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/participant/photograph', label: 'Photograph', icon: CameraIcon },
  { to: '/participant/pre-work', label: 'Self Reflection', icon: ClipboardIcon },
  { to: '/participant/role-interview', label: 'Role Interview', icon: FileTextIcon },
  { to: '/participant/360-nominees', label: '360 Nominees', icon: UsersIcon },
  { to: '/participant/self-360', label: 'Self 360 Survey', icon: ClipboardIcon },
  { to: '/participant/360-status', label: '360 Status', icon: BarChartIcon },
  { to: '/participant/reports', label: 'My Reports', icon: BookOpenIcon },
]

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21H15v-6H9v6H3V9.75z" />
    </svg>
  )
}
function FileTextIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function ClipboardIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
function BarChartIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function BookOpenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

export default function ParticipantLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, switchRole, pendingRespondentCount } = useUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!user) {
    return <Navigate to="/" replace />
  }

  const isRespondentToo = false
  const isBuhrToo = user.roles.includes('buhr')

  function handleSwitchToRespondent() {
    setDropdownOpen(false)
    switchRole('respondent')
    navigate('/respondent/dashboard')
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
        {isRespondentToo && (
          <div className="px-3 pt-3 pb-1 relative">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-1.5">View</p>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#dbeafe] border border-[#bfdbfe] hover:bg-blue-100 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#1e4d8c] shrink-0" />
              <span className="text-[11px] font-semibold text-[#1e4d8c] flex-1 text-left tracking-wide">DC Participant</span>
              {pendingRespondentCount > 0 && (
                <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full shrink-0">
                  {pendingRespondentCount}
                </span>
              )}
              <svg
                className={`w-3.5 h-3.5 text-[#1e4d8c] transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute left-3 right-3 top-[calc(100%-4px)] mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-lg z-30 overflow-hidden">
                {/* Current — Participant */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f0f6ff] border-b border-[#e2e8f0]">
                  <svg className="w-3.5 h-3.5 text-[#1e4d8c] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-[#1e4d8c]">DC Participant</p>
                    <p className="text-[10px] text-blue-400">Current view</p>
                  </div>
                </div>
                {/* Switch to — Respondent */}
                <button
                  onClick={handleSwitchToRespondent}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-violet-50 transition-colors group"
                >
                  <div className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium text-gray-700 group-hover:text-violet-700">360 Respondent</p>
                    {pendingRespondentCount > 0 && (
                      <p className="text-[10px] text-violet-500">{pendingRespondentCount} pending</p>
                    )}
                  </div>
                  {pendingRespondentCount > 0 && (
                    <span className="text-[9px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full shrink-0">
                      {pendingRespondentCount}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {isBuhrToo && (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={() => { switchRole('buhr'); navigate('/buhr/dashboard') }}
              className="w-full rounded-lg border border-[#bfdbfe] bg-blue-50 px-3 py-2 text-left text-[11px] font-semibold text-[#1e4d8c] hover:bg-blue-100"
            >
              Switch to BUHR Workspace
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setDropdownOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#dbeafe] text-[#1e4d8c] font-medium'
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
              <p className="text-[10px] text-gray-400 truncate">{user.cohort}</p>
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
        {/* Nomination CTA button */}
        {isRespondentToo && pendingRespondentCount > 0 && (
          <div className="px-8 pt-6 pb-0">
            <button
              onClick={(e) => { e.stopPropagation(); handleSwitchToRespondent() }}
              className="w-full flex items-center gap-4 px-5 py-3.5 bg-white border border-violet-200 rounded-xl hover:bg-violet-50 hover:border-violet-300 transition-all group shadow-sm"
            >
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-violet-600" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-[#1a1f2e] group-hover:text-violet-700">
                  You've been nominated — rate {pendingRespondentCount} participant{pendingRespondentCount > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Your 360 feedback is pending · Due 30 Jun 2025</p>
              </div>
              <span className="text-xs font-semibold text-violet-600 group-hover:text-violet-800 shrink-0 flex items-center gap-1">
                Rate now
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
