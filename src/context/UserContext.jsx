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
    name,
    email,
    employeeId,
    initials: getInitials(name),
    designation: '',
    bu: '',
    roles: [role],
    participantId: null,
    cohort: null,
    respondentTasks,
    magicLink: { role, taskId: payload.taskId || null },
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => readJson(SESSION_KEY, null))
  const [participantData, setParticipantData] = useState(null)
  const [activeRole, setActiveRole] = useState(() => {
    const stored = readJson(SESSION_KEY, null)
    return stored?.magicLink?.role ?? stored?.roles?.[0] ?? 'participant'
  })

  const refreshParticipantData = useCallback(async (participantId) => {
    if (!participantId) return
    try {
      const result = await api.getParticipant(participantId)
      setParticipantData(result.data)
    } catch {}
  }, [])

  // Restore participant data on page load
  useEffect(() => {
    const stored = readJson(SESSION_KEY, null)
    if (stored?.participantId) {
      refreshParticipantData(stored.participantId)
    }
  }, [refreshParticipantData])

  const loginFromCredentials = useCallback((apiData) => {
    const roles = apiData.roles?.length ? apiData.roles : ['participant']
    const nextUser = { ...apiData, roles, magicLink: null }
    setUser(nextUser)
    setActiveRole(roles[0])
    writeJson(SESSION_KEY, nextUser)
    if (apiData.participantId) {
      refreshParticipantData(apiData.participantId)
    }
    return nextUser
  }, [refreshParticipantData])

  const loginFromMagicLink = useCallback((payload) => {
    const nextUser = buildUserFromMagicLink(payload)
    setUser(nextUser)
    setActiveRole(nextUser.magicLink.role)
    writeJson(SESSION_KEY, nextUser)
    return nextUser
  }, [])

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setParticipantData(null)
    setActiveRole('participant')
  }, [])

  const switchRole = useCallback((role) => {
    if (user?.roles.includes(role)) setActiveRole(role)
  }, [user])

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
      loginFromCredentials,
      loginFromMagicLink,
      logout,
      switchRole,
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
