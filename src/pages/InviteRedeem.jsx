import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import bajajBrandLockup from '../assets/bajaj-brand-lockup.png'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function InviteRedeem() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { loginFromMagicLink } = useUser()
  const [status, setStatus] = useState('Checking invite link...')
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function redeemInvite() {
      try {
        const response = await fetch(`${API_BASE}/api/invites/redeem`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = await response.json()

        if (!response.ok) {
          throw new Error(body?.error?.message || 'Invite link could not be opened')
        }

        const user = loginFromMagicLink(body.data)
        if (!isMounted) return
        navigate(`/respondent/feedback/${user.magicLink.taskId}`, { replace: true })
      } catch (err) {
        if (!isMounted) return
        setError(err.message)
        setStatus('Invite link unavailable')
      }
    }

    redeemInvite()
    return () => {
      isMounted = false
    }
  }, [loginFromMagicLink, navigate, token])

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-xl p-6 text-center">
        <img src={bajajBrandLockup} alt="Bajaj" className="h-auto w-44 max-w-full mx-auto mb-6" />
        <h1 className="text-xl font-bold text-[#1a1f2e]">{status}</h1>
        <p className="text-sm text-gray-500 mt-2">
          {error || 'You will be taken to your 360 feedback form in a moment.'}
        </p>
        {error && (
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full bg-[#1e4d8c] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#183f73] transition-colors"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  )
}
