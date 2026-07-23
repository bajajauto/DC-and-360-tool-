import { processSteps } from '../data/adminData'

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeSheetName(name) {
  return escapeXml(name.replace(/[\[\]:*?/\\]/g, '').slice(0, 31) || 'Sheet')
}

function stepState(participant, index) {
  const completed = Math.floor((participant.progress / 100) * processSteps.length)
  if (processSteps[index].id === 'feedback' && participant.responses < participant.totalResponses) return 'Pending'
  if (processSteps[index].id === 'report' && participant.responses < participant.totalResponses) return 'Pending'
  if (index < completed) return 'Complete'
  if (index === completed) return 'Current'
  return 'Pending'
}

function doneOrNotDone(participant, index) {
  return stepState(participant, index) === 'Complete' ? 'Done' : 'Not done'
}

function rowsToWorksheet(name, rows) {
  const body = rows.map((row) => `
    <Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('')}</Row>`).join('')

  return `
  <Worksheet ss:Name="${safeSheetName(name)}">
    <Table>${body}
    </Table>
  </Worksheet>`
}

function downloadWorkbook(filename, worksheets) {
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  ${worksheets.join('')}
</Workbook>`
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportParticipantProcessStatus(participant, cohortName = '') {
  const processRows = [
    ['Participant', 'Employee ID', 'Cohort', 'Designation', 'Business unit', 'Current stage', 'Progress', 'Responses', 'Total responses', 'Pending responses', 'Report status', 'Last activity', ...processSteps.map((step) => step.label)],
    [
      participant.name,
      participant.employeeId,
      cohortName,
      participant.designation,
      participant.bu,
      participant.stage,
      `${participant.progress}%`,
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      participant.reportStatus,
      participant.lastActivity,
      ...processSteps.map((_, index) => doneOrNotDone(participant, index)),
    ],
  ]

  downloadWorkbook(`${participant.employeeId}-${participant.name.replace(/\s+/g, '-')}-process-status.xls`, [
    rowsToWorksheet('Process status', processRows),
  ])
}

export function exportParticipantNomineeStatus(participant) {
  const nomineeRows = [
    ['Participant', 'Employee ID', 'Participant designation', 'Business unit', 'Relationship', 'Nominee name', 'Nominee email', '360 form status', 'Nominated on', 'Responded on'],
    ...(participant.nominees || []).map((nominee) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      nominee.relationship,
      nominee.name,
      nominee.email,
      nominee.status === 'responded' ? 'Done' : 'Not done',
      nominee.nominatedOn,
      nominee.respondedOn || '',
    ]),
  ]

  downloadWorkbook(`${participant.employeeId}-${participant.name.replace(/\s+/g, '-')}-360-nominee-status.xls`, [
    rowsToWorksheet('360 nominees', nomineeRows),
  ])
}

export function exportCohortProcessStatus(cohort, participants) {
  const processRows = [
    ['Participant', 'Employee ID', 'Designation', 'Business unit', 'Current stage', 'Progress', 'Responses', 'Total responses', 'Pending responses', 'Report status', 'Last activity', ...processSteps.map((step) => step.label)],
    ...participants.map((participant) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      participant.stage,
      `${participant.progress}%`,
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      participant.reportStatus,
      participant.lastActivity,
      ...processSteps.map((_, index) => doneOrNotDone(participant, index)),
    ]),
  ]

  downloadWorkbook(`${cohort.id}-process-status.xls`, [
    rowsToWorksheet('Process status', processRows),
  ])
}

export function exportBuhrProcessStatus(businessUnit, participants) {
  const processRows = [
    ['Participant', 'Employee ID', 'Designation', 'Business unit', 'Cohort', 'Current stage', 'Progress', 'Nominations', 'Responses', 'Total responses', 'Pending responses', 'Report status', 'Last activity', ...processSteps.map((step) => step.label)],
    ...participants.map((participant) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      participant.cohort?.name || 'Unassigned',
      participant.stage,
      `${participant.progress}%`,
      participant.nominees?.length || 0,
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      participant.reportStatus,
      participant.lastActivity,
      ...processSteps.map((_, index) => doneOrNotDone(participant, index)),
    ]),
  ]

  const safeBusinessUnit = String(businessUnit || 'business-unit').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  downloadWorkbook(`${safeBusinessUnit}-master-tracker.xls`, [
    rowsToWorksheet('Master tracker', processRows),
  ])
}

export function exportCohortNomineeStatus(cohort, participants) {
  const nomineeRows = [
    ['Participant', 'Employee ID', 'Participant designation', 'Business unit', 'Relationship', 'Nominee name', 'Nominee email', '360 form status', 'Nominated on', 'Responded on'],
    ...participants.flatMap((participant) => (participant.nominees || []).map((nominee) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      nominee.relationship,
      nominee.name,
      nominee.email,
      nominee.status === 'responded' ? 'Done' : 'Not done',
      nominee.nominatedOn,
      nominee.respondedOn || '',
    ])),
  ]

  downloadWorkbook(`${cohort.id}-360-nominee-status.xls`, [
    rowsToWorksheet('360 nominees', nomineeRows),
  ])
}
