import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { getRelationshipLabel, getRequiredQuestionTotal } from '../data/surveyConfig'

const UserContext = createContext(null)
const SESSION_KEY = 'dc-tool.session'

function getInitials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
}

function readJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch { return fallback }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function buildUserFromMagicLink(payload) {
  const role = ['respondent', 'td', 'assessor', 'buhr'].includes(payload.role) ? payload.role : 'participant'
  const name = payload.name?.trim() || 'Portal User'
  const email = payload.email?.trim() || ''
  const employeeId = payload.employeeId?.trim() || email
  const relationship = getRelationshipLabel(payload.relationship)
  const respondentTasks = role === 'respondent' && payload.taskId
    ? [{
        id: payload.taskId,
        participantName: payload.participantName || 'DC Participant',
        participantInitials: getInitials(payload.participantName || 'DC Participant'),
        designation: 'Participant',
        bu: '',
        relationship,
        dcType: 'DC',
        status: 'pending',
        progress: 0,
        totalQuestions: getRequiredQuestionTotal(relationship),
        answered: 0,
        deadline: payload.expiresAt
          ? new Date(payload.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—',
      }]
    : []

  return {
    id: payload.id || null,
    name,
    email,
    employeeId,
    initials: getInitials(name),
    designation: payload.designation || '',
    bu: payload.bu || '',
    roles: payload.roles?.length ? payload.roles : [role],
    participantId: payload.participantId || null,
    cohort: payload.cohort || null,
    respondentTasks,
    magicLink: { role, taskId: payload.taskId || null },
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => readJson(SESSION_KEY, null))
  const [participantData, setParticipantData] = useState(null)
  const [participantLoading, setParticipantLoading] = useState(true)
  const [participantError, setParticipantError] = useState('')
  const [activeRole, setActiveRole] = useState(() => {
    const stored = readJson(SESSION_KEY, null)
    return stored?.magicLink?.role ?? stored?.roles?.[0] ?? 'participant'
  })

  const refreshParticipantData = useCallback(async (participantId) => {
    if (!participantId) return
    try {
      const result = await api.getParticipant(participantId)
      setParticipantData(result.data)
      setParticipantError('')
    } catch (err) { setParticipantError(err.message) }
  }, [])

  const [participantReload, setParticipantReload] = useState(0)
  const retryParticipantSession = useCallback(() => setParticipantReload((value) => value + 1), [])

  // Resolve the signed-in user's own membership, including sessions created
  // by older BUHR links that omitted participantId. Never use a feedback target.
  useEffect(() => {
    let cancelled = false
    setParticipantData(null)
    setParticipantError('')
    if (!user?.roles?.includes('participant')) {
      setParticipantLoading(false)
      return
    }
    setParticipantLoading(true)
    async function restore() {
      try {
        const { data: membership } = await api.getParticipantContext()
        if (cancelled) return
        setUser((current) => {
          if (!current || current.id !== user.id) return current
          const next = { ...current, ...membership }
          writeJson(SESSION_KEY, next)
          return next
        })
        if (!membership.participantId) throw new Error('No active cohort is linked to your account. Please contact the Talent Development team.')
        const result = await api.getParticipant(membership.participantId)
        if (!cancelled) setParticipantData(result.data)
      } catch (err) {
        if (!cancelled) setParticipantError(err.message)
      } finally {
        if (!cancelled) setParticipantLoading(false)
      }
    }
    restore()
    return () => { cancelled = true }
  }, [user?.id, user?.roles?.join(','), participantReload])

  const loginFromCredentials = useCallback((apiData) => {
    // The token is persisted separately by the api client; keep it out of the
    // stored user object.
    const { token, ...userFields } = apiData
    const roles = Array.isArray(userFields.roles) ? userFields.roles : []
    const nextUser = { ...userFields, roles, magicLink: null }
    setUser(nextUser)
    setActiveRole(roles[0])
    writeJson(SESSION_KEY, nextUser)
    setParticipantData(null)
    setParticipantLoading(true)
    retryParticipantSession()
    return nextUser
  }, [retryParticipantSession])

  const loginFromMagicLink = useCallback((payload) => {
    const nextUser = buildUserFromMagicLink(payload)
    setUser(nextUser)
    setActiveRole(nextUser.magicLink.role)
    writeJson(SESSION_KEY, nextUser)
    setParticipantData(null)
    setParticipantLoading(true)
    retryParticipantSession()
    return nextUser
  }, [retryParticipantSession])

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY)
    api.clearToken()
    setUser(null)
    setParticipantData(null)
    setActiveRole('participant')
  }, [])

  const switchRole = useCallback((role) => {
    if (user?.roles.includes(role)) setActiveRole(role)
  }, [user])

  const updateRespondentTaskStatus = useCallback((taskId, status) => {
    setUser((current) => {
      if (!current) return current
      const nextUser = {
        ...current,
        respondentTasks: (current.respondentTasks || []).map((task) => (
          task.id === taskId ? { ...task, status, progress: status === 'submitted' ? 100 : task.progress } : task
        )),
      }
      writeJson(SESSION_KEY, nextUser)
      return nextUser
    })
  }, [])

  const pendingRespondentCount = useMemo(() =>
    (user?.respondentTasks || []).filter(t => t.status === 'pending' || t.status === 'saved').length,
    [user]
  )

  const pendingParticipantCount = useMemo(() => {
    if (!participantData) return 0
    const nomineesSubmitted = participantData.nominees?.every(n => n.status === 'submitted')
    return nomineesSubmitted ? 0 : 1
  }, [participantData])

  return (
    <UserContext.Provider value={{
      user,
      activeRole,
      participantData,
      participantLoading,
      participantError,
      retryParticipantSession,
      loginFromCredentials,
      loginFromMagicLink,
      logout,
      switchRole,
      updateRespondentTaskStatus,
      refreshParticipantData,
      pendingRespondentCount,
      pendingParticipantCount,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be inside UserProvider')
  return ctx
}
