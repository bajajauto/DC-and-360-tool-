import { processSteps } from '../data/adminData'

const trackerSteps = processSteps.filter((step) => step.id !== 'application')
const masterTrackerSteps = trackerSteps.filter((step) => !['assessment', 'report'].includes(step.id))

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

function taskState(participant, step) {
  return participant.taskStatus?.[step.id] || 'pending'
}

function doneOrNotDone(participant, step) {
  return taskState(participant, step) === 'completed' ? 'Done' : 'Not done'
}

function reportAuditFields(participant) {
  const reports = participant.reportStatuses || participant.reports || []
  const report360 = reports.find((report) => String(report.type).toLowerCase() === '360')
  const dcReport = reports.find((report) => String(report.type).toLowerCase() === 'dc')
  const isGenerated = (report) => Boolean(report && ['generated', 'released'].includes(String(report.status).toLowerCase()))
  const isVisible = (report) => String(report?.status || '').toLowerCase() === 'released'
  return [
    isGenerated(report360) ? 'Generated' : 'Not generated',
    isVisible(report360) ? 'Visible' : 'Not visible',
    participant.assessorTemplateUploaded || participant.taskStatus?.assessment === 'completed' ? 'Uploaded' : 'Not uploaded',
    isGenerated(dcReport) ? 'Generated' : 'Not generated',
    isVisible(dcReport) ? 'Visible' : 'Not visible',
  ]
}

const reportAuditHeaders = ['360 report generated', '360 report visibility', 'Assessor Template Upload', 'DC report generated', 'DC report visible']

function liveStage(participant) {
  if (trackerSteps.every((step) => taskState(participant, step) === 'completed')) return 'Completed'
  if (trackerSteps.every((step) => ['pending', 'locked'].includes(taskState(participant, step)))) return 'Not started'
  const current = trackerSteps.find((step) => ['in-progress', 'pending'].includes(taskState(participant, step)))
  return current?.label || 'In progress'
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
    ['Participant', 'Employee ID', 'Cohort', 'Designation', 'Business unit', 'Current stage', 'Self 360', 'Other responses received', 'Other respondents', 'Other responses pending', ...reportAuditHeaders, 'Last activity', ...trackerSteps.map((step) => step.label)],
    [
      participant.name,
      participant.employeeId,
      cohortName,
      participant.designation,
      participant.bu,
      liveStage(participant),
      participant.selfFeedback?.status === 'submitted' ? 'Done' : 'Not done',
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      ...reportAuditFields(participant),
      participant.lastActivity,
      ...trackerSteps.map((step) => doneOrNotDone(participant, step)),
    ],
  ]

  downloadWorkbook(`${participant.employeeId}-${participant.name.replace(/\s+/g, '-')}-process-status.xls`, [
    rowsToWorksheet('Process status', processRows),
  ])
}

export function exportParticipantNomineeStatus(participant) {
  const nomineeRows = [
    ['Participant', 'Employee ID', 'Participant designation', 'Business unit', 'Relationship', 'Nominee name', 'Nominee email', '360 form status', 'Nominated on', 'Responded on'],
    [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      'Self',
      `${participant.name} (Self)`,
      participant.email || '',
      participant.selfFeedback?.status === 'submitted' ? 'Done' : 'Not done',
      '',
      participant.selfFeedback?.respondedOn || '',
    ],
    ...(participant.nominees || []).map((nominee) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      nominee.relationship,
      nominee.name,
      nominee.email,
      nominee.feedbackStatus === 'submitted' ? 'Done' : 'Not done',
      nominee.submittedAt || '',
      nominee.respondedOn || '',
    ]),
  ]

  downloadWorkbook(`${participant.employeeId}-${participant.name.replace(/\s+/g, '-')}-360-nominee-status.xls`, [
    rowsToWorksheet('360 nominees', nomineeRows),
  ])
}

export function exportCohortProcessStatus(cohort, participants) {
  const processRows = [
    ['Participant', 'Employee ID', 'Designation', 'Business unit', 'Current stage', 'Self 360', 'Other responses received', 'Other respondents', 'Other responses pending', ...reportAuditHeaders, 'Last activity', ...masterTrackerSteps.map((step) => step.label)],
    ...participants.map((participant) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      liveStage(participant),
      participant.selfFeedback?.status === 'submitted' ? 'Done' : 'Not done',
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      ...reportAuditFields(participant),
      participant.lastActivity,
      ...masterTrackerSteps.map((step) => doneOrNotDone(participant, step)),
    ]),
  ]

  downloadWorkbook(`${cohort.id}-process-status.xls`, [
    rowsToWorksheet('Process status', processRows),
  ])
}

export function exportBuhrProcessStatus(businessUnit, participants) {
  const processRows = [
    ['Participant', 'Employee ID', 'Designation', 'Business unit', 'Cohort', 'Current stage', 'Nominations', 'Self 360', 'Other responses received', 'Other respondents', 'Other responses pending', ...reportAuditHeaders, 'Last activity', ...masterTrackerSteps.map((step) => step.label)],
    ...participants.map((participant) => [
      participant.name,
      participant.employeeId,
      participant.designation,
      participant.bu,
      participant.cohort?.name || 'Unassigned',
      liveStage(participant),
      participant.nominees?.length || 0,
      participant.selfFeedback?.status === 'submitted' ? 'Done' : 'Not done',
      participant.responses,
      participant.totalResponses,
      Math.max(0, participant.totalResponses - participant.responses),
      ...reportAuditFields(participant),
      participant.lastActivity,
      ...masterTrackerSteps.map((step) => doneOrNotDone(participant, step)),
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
    ...participants.flatMap((participant) => [
      [
        participant.name,
        participant.employeeId,
        participant.designation,
        participant.bu,
        'Self',
        `${participant.name} (Self)`,
        participant.email || '',
        participant.selfFeedback?.status === 'submitted' ? 'Done' : 'Not done',
        '',
        participant.selfFeedback?.respondedOn || '',
      ],
      ...(participant.nominees || []).map((nominee) => [
        participant.name,
        participant.employeeId,
        participant.designation,
        participant.bu,
        nominee.relationship,
        nominee.name,
        nominee.email,
        nominee.feedbackStatus === 'submitted' ? 'Done' : 'Not done',
        nominee.submittedAt || '',
        nominee.respondedOn || '',
      ]),
    ]),
  ]

  downloadWorkbook(`${cohort.id}-360-nominee-status.xls`, [
    rowsToWorksheet('360 nominees', nomineeRows),
  ])
}
