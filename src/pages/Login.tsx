import { useNavigate } from 'react-router-dom'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

export default function LoginPage() {
  const navigate = useNavigate()

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
          <p className="text-gray-500 text-sm mb-8">Use your Bajaj Auto employee credentials</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">
                Employee ID / Email
              </label>
              <input
                type="text"
                placeholder="e.g. EX12345 or firstname.lastname@bajaj.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1a1f2e] mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-[#1a1f2e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e4d8c] focus:border-transparent text-sm"
              />
            </div>

            <button
              onClick={() => navigate('/participant/dashboard')}
              className="block w-full bg-[#1e4d8c] text-white text-center py-2.5 rounded-lg font-medium hover:bg-[#183f73] transition-colors text-sm mt-6"
            >
              Sign In
            </button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#e2e8f0]" />
            <span className="text-gray-400 text-xs">or</span>
            <div className="flex-1 h-px bg-[#e2e8f0]" />
          </div>

          <button
            onClick={() => navigate('/participant/dashboard')}
            className="mt-4 w-full flex items-center justify-center gap-3 border border-[#e2e8f0] bg-white px-4 py-2.5 rounded-lg text-sm font-medium text-[#1a1f2e] hover:bg-gray-50 transition-colors"
          >
            <div className="w-5 h-5 bg-[#0072C6] rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            Sign in with Microsoft SSO
          </button>

          <p className="text-center text-xs text-gray-400 mt-8">
            Having trouble signing in?{' '}
            <span className="text-[#1e4d8c] cursor-pointer hover:underline">Contact TD Admin</span>
          </p>
        </div>
      </div>
    </div>
  )
}
