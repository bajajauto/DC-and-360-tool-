import XLSX from 'xlsx-js-style'
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

function inclusivePercentile(value, values) {
  if (values.length === 1) return 50
  const lowerCount = values.filter((item) => item < value).length
  const tiedCount = values.filter((item) => item === value).length
  return ((lowerCount + (tiedCount - 1) / 2) / (values.length - 1)) * 100
}

function sheet(rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = widths.map((wch) => ({ wch }))
  ws['!autofilter'] = { ref: ws['!ref'] }
  return ws
}

const thinGrayBorder = {
  top: { style: 'thin', color: { rgb: 'D9E1F2' } },
  bottom: { style: 'thin', color: { rgb: 'D9E1F2' } },
  left: { style: 'thin', color: { rgb: 'D9E1F2' } },
  right: { style: 'thin', color: { rgb: 'D9E1F2' } },
}

const BAND_STYLES = {
  Low: { fill: 'FDE9E7', font: 'C00000' },
  Medium: { fill: 'FFF2CC', font: '9C6500' },
  High: { fill: 'E2F0D9', font: '006100' },
}

function styleHeaderRow(ws, lastColumn, { fill = '1F4E78', color = 'FFFFFF' } = {}) {
  for (let column = 0; column <= lastColumn; column += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: column })
    if (!ws[address]) continue
    ws[address].s = {
      fill: { patternType: 'solid', fgColor: { rgb: fill } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: color } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thinGrayBorder,
    }
  }
  ws['!rows'] = [{ hpt: 24 }]
}

function stylePlainDataSheet(ws, lastColumn) {
  styleHeaderRow(ws, lastColumn)
  ws['!autofilter'] = { ref: ws['!ref'] }
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
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
    const competencyRows = scores.filter((row) => row.competency === competency.code)
    const values = competencyRows.filter((row) => row.others != null).map((row) => row.others)
    for (const row of competencyRows) {
      if (row.others == null) {
        percentileRows.push([row.cohort, row.name, row.ticket, competency.code, '', '', ''])
        continue
      }
      const percentile = inclusivePercentile(row.others, values)
      percentileRows.push([row.cohort, row.name, row.ticket, competency.code, row.others, percentile, percentile <= 25 ? 'Low' : percentile <= 75 ? 'Medium' : 'High'])
    }
  }

  const workbenchRows = [['Cohort', 'Participant Name', 'Ticket ID', 'Competency', 'Others Score (non-Self only)', 'Percentile (0-100)', 'Band', '', 'Band Rules', 'Definition'], ...percentileRows]
  const notes = [
    ['Low', '0 to 25'],
    ['Medium', '>25 to 75'],
    ['High', '>75 to 100'],
    ['', ''],
    ['Calculation', 'Method'],
    ['Others Score', 'Average of numeric ratings where Respondent Group is not Self'],
    ['Percentile', '0-100 percentile rank within the same competency; tied scores use average rank'],
    ['Comparison pool', 'All participants with a non-Self score, across cohorts, for that competency'],
    ['Auto-update', 'Generated from all submitted tool responses whenever this workbook is downloaded'],
  ]
  notes.forEach(([label, definition], index) => {
    if (!workbenchRows[index + 1]) workbenchRows[index + 1] = []
    workbenchRows[index + 1][8] = label
    workbenchRows[index + 1][9] = definition
  })

  const workbook = XLSX.utils.book_new()
  const ratingsSheet = sheet(ratingRows, [22, 12, 24, 16, 16, 20, 28, 24, 22, 18, 14])
  const commentsSheet = sheet(commentRows, [22, 12, 24, 16, 12, 28, 24, 22, 42, 42, 42, 14])
  stylePlainDataSheet(ratingsSheet, 10)
  stylePlainDataSheet(commentsSheet, 11)
  XLSX.utils.book_append_sheet(workbook, ratingsSheet, 'Raw_Ratings_TEMPLATE')
  XLSX.utils.book_append_sheet(workbook, commentsSheet, 'Raw_Comments_TEMPLATE')
  const percentileSheet = sheet(workbenchRows, [16, 28, 13, 14, 25, 19, 12, 3, 18, 48])
  percentileSheet['!autofilter'] = { ref: `A1:G${workbenchRows.length}` }
  percentileSheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
  styleHeaderRow(percentileSheet, 6)
  for (const column of [8, 9]) {
    const address = XLSX.utils.encode_cell({ r: 0, c: column })
    percentileSheet[address].s = {
      fill: { patternType: 'solid', fgColor: { rgb: 'D9EAF7' } },
      font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1F1F1F' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thinGrayBorder,
    }
  }
  for (const row of [5]) {
    for (const column of [8, 9]) {
      const address = XLSX.utils.encode_cell({ r: row, c: column })
      if (!percentileSheet[address]) continue
      percentileSheet[address].s = {
        fill: { patternType: 'solid', fgColor: { rgb: 'D9EAF7' } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1F1F1F' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: thinGrayBorder,
      }
    }
  }
  for (let row = 2; row <= workbenchRows.length; row += 1) {
    if (percentileSheet[`E${row}`]?.t === 'n') percentileSheet[`E${row}`].z = '0.00'
    if (percentileSheet[`F${row}`]?.t === 'n') percentileSheet[`F${row}`].z = '0.0'
    const bandCell = percentileSheet[`G${row}`]
    const bandStyle = BAND_STYLES[bandCell?.v]
    if (bandCell && bandStyle) {
      bandCell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: bandStyle.fill } },
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: bandStyle.font } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinGrayBorder,
      }
    }
  }
  XLSX.utils.book_append_sheet(workbook, percentileSheet, 'Percentile_Workbench')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true })
  return { buffer, fileName: 'All-Cohorts-360-Master-Response-Data.xlsx' }
}
