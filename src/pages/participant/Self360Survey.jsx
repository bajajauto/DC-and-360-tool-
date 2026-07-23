import { useEffect, useState } from 'react'
import { useUser } from '../../context/UserContext'
import { api } from '../../lib/api'
import FeedbackForm from '../respondent/FeedbackForm'

export default function Self360Survey() {
  const { user } = useUser()
  const [taskId, setTaskId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.participantId) return
    api.ensureSelfFeedbackTask(user.participantId)
      .then((result) => setTaskId(result.data.id))
      .catch((err) => setError(err.message))
  }, [user?.participantId])

  if (error) return <div className="p-6"><div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div></div>
  if (!taskId) return <div className="p-6 text-sm text-slate-500">Preparing your self 360 survey...</div>
  return <FeedbackForm taskIdOverride={taskId} returnTo="/participant/dashboard" />
}
