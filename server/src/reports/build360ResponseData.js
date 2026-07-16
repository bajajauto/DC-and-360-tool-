import XLSX from 'xlsx'
import { httpError } from '../utils/httpError.js'
import { getSurveySections, SURVEY_SECTIONS } from '../../../src/data/surveyConfig.js'
import { relationshipGroup } from './generate360Report.js'

const GROUP_LABELS = {
  self: 'Self',
  rm: 'Reporting Manager',
  skip: 'Skip Manager / BU Head',
  peer: 'Peer',
  dr: 'Direct Report',
  ic: 'Internal Customer',
}

async function loadParticipant(db, participantId) {
  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      user: true,
      cohort: true,
      nominees: true,
      feedbackTasks: {
        include: {
          nominee: true,
          respondent: true,
          responses: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!participant) throw httpError(404, 'Participant not found')
  return participant
}

function assignRespondentCodes(tasks) {
  const codes = new Map()
  tasks.forEach((task, index) => {
    codes.set(task.id, `R${String(index + 1).padStart(2, '0')}`)
  })
  return codes
}

export async function build360ResponseDataWorkbook(db, participantId) {
  const participant = await loadParticipant(db, participantId)
  const codes = assignRespondentCodes(participant.feedbackTasks)
  const cohortName = participant.cohort?.name || '-'

  const ratingsRows = [[
    'Cohort', 'Participant Ticket ID', 'Participant Name', 'Respondent Code', 'Respondent Group',
    'Section', 'Competency', 'Statement ID', 'Statement', 'Rating',
  ]]
  const commentsRows = [[
    'Cohort', 'Participant Ticket ID', 'Participant Name', 'Respondent Code', 'Respondent Group',
    'Section', 'Type', 'Comment', 'Character Count', 'Included In Report (30+ chars)',
  ]]
  const statusRows = [[
    'Cohort', 'Participant Ticket ID', 'Participant Name', 'Respondent Code', 'Respondent Group',
    'External', 'Status', 'Submitted At',
  ]]

  for (const task of participant.feedbackTasks) {
    const code = codes.get(task.id)
    const group = GROUP_LABELS[relationshipGroup(task.relationship)] || task.relationship
    const isExternal = !task.respondentId

    statusRows.push([
      cohortName,
      participant.user.employeeId || '-',
      participant.user.name,
      code,
      group,
      isExternal ? 'Yes' : 'No',
      task.status === 'SUBMITTED' ? 'Responded' : task.status === 'SAVED' ? 'In Progress' : 'Invited',
      task.submittedAt?.toISOString() || '',
    ])

    if (task.status !== 'SUBMITTED') continue
    const response = task.responses?.[0]
    if (!response) continue

    const sections = getSurveySections(task.relationship)
    for (const section of sections) {
      for (const competency of section.competencies) {
        for (const behaviour of competency.behaviours) {
          const rating = response.ratings?.[behaviour.id]
          if (typeof rating !== 'number') continue
          ratingsRows.push([
            cohortName,
            participant.user.employeeId || '-',
            participant.user.name,
            code,
            group,
            section.title,
            competency.title,
            behaviour.id,
            behaviour.text,
            rating,
          ])
        }
      }
    }

    for (const section of SURVEY_SECTIONS) {
      const sectionComments = response.sectionSsc?.[section.id]
      if (!sectionComments) continue
      for (const key of ['start', 'stop', 'continue']) {
        const text = String(sectionComments[key] || '').trim()
        if (!text) continue
        commentsRows.push([
          cohortName,
          participant.user.employeeId || '-',
          participant.user.name,
          code,
          group,
          section.title,
          key.charAt(0).toUpperCase() + key.slice(1),
          text,
          text.length,
          text.length >= 30 ? 'Yes' : 'No',
        ])
      }
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(ratingsRows), 'Ratings')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(commentsRows), 'SSC Comments')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(statusRows), 'Respondent Status')

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  const fileName = `${(participant.user.employeeId || participant.id)}-360-response-data.xlsx`

  return { buffer, fileName }
}
