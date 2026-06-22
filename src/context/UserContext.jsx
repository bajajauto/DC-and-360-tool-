import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const UserContext = createContext(null)
const SESSION_KEY = 'dc-tool.magic-session'
const DRAFTS_KEY = 'dc-tool.feedback-drafts'
const NOMINEES_KEY = 'dc-tool.360-nominees'
const NOMINEES_RESET_KEY = 'dc-tool.360-nominees-reset-version'
const NOMINEES_RESET_VERSION = 'reset-2026-06-16-1'

const MOCK_USER = {
  name: 'Rahul Kumar',
  email: 'rahul.kumar@bajaj.com',
  initials: 'RK',
  employeeId: 'EX-78432',
  designation: 'Senior Manager',
  bu: 'Two-Wheeler',
  level: 'EX',
  cohort: "EX-to-LX Cohort '25",
  reportingManager: 'Priya Menon',
  dcType: 'EX to LX',
  // This user is both a DC participant AND a 360 respondent for others
  roles: ['participant', 'respondent'],
  respondentTasks: [
    {
      id: 'r1',
      participantName: 'Neha Sharma',
      participantInitials: 'NS',
      designation: 'Senior Manager',
      bu: 'EV & New Businesses',
      relationship: 'Peer / Internal Customer',
      dcType: 'EX-to-LX',
      status: 'pending',
      progress: 0,
      totalQuestions: 61,
      answered: 0,
      deadline: '30 Jun 2025',
    },
    {
      id: 'r2',
      participantName: 'Arjun Patel',
      participantInitials: 'AP',
      designation: 'Deputy Manager',
      bu: 'Two-Wheeler (Sales)',
      relationship: 'Peer / Internal Customer',
      dcType: 'EX-to-LX',
      status: 'saved',
      progress: 18,
      totalQuestions: 61,
      answered: 9,
      deadline: '30 Jun 2025',
    },
    {
      id: 'r3',
      participantName: 'Sunita Rao',
      participantInitials: 'SR',
      designation: 'Manager',
      bu: 'Finance',
      relationship: 'Reporting Manager',
      dcType: 'EX-to-LX',
      status: 'submitted',
      progress: 100,
      totalQuestions: 61,
      answered: 49,
      deadline: '30 Jun 2025',
    },
  ],
}

function getInitials(name = '') {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || 'U'
}

function readJson(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function readNomineeDraft() {
  try {
    if (window.localStorage.getItem(NOMINEES_RESET_KEY) !== NOMINEES_RESET_VERSION) {
      window.localStorage.removeItem(NOMINEES_KEY)
      window.localStorage.setItem(NOMINEES_RESET_KEY, NOMINEES_RESET_VERSION)
      return null
    }
  } catch {
    return null
  }

  return readJson(NOMINEES_KEY, null)
}

function buildUserFromMagicLink(payload) {
  const role = ['respondent', 'td'].includes(payload.role) ? payload.role : 'participant'
  const name = payload.name?.trim() || (role === 'respondent' ? '360 Respondent' : role === 'td' ? 'TD Administrator' : MOCK_USER.name)
  const email = payload.email?.trim() || (role === 'respondent' ? 'respondent@bajaj.com' : role === 'td' ? 'td.admin@bajaj.com' : MOCK_USER.email)
  const employeeId = payload.employeeId?.trim() || payload.email?.trim() || MOCK_USER.employeeId

  return {
    ...MOCK_USER,
    name,
    email,
    initials: getInitials(name),
    employeeId,
    roles: [role],
    magicLink: {
      role,
      taskId: payload.taskId || null,
      issuedToName: name,
      issuedToEmail: email,
    },
  }
}

function getDraftProgress(task, draft) {
  const sectionReflectionAnswered = Object.values(draft?.sectionSsc ?? {}).reduce(
    (total, section) => total + ['start', 'continue', 'stop'].filter((key) => section?.[key]?.trim()).length,
    0,
  )
  const answered = Object.keys(draft?.ratings ?? {}).length + sectionReflectionAnswered
  const total = task.totalQuestions || 1
  const progress = Math.min(100, Math.round((answered / total) * 100))

  return {
    ...task,
    answered,
    progress,
    status: draft?.submitted ? 'submitted' : answered > 0 || draft?.touched ? 'saved' : task.status,
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => readJson(SESSION_KEY, null))
  const [feedbackDrafts, setFeedbackDrafts] = useState(() => readJson(DRAFTS_KEY, {}))
  const [nomineeDraft, setNomineeDraft] = useState(() => readNomineeDraft())
  const [activeRole, setActiveRole] = useState(() => readJson(SESSION_KEY, null)?.magicLink?.role ?? 'participant')

  const hydratedUser = useMemo(() => {
    if (!user) return null

    return {
      ...user,
      respondentTasks: user.respondentTasks.map((task) => getDraftProgress(task, feedbackDrafts[task.id])),
    }
  }, [feedbackDrafts, user])

  const switchRole = (role) => {
    if (hydratedUser?.roles.includes(role)) setActiveRole(role)
  }

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
    setActiveRole('participant')
  }, [])

  const resetDemoData = useCallback(() => {
    window.localStorage.removeItem(DRAFTS_KEY)
    window.localStorage.removeItem(NOMINEES_KEY)
    setFeedbackDrafts({})
    setNomineeDraft(null)
  }, [])

  const resetNominees = useCallback(() => {
    window.localStorage.removeItem(NOMINEES_KEY)
    setNomineeDraft(null)
  }, [])

  const saveFeedbackDraft = useCallback((taskId, draft) => {
    setFeedbackDrafts((prev) => {
      const next = {
        ...prev,
        [taskId]: {
          ...prev[taskId],
          ...draft,
          touched: true,
          updatedAt: new Date().toISOString(),
        },
      }
      writeJson(DRAFTS_KEY, next)
      return next
    })
  }, [])

  const submitFeedbackTask = useCallback((taskId, draft) => {
    saveFeedbackDraft(taskId, {
      ...draft,
      submitted: true,
      submittedAt: new Date().toISOString(),
    })
  }, [saveFeedbackDraft])

  const saveNominees = useCallback((nominees) => {
    const next = {
      nominees,
      savedAt: new Date().toISOString(),
      submitted: false,
      submittedAt: null,
    }
    setNomineeDraft(next)
    writeJson(NOMINEES_KEY, next)
  }, [])

  const submitNominees = useCallback((nominees) => {
    const next = {
      nominees,
      savedAt: nomineeDraft?.savedAt ?? new Date().toISOString(),
      submitted: true,
      submittedAt: new Date().toISOString(),
    }
    setNomineeDraft(next)
    writeJson(NOMINEES_KEY, next)
  }, [nomineeDraft?.savedAt])

  const pendingRespondentCount = hydratedUser?.respondentTasks.filter(
    (t) => t.status === 'pending' || t.status === 'saved'
  ).length ?? 0

  const pendingParticipantCount = nomineeDraft?.submitted ? 1 : 2 // mock: Pre-Work + 360 Nominees

  return (
    <UserContext.Provider
      value={{
        user: hydratedUser,
        activeRole,
        feedbackDrafts,
        nomineeDraft,
        loginFromMagicLink,
        logout,
        resetDemoData,
        resetNominees,
        saveFeedbackDraft,
        saveNominees,
        submitNominees,
        submitFeedbackTask,
        switchRole,
        pendingRespondentCount,
        pendingParticipantCount,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be inside UserProvider')
  return ctx
}
