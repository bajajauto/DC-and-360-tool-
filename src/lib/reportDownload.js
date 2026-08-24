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

export async function getDcReportPreviewUrl(participantId) {
  const token = getToken()
  const response = await fetch(`${API_BASE}/api/reports/${participantId}/dc/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Unable to load the DC report preview.')
  }
  return URL.createObjectURL(new Blob([await response.text()], { type: 'text/html' }))
}

export async function download360PreviewPdf(iframe, participantName = 'participant', save = true) {
  const previewDocument = iframe?.contentDocument
  if (!previewDocument) throw new Error('The report preview is not ready yet.')

  await previewDocument.fonts?.ready
  await Promise.all([...previewDocument.images].map((img) => img.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })))

  const pages = [...previewDocument.querySelectorAll('.page')]
  if (!pages.length) throw new Error('The report preview contains no printable pages.')

  const [{ getFontEmbedCSS, toPng }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [10.6875, 7.9583], compress: true })
  const fontEmbedCSS = await getFontEmbedCSS(pages[0])

  for (let index = 0; index < pages.length; index += 1) {
    const pageImage = await toPng(pages[index], {
      pixelRatio: 2,
      backgroundColor: '#FFFAE2',
      cacheBust: true,
      fontEmbedCSS,
      style: { margin: '0', boxShadow: 'none' },
    })
    if (index > 0) pdf.addPage([10.6875, 7.9583], 'landscape')
    pdf.addImage(pageImage, 'PNG', 0, 0, 10.6875, 7.9583, undefined, 'FAST')
  }

  const fileName = `${participantName.replace(/\s+/g, '-')}-360-report.pdf`
  if (save) pdf.save(fileName)
  return { data: pdf.output('arraybuffer'), fileName }
}

export async function downloadDcPreviewPdf(iframe, participantName = 'participant', save = true) {
  const previewDocument = iframe?.contentDocument
  if (!previewDocument) throw new Error('The DC report preview is not ready yet.')
  await previewDocument.fonts?.ready
  await Promise.all([...previewDocument.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
    img.addEventListener('load', resolve, { once: true })
    img.addEventListener('error', resolve, { once: true })
  })))
  const pages = [...previewDocument.querySelectorAll('.page')]
  if (!pages.length) throw new Error('The DC report preview contains no printable pages.')
  const [{ getFontEmbedCSS, toPng }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  const first = pages[0]
  const width = first.offsetWidth || 1123
  const height = first.offsetHeight || 794
  const landscape = width >= height
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'px', format: [width, height], compress: true })
  const fontEmbedCSS = await getFontEmbedCSS(first)
  for (let index = 0; index < pages.length; index += 1) {
    const image = await toPng(pages[index], { pixelRatio: 2, cacheBust: true, fontEmbedCSS, style: { margin: '0', boxShadow: 'none' } })
    if (index > 0) pdf.addPage([width, height], landscape ? 'landscape' : 'portrait')
    pdf.addImage(image, 'PNG', 0, 0, width, height, undefined, 'FAST')
  }
  const fileName = `${participantName.replace(/\s+/g, '-')}-dc-report.pdf`
  if (save) pdf.save(fileName)
  return { data: pdf.output('arraybuffer'), fileName }
}

export async function download360Pdf(participantId, participantName = 'participant') {
  const previewUrl = await get360ReportPreviewUrl(participantId)
  const iframe = document.createElement('iframe')
  iframe.src = previewUrl
  iframe.title = '360° Feedback Report PDF renderer'
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.width = '1080px'
  iframe.style.height = '800px'
  iframe.style.border = '0'

  try {
    document.body.appendChild(iframe)
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('The report preview took too long to load.')), 30000)
      iframe.addEventListener('load', () => {
        window.clearTimeout(timeout)
        resolve()
      }, { once: true })
      iframe.addEventListener('error', () => {
        window.clearTimeout(timeout)
        reject(new Error('Unable to load the report preview.'))
      }, { once: true })
    })
    await download360PreviewPdf(iframe, participantName)
  } finally {
    iframe.remove()
    URL.revokeObjectURL(previewUrl)
  }
}

function assertPptxReport(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('presentationml.presentation') && !type.includes('application/octet-stream')) {
    throw new Error('The server did not return a PowerPoint report. Restart the backend, then generate the report again.')
  }
}

function assertExcelWorkbook(response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('spreadsheetml.sheet') && !type.includes('application/octet-stream')) {
    throw new Error('The server did not return an Excel workbook.')
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

  assertExcelWorkbook(response)
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

export async function downloadCohort360Master() {
  const token = getToken()
  const response = await fetch(`${API_BASE}/api/reports/cohort-360-master`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => { throw new Error('Backend API is not responding. Please start the backend server and try again.') })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Unable to download the cohort 360 master workbook.')
  }
  assertExcelWorkbook(response)
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = getFileName(response, 'All-Cohorts-360-Master-Response-Data.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createStoredZip(entries) {
  const encoder = new TextEncoder(), local = [], central = []
  let offset = 0
  for (const entry of entries) {
    const name = encoder.encode(entry.name), data = new Uint8Array(entry.data), checksum = crc32(data)
    const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x0800, true)
    view.setUint32(14, checksum, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); header.set(name, 30)
    local.push(header, data)
    const directory = new Uint8Array(46 + name.length), directoryView = new DataView(directory.buffer)
    directoryView.setUint32(0, 0x02014b50, true); directoryView.setUint16(4, 20, true); directoryView.setUint16(6, 20, true); directoryView.setUint16(8, 0x0800, true)
    directoryView.setUint32(16, checksum, true); directoryView.setUint32(20, data.length, true); directoryView.setUint32(24, data.length, true); directoryView.setUint16(28, name.length, true); directoryView.setUint32(42, offset, true); directory.set(name, 46)
    central.push(directory); offset += header.length + data.length
  }
  const centralSize = central.reduce((sum, value) => sum + value.length, 0), end = new Uint8Array(22), endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true)
  return new Blob([...local, ...central, end], { type: 'application/zip' })
}

export function downloadZip(entries, fileName) {
  const blob = createStoredZip(entries)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function renderReportForArchive(report) {
  const previewUrl = report.reportType === 'dc' ? await getDcReportPreviewUrl(report.id) : await get360ReportPreviewUrl(report.id)
  const iframe = document.createElement('iframe')
  iframe.src = previewUrl
  iframe.style.cssText = `position:fixed;left:-10000px;width:${report.reportType === 'dc' ? 1123 : 1080}px;height:${report.reportType === 'dc' ? 794 : 800}px;border:0`
  document.body.appendChild(iframe)
  try {
    await new Promise((resolve, reject) => { iframe.onload = resolve; iframe.onerror = () => reject(new Error(`Unable to render ${report.name}'s report.`)) })
    const result = report.reportType === 'dc' ? await downloadDcPreviewPdf(iframe, report.name, false) : await download360PreviewPdf(iframe, report.name, false)
    const cohort = String(report.cohortName || 'Unassigned cohort').replace(/[<>:"/\\|?*]/g, '-')
    const employee = String(report.employeeId || report.id).replace(/[<>:"/\\|?*]/g, '-')
    return { data: result.data, name: `${cohort}/${employee} - ${result.fileName}` }
  } finally { iframe.remove(); URL.revokeObjectURL(previewUrl) }
}

export async function downloadReportArchive(reports = []) {
  if (!reports.length) throw new Error('No reports are available for this download.')
  const entries = []
  for (const report of reports) entries.push(await renderReportForArchive(report))
  const blob = createStoredZip(entries)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'reports-pdf.zip'
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
