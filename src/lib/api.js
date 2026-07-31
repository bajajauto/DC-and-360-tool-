const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'dc-tool.token'
const SESSION_KEY = 'dc-tool.session'

export function getToken() {
  try { return window.localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try { if (token) window.localStorage.setItem(TOKEN_KEY, token) } catch {}
}

export function clearToken() {
  try { window.localStorage.removeItem(TOKEN_KEY) } catch {}
}

async function apiFetch(path, options = {}) {
  const token = getToken()
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Please try again in a moment.')
  }

  // An authenticated request that comes back 401 means the stored session is no
  // longer valid — clear it and bounce to the login screen.
  if (response.status === 401 && token) {
    clearToken()
    try { window.localStorage.removeItem(SESSION_KEY) } catch {}
    if (window.location.pathname !== '/') window.location.assign('/')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Request failed (${response.status})`)
  }
  return response.json()
}

export const api = {
  login: async (identifier, password) => {
    const body = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    })
    if (body?.data?.token) setToken(body.data.token)
    return body
  },

  redeemInvite: async (token) => {
    const body = await apiFetch('/api/invites/redeem', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
    if (body?.data?.token) setToken(body.data.token)
    return body
  },

  getCohorts: () => apiFetch('/api/cohorts'),

  createCohort: (payload) =>
    apiFetch('/api/cohorts', { method: 'POST', body: JSON.stringify(payload) }),

  updateCohort: (cohortId, payload) =>
    apiFetch(`/api/cohorts/${cohortId}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getCohortParticipants: (cohortId) => apiFetch(`/api/cohorts/${cohortId}/participants`),

  addCohortParticipant: (cohortId, payload) =>
    apiFetch(`/api/cohorts/${cohortId}/participants`, { method: 'POST', body: JSON.stringify(payload) }),

  deleteCohortParticipant: (cohortId, participantId) =>
    apiFetch(`/api/cohorts/${cohortId}/participants/${participantId}`, { method: 'DELETE' }),

  getParticipant: (participantId) => apiFetch(`/api/participants/${participantId}`),

  getParticipantWork: (participantId, type) => apiFetch(`/api/participants/${participantId}/work/${type}`),

  saveParticipantWork: (participantId, type, answers, submit = false) =>
    apiFetch(`/api/participants/${participantId}/work/${type}`, { method: 'PUT', body: JSON.stringify({ answers, submit }) }),

  getBuhrParticipants: (userId) => apiFetch(`/api/buhr/${userId}/participants`),

  getAssessorCandidates: () => apiFetch('/api/assessor/candidates'),

  getAssessorCandidate: (participantId) => apiFetch(`/api/assessor/candidates/${participantId}`),

  getAssessorAnalysis: () => apiFetch('/api/assessor-analysis'),

  uploadAssessorAnalysis: (participantId, payload) =>
    apiFetch(`/api/assessor-analysis/${participantId}`, { method: 'PUT', body: JSON.stringify(payload) }),

  saveNominees: (participantId, nominees) =>
    apiFetch(`/api/participants/${participantId}/nominees`, {
      method: 'PUT',
      body: JSON.stringify({ nominees }),
    }),

  getParticipantPhoto: (participantId) => apiFetch(`/api/participants/${participantId}/photo`),

  saveParticipantPhoto: (participantId, dataUrl) =>
    apiFetch(`/api/participants/${participantId}/photo`, { method: 'PUT', body: JSON.stringify({ dataUrl }) }),

  submitNominees: (participantId) =>
    apiFetch(`/api/participants/${participantId}/nominees/submit`, { method: 'POST' }),

  ensureSelfFeedbackTask: (participantId) =>
    apiFetch(`/api/participants/${participantId}/self-feedback-task`, { method: 'POST' }),

  getFeedbackTask: (taskId) => apiFetch(`/api/feedback-tasks/${taskId}`),

  saveFeedbackDraft: (taskId, payload) =>
    apiFetch(`/api/feedback-tasks/${taskId}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  submitFeedback: (taskId, payload) =>
    apiFetch(`/api/feedback-tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  release360Report: (participantId) =>
    apiFetch(`/api/reports/${participantId}/360/release`, { method: 'POST' }),

  generate360Report: (participantId) =>
    apiFetch(`/api/reports/${participantId}/360/generate`, { method: 'POST' }),

  getReportRepository: () => apiFetch('/api/reports/repository'),

  getOutbox: () => apiFetch('/api/notifications/outbox'),


  getNotificationTemplates: () => apiFetch('/api/notifications/templates'),

  getNotificationRecipients: (templateId) => apiFetch(`/api/notifications/recipients?templateId=${encodeURIComponent(templateId || '')}`),

  sendNotification: (payload) =>
    apiFetch('/api/notifications/send', { method: 'POST', body: JSON.stringify(payload) }),

  setToken,
  getToken,
  clearToken,
}
