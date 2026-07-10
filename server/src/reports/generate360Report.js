import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { SURVEY_SECTIONS } from '../../../src/data/surveyConfig.js'
import { httpError } from '../utils/httpError.js'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')
const templatePath = path.join(serverRoot, 'templates', '360-degree-report-template.pptx')
const reportsDirectory = path.join(serverRoot, 'generated', 'reports')
const scriptPath = path.join(serverRoot, 'scripts', 'populatePptxTemplate.ps1')

const GROUP_KEYS = ['self', 'others', 'dr', 'rm', 'skip', 'peer', 'ic']

const RELATIONSHIP_GROUPS = {
  SELF: 'self',
  REPORTING_MANAGER: 'rm',
  'Reporting Manager': 'rm',
  SKIP_MANAGER: 'skip',
  BU_HEAD: 'skip',
  'Skip Manager': 'skip',
  'BU Head': 'skip',
  PEER: 'peer',
  'Peer / Internal Customer': 'peer',
  DIRECT_REPORT: 'dr',
  'Direct Report': 'dr',
  INTERNAL_CUSTOMER: 'ic',
  'Internal Customer': 'ic',
}

const COMPETENCY_OVERVIEW_CODES = {
  gi: 'gi',
  spc: 'spc',
  cipc: 'cipc',
  dep: 'dep',
  amt: 'amt',
  cwai: 'cai',
  ice: 'icex',
  acfs: 'acfs',
}

const SECTION_NUMBER_BY_ID = {
  'task-execution': 1,
  'people-relationships': 2,
  culture: 3,
  'strategy-change': 4,
}

const BEHAVIOURS = SURVEY_SECTIONS.flatMap((section) =>
  section.competencies.flatMap((competency) =>
    competency.behaviours.map((behaviour) => ({
      ...behaviour,
      sectionId: section.id,
      competencyId: competency.id,
    })),
  ),
)

function relationshipGroup(relationship = '') {
  return RELATIONSHIP_GROUPS[relationship] || 'peer'
}

