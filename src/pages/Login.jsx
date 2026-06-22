import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

const demoLinks = [
  {
    label: 'Open as TD admin',
    href: '/?role=td&name=Aditi%20Deshmukh&email=aditi.deshmukh%40bajaj.com&employeeId=TD-1042',
  },
  {
    label: 'Open as DC participant',
    href: '/?role=participant&name=Rahul%20Kumar&email=rahul.kumar%40bajaj.com&employeeId=EX-78432',
  },
  {
    label: 'Open as 360 nominee',
    href: '/?role=respondent&name=Anika%20Kapoor&email=anika.kapoor%40bajaj.com&taskId=r1',
  },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginFromMagicLink } = useUser()
  const [manualLink, setManualLink] = useState('')

  useEffect(() => {
    const role = searchParams.get('role')
    const email = searchParams.get('email')

    if (!role || !email) return

    const user = loginFromMagicLink({
      role,
      name: searchParams.get('name'),
      email,
      employeeId: searchParams.get('employeeId'),
      taskId: searchParams.get('taskId'),
    })

    const taskId = user.magicLink.taskId
    if (user.magicLink.role === 'td') {
      navigate('/td/cohorts', { replace: true })
    } else if (user.magicLink.role === 'respondent') {
      navigate(taskId ? `/respondent/feedback/${taskId}` : '/respondent/dashboard', { replace: true })
    } else {
      navigate('/participant/dashboard', { replace: true })
    }
  }, [loginFromMagicLink, navigate, searchParams])

  function openManualLink() {
    if (!manualLink.trim()) return
    window.location.href = manualLink.trim()
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
          <p className="text-gray-500 text-sm mb-8">Use the secure magic link sent to your email</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Paste magic link
              </label>
              <input
                type="url"
                value={manualLink}
                onChange={(e) => setManualLink(e.target.value)}
                placeholder="https://dc-tool/.../?role=respondent&name=..."
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            <button
              onClick={openManualLink}
              disabled={!manualLink.trim()}
              className="block w-full bg-[#1e4d8c] text-white text-center py-2.5 rounded-lg font-medium hover:bg-[#183f73] transition-colors text-sm mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
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
            {demoLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.href)}
                className="flex items-center justify-center gap-2 border border-[#e2e8f0] bg-white px-4 py-2.5 rounded-lg text-sm font-medium text-[#1a1f2e] hover:bg-gray-50 transition-colors"
              >
                {link.label}
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
