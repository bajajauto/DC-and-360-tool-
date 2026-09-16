export function matchAssessorFiles(files, participants) {
  const entries = Array.from(files).map((file, id) => {
    const match = /^(?:DC|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2})_([a-z0-9-]+)\.(xlsx|xls)$/i.exec(file.name)
    const employeeId = match?.[1].toUpperCase() || ''
    const matches = participants.filter((row) => String(row.employeeId || '').trim().toUpperCase() === employeeId)
    const participant = matches.length === 1 ? matches[0] : null
    let error = !match ? 'Use DC_EMPLOYEEID.xlsx or Aug26_EMPLOYEEID.xlsx.'
      : !file.size ? 'File is empty.'
      : file.size > 7_000_000 ? 'File exceeds 7 MB.'
      : !matches.length ? 'Employee not found in the selected cohort.'
      : matches.length > 1 ? 'Employee has multiple participants. Select a specific cohort.' : ''
    return { id, file, employeeId, participant, status: error ? 'blocked' : 'ready', detail: error }
  })
  const counts = new Map()
  for (const entry of entries) {
    if (entry.employeeId) counts.set(entry.employeeId, (counts.get(entry.employeeId) || 0) + 1)
  }
  return entries.map((entry) => counts.get(entry.employeeId) > 1
    ? { ...entry, status: 'blocked', detail: 'Multiple files for this employee. Select only one workbook.' } : entry)
}

export async function processAssessorEntry(entry, { readFile, upload, generate, onUploaded, onStatus }) {
  if (entry.status !== 'report-error') {
    onStatus('uploading', 'Uploading workbook…')
    try {
      const dataUrl = await readFile(entry.file)
      const { data } = await upload(entry.participant.participantId, {
        fileName: entry.file.name,
        mimeType: entry.file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: entry.file.size,
        dataUrl,
      })
      onUploaded(entry.participant.participantId, data.workbook)
    } catch (error) {
      onStatus('upload-error', `Upload failed: ${error.message}`)
      return
    }
  }
  onStatus('generating', 'Workbook saved. Generating DC report…')
  try {
    await generate(entry.participant.participantId)
    onStatus('done', 'Workbook saved and DC report generated.')
  } catch (error) {
    onStatus('report-error', `Workbook saved. DC report failed: ${error.message}`)
  }
}
