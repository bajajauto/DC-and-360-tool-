import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { api } from '../lib/api'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

const demoCredentials = [
  { label: 'TD Admin', identifier: 'td.admin@bajajauto.co.in', password: 'Admin@123' },
  { label: 'Assessor', identifier: 'assessor@bajajauto.co.in', password: 'Assessor@123' },
  { label: 'BUHR', identifier: 'buhr.ev@bajajauto.co.in', password: 'Buhr@123' },
  { label: 'Participant', identifier: '', password: 'Welcome@123', hint: 'Enter employee ID above' },
]

function destinationForUser(user) {
  if (user.roles.includes('td')) return '/td/dashboard'
  if (user.roles.includes('assessor')) return '/assessor/candidates'
  if (user.roles.includes('buhr')) return '/buhr/dashboard'
  if (user.roles.includes('participant')) return '/participant/dashboard'
  if (user.roles.includes('respondent')) {
    const firstTask = user.respondentTasks?.[0]
    return firstTask ? `/respondent/feedback/${firstTask.id}` : '/respondent/dashboard'
  }

  return '/participant/dashboard'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginFromCredentials } = useUser()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [manualLink, setManualLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function openManualLink() {
    if (!manualLink.trim()) return
    window.location.href = manualLink.trim()
  }

  async function handleCredentialLogin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const body = await api.login(identifier, password)
      const user = loginFromCredentials(body.data)
      navigate(destinationForUser(user), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e4d8c] flex-col px-7 py-6">
        <div>
          <img
            src={bajajBrandLockup}
            alt="Bajaj"
            className="h-auto w-56 max-w-full"
          />
        </div>

        <div className="mt-10">
          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            DC and 360
            <br />
            <span className="text-blue-200">Tool</span>
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-md">
            Your DC journey, organized in one place.
          </p>
        </div>

      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8f9fc]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-[#1e4d8c] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <div>
              <p className="font-semibold text-[#1a1f2e]">Bajaj Auto</p>
              <p className="text-xs text-gray-500">Talent Development</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#1a1f2e] mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-8">Use your employee ID or email to access the portal.</p>

          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Employee ID or email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="TD-ADMIN"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!identifier.trim() || !password || loading}
              className="block w-full bg-[#1e4d8c] text-white text-center py-2.5 rounded-lg font-medium hover:bg-[#183f73] transition-colors text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#e2e8f0]" />
              <span className="text-gray-400 text-xs">magic link</span>
              <div className="flex-1 h-px bg-[#e2e8f0]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Paste magic link
              </label>
              <input
                type="url"
                value={manualLink}
                onChange={(e) => setManualLink(e.target.value)}
                placeholder="https://dc-tool/.../invite/..."
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            <button
              onClick={openManualLink}
              disabled={!manualLink.trim()}
              className="block w-full border border-[#d6e3f5] bg-white text-[#1e4d8c] text-center py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue with Magic Link
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="text-gray-400 text-xs">demo</span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {demoCredentials.map((demo) => (
              <button
                key={demo.label}
                onClick={() => {
                  if (demo.identifier) setIdentifier(demo.identifier)
                  setPassword(demo.password)
                  setError('')
                }}
                className="flex items-center justify-between gap-2 border border-[#e2e8f0] bg-white px-4 py-2.5 rounded-lg text-sm font-medium text-[#1a1f2e] hover:bg-gray-50 transition-colors"
              >
                <span>{demo.label}</span>
                <span className="text-xs text-gray-400 font-normal">
                  {demo.hint || demo.identifier}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Need a new link?{' '}
            <span className="text-[#1e4d8c] cursor-pointer hover:underline">Contact TD Admin</span>
          </p>
        </div>
      </div>
    </div>
  )
}
