const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function apiFetch(path, options = {}) {
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Make sure the backend is running on port 4000.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Request failed (${response.status})`)
  }
  return response.json()
}

export const api = {
  login: (identifier, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),

  getCohorts: () => apiFetch('/api/cohorts'),

  getCohortParticipants: (cohortId) => apiFetch(`/api/cohorts/${cohortId}/participants`),

  getParticipant: (participantId) => apiFetch(`/api/participants/${participantId}`),

  getBuhrParticipants: (userId) => apiFetch(`/api/buhr/${userId}/participants`),

  saveNominees: (participantId, nominees) =>
    apiFetch(`/api/participants/${participantId}/nominees`, {
      method: 'PUT',
      body: JSON.stringify({ nominees }),
    }),

  submitNominees: (participantId) =>
    apiFetch(`/api/participants/${participantId}/nominees/submit`, { method: 'POST' }),

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
}
