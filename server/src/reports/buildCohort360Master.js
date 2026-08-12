import XLSX from 'xlsx'
import { httpError } from '../utils/httpError.js'
import { getSurveySections, SURVEY_SECTIONS } from '../../../src/data/surveyConfig.js'
import { relationshipGroup } from './generate360Report.js'

const COMPETENCIES = SURVEY_SECTIONS.flatMap((section) =>
  section.competencies.map((competency) => ({
    id: competency.id,
    code: competency.id === 'icex' ? 'ICEx' : competency.id.toUpperCase(),
    section: section.title,
  })),
)

const GROUP_LABELS = {
  self: 'Self',
  rm: 'Reporting Manager',
  skip: 'Skip / BU Head',
  peer: 'Peers/IC/External',
  dr: 'Direct Reports',
  ic: 'Peers/IC/External',
}

function dcDate(cohort) {
  const date = cohort.eventStart || cohort.eventEnd
  return date ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date).replace(' ', '-') : ''
}

function submittedOn(task) {
  return task.submittedAt ? task.submittedAt.toISOString().slice(0, 10) : ''
}

function respondentCodes(tasks) {
  const counts = new Map()
  const codes = new Map()
  for (const task of tasks) {
    const key = relationshipGroup(task.relationship)
    if (key === 'self') {
      codes.set(task.id, 'SELF')
      continue
    }
    const prefix = { rm: 'RM', skip: 'SKIP', peer: 'PEER', dr: 'DR', ic: 'IC' }[key] || 'RESP'
    const next = (counts.get(prefix) || 0) + 1
    counts.set(prefix, next)
    codes.set(task.id, ['RM', 'SKIP'].includes(prefix) && next === 1 ? prefix : `${prefix}-${next}`)
  }
  return codes
}

function hazenPercentile(value, values) {
  const sorted = [...values].sort((a, b) => a - b)
  const first = sorted.findIndex((item) => item === value)
  const last = sorted.length - 1 - [...sorted].reverse().findIndex((item) => item === value)
  const averageRank = ((first + 1) + (last + 1)) / 2
  return ((averageRank - 0.5) / sorted.length) * 100
}

function sheet(rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = widths.map((wch) => ({ wch }))
  ws['!autofilter'] = { ref: ws['!ref'] }
  return ws
}

export async function buildCohort360MasterWorkbook(db) {
  const cohorts = await db.cohort.findMany({
    include: {
      participants: {
        orderBy: { user: { name: 'asc' } },
        include: {
          user: true,
          feedbackTasks: {
            where: { status: 'SUBMITTED' },
            orderBy: { createdAt: 'asc' },
            include: { responses: true },
          },
        },
      },
    },
    orderBy: [{ eventStart: 'asc' }, { createdAt: 'asc' }],
  })
  if (!cohorts.length) throw httpError(404, 'No cohorts are available to export')

  const ratingRows = [['Cohort', 'DC Date', 'Participant Name', 'Ticket ID', 'Statement ID', 'Competency (Code)', 'Section', 'Respondent Group', 'Respondent ID (anon)', 'Rating (1-4 / NA)', 'Submitted On']]
  const commentRows = [['Cohort', 'DC Date', 'Participant Name', 'Ticket ID', 'Section #', 'Section Name', 'Respondent Group', 'Respondent ID (anon)', 'Start doing', 'Stop doing', 'Continue doing', 'Submitted On']]
  const scores = []

  for (const cohort of cohorts) {
    for (const participant of cohort.participants) {
      const codes = respondentCodes(participant.feedbackTasks)
      const buckets = new Map(COMPETENCIES.map((item) => [item.id, { self: [], others: [] }]))
      for (const task of participant.feedbackTasks) {
        const response = task.responses?.[0]
        if (!response) continue
        const groupKey = relationshipGroup(task.relationship)
        const group = GROUP_LABELS[groupKey] || task.relationship
        const code = codes.get(task.id)
        for (const section of getSurveySections(task.relationship)) {
          for (const competency of section.competencies) {
            for (const behaviour of competency.behaviours) {
              const rating = response.ratings?.[behaviour.id]
              if (typeof rating !== 'number') continue
              ratingRows.push([cohort.name, dcDate(cohort), participant.user.name, participant.user.employeeId || '', behaviour.id, competency.id === 'icex' ? 'ICEx' : competency.id.toUpperCase(), section.title, group, code, rating, submittedOn(task)])
              buckets.get(competency.id)?.[groupKey === 'self' ? 'self' : 'others'].push(rating)
            }
          }
        }
        SURVEY_SECTIONS.forEach((section, index) => {
          const comments = response.sectionSsc?.[section.id]
          if (!comments || !['start', 'stop', 'continue'].some((key) => String(comments[key] || '').trim())) return
          commentRows.push([cohort.name, dcDate(cohort), participant.user.name, participant.user.employeeId || '', index + 1, section.title, group, code, comments.start || '', comments.stop || '', comments.continue || '', submittedOn(task)])
        })
      }
      for (const competency of COMPETENCIES) {
        const bucket = buckets.get(competency.id)
        const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
        scores.push({ cohort: cohort.name, name: participant.user.name, ticket: participant.user.employeeId || '', competency: competency.code, others: mean(bucket.others) })
      }
    }
  }

  const percentileRows = []
  for (const competency of COMPETENCIES) {
    const competencyScores = scores.filter((row) => row.competency === competency.code && row.others != null)
    const values = competencyScores.map((row) => row.others)
    for (const row of competencyScores) {
      const percentile = hazenPercentile(row.others, values)
      percentileRows.push([row.cohort, row.name, row.ticket, competency.code, row.others, percentile, percentile <= 25 ? 'Low' : percentile <= 75 ? 'Medium' : 'High'])
    }
  }

  const workbenchRows = [['Cohort', 'Participant Name', 'Ticket ID', 'Competency', 'Others Score (non-Self only)', 'Percentile (Hazen)', 'Band'], ...percentileRows]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet(ratingRows, [22, 12, 24, 16, 16, 20, 28, 24, 22, 18, 14]), 'Raw_Ratings_TEMPLATE')
  XLSX.utils.book_append_sheet(workbook, sheet(commentRows, [22, 12, 24, 16, 12, 28, 24, 22, 42, 42, 42, 14]), 'Raw_Comments_TEMPLATE')
  XLSX.utils.book_append_sheet(workbook, sheet(workbenchRows, [24, 26, 16, 20, 28, 22, 14]), 'Percentile_Workbench')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  return { buffer, fileName: 'All-Cohorts-360-Master-Response-Data.xlsx' }
}