function participantSlug(participant) {
  const employeeId = participant.user.employeeId || participant.id
  const name = participant.user.name || 'participant'
  return `${employeeId}-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function participantNameSlug(participant) {
  return (participant.user.name || 'participant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatMonth(date = new Date()) {
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
}

function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-'
  return Number(value).toFixed(1)
}

function average(values) {
  const valid = values.filter((value) => typeof value === 'number' && !Number.isNaN(value))
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function scoreGap(selfScore, othersScore) {
  if (selfScore === null || othersScore === null) return '-'
  const gap = selfScore - othersScore
  if (Math.abs(gap) < 0.05) return '0.0'
  return `${gap > 0 ? '+' : ''}${gap.toFixed(1)}`
}

function scoreIsVisible(group, respondentCount) {
  if (['self', 'rm', 'skip', 'others'].includes(group)) return respondentCount > 0
  return respondentCount >= 2
}

function getTaskRating(task, behaviourId) {
  const response = task.responses?.[0]
  const value = response?.ratings?.[behaviourId]
  return typeof value === 'number' ? value : null
}

function getScore(tasks, behaviourIds, group) {
  const scopedTasks = group === 'others'
    ? tasks.filter((task) => relationshipGroup(task.relationship) !== 'self')
    : tasks.filter((task) => relationshipGroup(task.relationship) === group)

  const values = []
  const respondentIdsWithRatings = new Set()

  for (const task of scopedTasks) {
    for (const behaviourId of behaviourIds) {
      const rating = getTaskRating(task, behaviourId)
      if (rating !== null) {
        values.push(rating)
        respondentIdsWithRatings.add(task.id)
      }
    }
  }

  if (!values.length || !scoreIsVisible(group, respondentIdsWithRatings.size)) return null
  return average(values)
}

function countByGroup(items, getRelationship) {
  return items.reduce((counts, item) => {
    const group = relationshipGroup(getRelationship(item))
    counts[group] = (counts[group] || 0) + 1
    return counts
  }, {})
}

function collectSectionComments(tasks, sectionId, key, group = 'others') {
  const comments = []

  for (const task of tasks) {
    const taskGroup = relationshipGroup(task.relationship)
    if (group === 'others' && taskGroup === 'self') continue
    if (group !== 'others' && taskGroup !== group) continue

    const value = task.responses?.[0]?.sectionSsc?.[sectionId]?.[key]
    if (typeof value === 'string' && value.trim()) {
      comments.push(value.trim())
    }
  }

  if (!comments.length) return '-'
  return [...new Set(comments)].join('; ')
}

function buildReportTokens(participant) {
  const submittedTasks = participant.feedbackTasks.filter((task) => task.status === 'SUBMITTED')
  const nominatedCounts = countByGroup(participant.nominees, (nominee) => nominee.relationship)
  const respondedCounts = countByGroup(submittedTasks, (task) => task.relationship)
  const tokens = {
    ticket_id: participant.user.employeeId || '-',
    cohort: participant.cohort?.name || '-',
    report_month: formatMonth(),
    participant_name: participant.user.name || '-',
    mix_self_resp: String(respondedCounts.self || 0),
    mix_rm_resp: String(respondedCounts.rm || 0),
    mix_skip_resp: String(respondedCounts.skip || 0),
    mix_peer_ic_resp: String((respondedCounts.peer || 0) + (respondedCounts.ic || 0)),
    mix_dr_resp: String(respondedCounts.dr || 0),
    mix_total_resp: String(submittedTasks.length),
  }

  BEHAVIOURS.forEach((behaviour, index) => {
    const key = `s${String(index + 1).padStart(2, '0')}`
    for (const group of GROUP_KEYS) {
      tokens[`${key}_${group}`] = formatScore(getScore(submittedTasks, [behaviour.id], group))
    }
  })

  for (const section of SURVEY_SECTIONS) {
    const sectionNumber = SECTION_NUMBER_BY_ID[section.id]
    if (!sectionNumber) continue

    tokens[`ssc_sec${sectionNumber}_start`] = collectSectionComments(submittedTasks, section.id, 'start')
    tokens[`ssc_sec${sectionNumber}_stop`] = collectSectionComments(submittedTasks, section.id, 'stop')
    tokens[`ssc_sec${sectionNumber}_continue`] = collectSectionComments(submittedTasks, section.id, 'continue')
    tokens[`ssc_sec${sectionNumber}_self`] = collectSectionComments(submittedTasks, section.id, 'continue', 'self')
  }

  for (const section of SURVEY_SECTIONS) {
    for (const competency of section.competencies) {
      const overviewCode = COMPETENCY_OVERVIEW_CODES[competency.id]
      if (!overviewCode) continue

      const behaviourIds = competency.behaviours.map((behaviour) => behaviour.id)
      const selfScore = getScore(submittedTasks, behaviourIds, 'self')
      const othersScore = getScore(submittedTasks, behaviourIds, 'others')
      tokens[`ov_${overviewCode}_self`] = formatScore(selfScore)
      tokens[`ov_${overviewCode}_others`] = formatScore(othersScore)
      tokens[`ov_${overviewCode}_gap`] = scoreGap(selfScore, othersScore)
    }
  }

  return {
    tokens,
    nominatedCounts: [
      nominatedCounts.skip || 0,
      (nominatedCounts.peer || 0) + (nominatedCounts.ic || 0),
      nominatedCounts.dr || 0,
    ],
    scoreFallback: '-',
  }
}

async function getParticipantForReport(db, participantId) {
  let participant = await db.participant.findUnique({
    where: { id: participantId },
    include: {
      user: true,
      cohort: true,
      nominees: true,
      feedbackTasks: {
        include: {
          nominee: true,
          responses: true,
        },
      },
    },
  })

  if (!participant) {
    const participants = await db.participant.findMany({
      include: {
        user: true,
        cohort: true,
        nominees: true,
        feedbackTasks: {
          include: {
            nominee: true,
            responses: true,
          },
        },
      },
    })

    participant = participants.find((item) => participantSlug(item) === participantId || participantNameSlug(item) === participantId)
  }

  if (!participant) throw httpError(404, 'Participant not found')
  if (!participant.feedbackTasks.length) throw httpError(400, 'No 360 feedback tasks found for this participant')

  const incompleteTasks = participant.feedbackTasks.filter((task) => task.status !== 'SUBMITTED')
  if (incompleteTasks.length) {
    throw httpError(409, '360 report can be generated only after all nominees have submitted feedback')
  }

  return participant
}

async function renderPptx(replacements, outputPath) {
  const replacementsPath = `${outputPath}.replacements.json`
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(replacementsPath, JSON.stringify(replacements), 'utf8')

  try {
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      scriptPath,
      '-TemplatePath',
      templatePath,
      '-OutputPath',
      outputPath,
      '-ReplacementsPath',
      replacementsPath,
    ], { windowsHide: true, maxBuffer: 1024 * 1024 })
  } finally {
    await fs.rm(replacementsPath, { force: true })
  }
}

async function saveReportRecord(db, participant, outputPath) {
  const existing = await db.report.findFirst({
    where: {
      participantId: participant.id,
      type: '360',
    },
  })

  const data = {
    status: 'GENERATED',
    fileUrl: outputPath,
    generatedAt: new Date(),
  }

  if (existing) {
    return db.report.update({
      where: { id: existing.id },
      data,
    })
  }

  return db.report.create({
    data: {
      participantId: participant.id,
      type: '360',
      ...data,
    },
  })
}

export async function generate360ReportForParticipant(db, participantId) {
  const participant = await getParticipantForReport(db, participantId)
  const fileName = `${participantSlug(participant)}-360-report.pptx`
  const outputPath = path.join(reportsDirectory, fileName)
  const replacements = buildReportTokens(participant)

  await renderPptx(replacements, outputPath)
  const report = await saveReportRecord(db, participant, outputPath)

  await db.participant.update({
    where: { id: participant.id },
    data: {
      reportStatus: 'GENERATED',
      progress: 100,
      lastActivityAt: new Date(),
    },
  })

  return {
    report,
    outputPath,
    fileName,
  }
}

export async function getOrGenerate360Report(db, participantId) {
  const participant = await getParticipantForReport(db, participantId)
  const existing = await db.report.findFirst({
    where: {
      participantId: participant.id,
      type: '360',
      status: 'GENERATED',
    },
  })

  if (existing?.fileUrl) {
    try {
      await fs.access(existing.fileUrl)
      return {
        report: existing,
        outputPath: existing.fileUrl,
        fileName: path.basename(existing.fileUrl),
      }
    } catch {
      // Regenerate below if the database points to a missing file.
    }
  }

  return generate360ReportForParticipant(db, participant.id)
}
