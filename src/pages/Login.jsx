import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { api } from '../lib/api'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

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
    <main className="flex min-h-screen bg-[#f8f9fc]">
      <section className="hidden w-1/2 flex-col bg-[#1e4d8c] px-7 py-6 lg:flex">
        <img src={bajajBrandLockup} alt="Bajaj Auto" className="h-auto w-56 max-w-full" />
        <div className="mt-10">
          <h1 className="text-4xl font-bold leading-tight text-white">DC and 360<br /><span className="text-blue-200">Tool</span></h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-blue-200">Your DC journey, organized in one place.</p>
        </div>
      </section>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <img src={bajajBrandLockup} alt="Bajaj Auto" className="mb-7 h-auto w-44 lg:hidden" />
          <h1 className="mb-6 text-2xl font-bold text-[#1a1f2e]">Sign in</h1>

          <form onSubmit={handleCredentialLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
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
                autoComplete="current-password"
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

          <div className="mt-7 space-y-4 border-t border-slate-200 pt-6">
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
          <p className="mt-7 text-center text-xs text-slate-500">
            Need help? Contact TD Admin at{' '}
            <a href="mailto:learn@bajajauto.co.in" className="font-semibold text-[#1e4d8c] hover:underline">learn@bajajauto.co.in</a>
          </p>
        </section>
      </div>
    </main>
  )
}
