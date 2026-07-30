const API_BASE = import.meta.env.VITE_API_URL || ''
import { getToken } from './api'

function getFileName(response, fallback) {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] || fallback
}

async function fetchReport(participantId, signal) {
  const token = getToken()
  return fetch(`${API_BASE}/api/reports/${participantId}/360/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  })
}

export async function get360ReportPreviewUrl(participantId) {
  const token = getToken()
  const response = await fetch(`${API_BASE}/api/reports/${participantId}/360/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Unable to load the report preview.')
  }
  const html = await response.text()
  return URL.createObjectURL(new Blob([html], { type: 'text/html' }))
}

function assertPptxReport(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('presentationml.presentation') && !type.includes('application/octet-stream')) {
    throw new Error('The server did not return a PowerPoint report. Restart the backend, then generate the report again.')
  }
}

export async function download360Pptx(participantId, participantName = 'participant') {
  let response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30000)

  try {
    response = await fetchReport(participantId, controller.signal)
  } catch {
    throw new Error('The report request timed out. Restart the backend and try again.')
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    let message = 'Unable to generate the report.'

    try {
      const body = await response.json()
      message = body?.error?.message || message
    } catch {
      if (response.status === 404) message = 'Report API was not found. Please check that the backend server is running.'
      if (response.status >= 500) message = 'The report generator failed on the server.'
    }

    throw new Error(message)
  }

  assertPptxReport(response)

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(response, `${participantName.replace(/\s+/g, '-')}-360-report.pptx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function download360ResponseData(participantId, participantName = 'participant') {
  const token = getToken()
  let response

  try {
    response = await fetch(`${API_BASE}/api/reports/${participantId}/360/response-data`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('Backend API is not responding. Please start the backend server and try again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Unable to download the response data.')
  }

  assertPptxReport(response)
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(response, `${participantName.replace(/\s+/g, '-')}-360-response-data.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadBuhr360Pptx(userId, participantId, participantName = 'participant') {
  let response

  try {
    const token = getToken()
    response = await fetch(`${API_BASE}/api/buhr/${userId}/reports/${participantId}/360/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    throw new Error('Backend API is not responding. Please start the backend server and try again.')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Report is not published yet.')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(response, `${participantName.replace(/\s+/g, '-')}-360-report.pptx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadBuhrReport(userId, participantId, reportType, participantName = 'participant') {
  const token = getToken()
  const response = await fetch(`${API_BASE}/api/buhr/${userId}/reports/${participantId}/${reportType}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Unable to download the published report.')
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(response, `${participantName.replace(/\s+/g, '-')}-${reportType}-report`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
