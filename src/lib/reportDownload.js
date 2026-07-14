const API_BASE = import.meta.env.VITE_API_URL || ''

function getFileName(response, fallback) {
  const disposition = response.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="?([^"]+)"?/i)
  return match?.[1] || fallback
}

export async function download360Pptx(participantId, participantName = 'participant') {
  let response

  try {
    response = await fetch(`${API_BASE}/api/reports/${participantId}/360/download`)
  } catch {
    throw new Error('Backend API is not responding. Please start the backend server and try again.')
  }

  if (!response.ok) {
    let message = 'Unable to generate the PPTX report.'

    try {
      const body = await response.json()
      message = body?.error?.message || message
    } catch {
      if (response.status === 404) message = 'Report API was not found. Please check that the backend server is running.'
      if (response.status >= 500) message = 'The report generator failed on the server.'
    }

    throw new Error(message)
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

export async function downloadBuhr360Pptx(userId, participantId, participantName = 'participant') {
  let response

  try {
    response = await fetch(`${API_BASE}/api/buhr/${userId}/reports/${participantId}/360/download`)
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
