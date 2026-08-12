import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { SURVEY_SECTIONS, getBehaviourIds, getSurveySections } from '../../../src/data/surveyConfig.js'
import { httpError } from '../utils/httpError.js'
import { hasDeadlinePassed } from '../utils/deadlines.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')
// Point REPORTS_DIR at storage outside the deployment root in hosted environments;
// a deploy replaces the app directory and would otherwise wipe generated reports.
const reportsDirectory = process.env.REPORTS_DIR
  ? path.resolve(process.env.REPORTS_DIR)
  : path.join(serverRoot, 'generated', 'reports')
// Templates ship with the deployment, so these stay relative to the app directory.
const pptxTemplatePath = path.join(serverRoot, 'templates', '360-report', 'template.pptx')
const htmlTemplatePath = path.join(serverRoot, 'templates', '360-report', 'template.html')

let cachedHtmlTemplate = null

async function loadHtmlTemplate() {
  if (!cachedHtmlTemplate) cachedHtmlTemplate = await fs.readFile(htmlTemplatePath, 'utf8')
  return cachedHtmlTemplate
}

function hasCutoffPassed(cutoff, now = new Date()) {
  return hasDeadlinePassed(cutoff, now)
}

// self/rm/skip always show with >=1 respondent; others/dr/peer need >=2 (confidentiality, Rule 2)
const GROUP_KEYS = ['self', 'others', 'rm', 'skip', 'dr', 'peer']
const ALWAYS_VISIBLE_GROUPS = new Set(['self', 'rm', 'skip'])

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

export function relationshipGroup(relationship = '') {
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

// Rule 2: suppressed cells are blank, never 0 or a dash.
function formatScore(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return Number(value).toFixed(1)
}

function average(values) {
  const valid = values.filter((value) => typeof value === 'number' && !Number.isNaN(value))
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

// Inline SVG rather than a Unicode glyph: the template's fonts are subsetted to the
// characters used in the original design, so an arrow character risks silently not
// rendering. A vector shape renders regardless of font coverage.
const GAP_ARROW_UP = '▲'
const GAP_ARROW_DOWN = '▼'

// Rule 3: gap arrows, threshold 0.75, only when Others is itself shown.
function gapArrow(selfScore, othersScore) {
  if (selfScore === null || othersScore === null) return ''
  const gap = selfScore - othersScore
  if (gap >= 0.75) return GAP_ARROW_UP
  if (-gap >= 0.75) return GAP_ARROW_DOWN
  return ''
}

function scoreIsVisible(group, respondentCount) {
  if (ALWAYS_VISIBLE_GROUPS.has(group)) return respondentCount > 0
  return respondentCount >= 2
}

function getTaskRating(task, behaviourId) {
  const response = task.responses?.[0]
  const value = response?.ratings?.[behaviourId]
  return typeof value === 'number' ? value : null
}

// Rule 1 (Others aggregation) + Rule 2 (suppression). Skip/BU Head NA (Rule 4) is
// handled by the caller, which only passes seniorLeader-flagged behaviours here for skip.
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

// Rule 1: competency overall = mean of that competency's per-statement group means
// (computed first at statement level), not a flat mean of every raw rating.
function getCompetencyOverall(tasks, behaviourIds, group) {
  const statementMeans = behaviourIds
    .map((behaviourId) => getScore(tasks, [behaviourId], group))
    .filter((value) => value !== null)
  return average(statementMeans)
}

function countByGroup(items, getRelationship) {
  return items.reduce((counts, item) => {
    const group = relationshipGroup(getRelationship(item))
    counts[group] = (counts[group] || 0) + 1
    return counts
  }, {})
}

// Autofilled from respondent free text, per the product decision to not require a
// separate TD-coach authoring step: pool non-self respondents for start/stop/continue,
// and use the participant's own self-form text for the "self reflections" box.
function collectSectionComments(tasks, sectionId, key) {
  const comments = []
  for (const task of tasks) {
    if (relationshipGroup(task.relationship) === 'self') continue
    const value = task.responses?.[0]?.sectionSsc?.[sectionId]?.[key]
    if (typeof value === 'string' && value.trim()) comments.push(value.trim())
  }
  if (!comments.length) return ''
  return [...new Set(comments)].join(' ')
}

function collectSelfReflection(tasks, sectionId) {
  const selfTask = tasks.find((task) => relationshipGroup(task.relationship) === 'self')
  const sectionSsc = selfTask?.responses?.[0]?.sectionSsc?.[sectionId]
  if (!sectionSsc) return ''
  return ['start', 'stop', 'continue']
    .map((key) => (typeof sectionSsc[key] === 'string' ? sectionSsc[key].trim() : ''))
    .filter(Boolean)
    .join(' ')
}

function buildReportTokens(participant) {
  const submittedTasks = participant.feedbackTasks.filter((task) => task.status === 'SUBMITTED')
  const nominatedCounts = countByGroup(participant.nominees, (nominee) => nominee.relationship)
  const respondedCounts = countByGroup(submittedTasks, (task) => task.relationship)
  const peerIcNom = nominatedCounts.peer || 0
  const peerIcResp = respondedCounts.peer || 0
  const directReportsMeetMinimum = (respondedCounts.dr || 0) >= 2
  // The respondent-mix table displays Self as one nominated respondent, so the
  // total must include that same row as well as all nominee groups.
  const totalNom = 1 + (nominatedCounts.rm || 0) + (nominatedCounts.skip || 0) + peerIcNom + (nominatedCounts.dr || 0)
  const totalResp = submittedTasks.length

  const tokens = {
    ticket_id: participant.user.employeeId || '',
    cohort: participant.cohort?.name || '',
    report_month: formatMonth(),
    participant_name: participant.user.name || '',
    mix_self_nom: '1',
    mix_self_resp: String(respondedCounts.self || 0),
    mix_rm_nom: String(nominatedCounts.rm || 0),
    mix_rm_resp: String(respondedCounts.rm || 0),
    mix_skip_nom: String(nominatedCounts.skip || 0),
    mix_skip_resp: String(respondedCounts.skip || 0),
    mix_peer_ic_nom: String(peerIcNom),
    mix_peer_ic_resp: String(peerIcResp),
    mix_dr_nom: String(nominatedCounts.dr || 0),
    mix_dr_resp: String(respondedCounts.dr || 0),
    mix_total_nom: String(totalNom),
    mix_total_resp: String(totalResp),
  }

  BEHAVIOURS.forEach((behaviour, index) => {
    const key = `s${String(index + 1).padStart(2, '0')}`
    for (const group of GROUP_KEYS) {
      if (group === 'skip' && !behaviour.seniorLeader) {
        tokens[`${key}_${group}`] = 'NA' // Rule 4: outside Skip/BU Head's 15-statement subset
      } else if (group === 'dr' && !directReportsMeetMinimum) {
        tokens[`${key}_${group}`] = 'NA'
      } else {
        tokens[`${key}_${group}`] = formatScore(getScore(submittedTasks, [behaviour.id], group))
      }
    }
    // The nomination flow pools peers, internal customers and external stakeholders
    // into PEER. The PPT template exposes both Peer and Internal Customer columns,
    // so both columns must use that same confidential pooled score.
    tokens[`${key}_ic`] = tokens[`${key}_peer`]
  })

  for (const section of SURVEY_SECTIONS) {
    const sectionNumber = SECTION_NUMBER_BY_ID[section.id]
    if (!sectionNumber) continue
    tokens[`ssc_sec${sectionNumber}_start`] = collectSectionComments(submittedTasks, section.id, 'start')
    tokens[`ssc_sec${sectionNumber}_stop`] = collectSectionComments(submittedTasks, section.id, 'stop')
    tokens[`ssc_sec${sectionNumber}_continue`] = collectSectionComments(submittedTasks, section.id, 'continue')
    tokens[`ssc_sec${sectionNumber}_self`] = collectSelfReflection(submittedTasks, section.id)
  }

  for (const section of SURVEY_SECTIONS) {
    for (const competency of section.competencies) {
      const overviewCode = COMPETENCY_OVERVIEW_CODES[competency.id]
      if (!overviewCode) continue

      const behaviourIds = competency.behaviours.map((behaviour) => behaviour.id)
      const seniorLeaderBehaviourIds = competency.behaviours.filter((behaviour) => behaviour.seniorLeader).map((behaviour) => behaviour.id)

      const selfScore = getCompetencyOverall(submittedTasks, behaviourIds, 'self')
      const othersScore = getCompetencyOverall(submittedTasks, behaviourIds, 'others')
      tokens[`ov_${overviewCode}_self`] = formatScore(selfScore)
      tokens[`ov_${overviewCode}_others`] = formatScore(othersScore)
      tokens[`ov_${overviewCode}_gap`] = gapArrow(selfScore, othersScore)

      tokens[`${overviewCode}_ov_self`] = tokens[`ov_${overviewCode}_self`]
      tokens[`${overviewCode}_ov_others`] = tokens[`ov_${overviewCode}_others`]
      tokens[`${overviewCode}_ov_rm`] = formatScore(getCompetencyOverall(submittedTasks, behaviourIds, 'rm'))
      tokens[`${overviewCode}_ov_skip`] = seniorLeaderBehaviourIds.length
        ? formatScore(getCompetencyOverall(submittedTasks, seniorLeaderBehaviourIds, 'skip'))
        : 'NA'
      tokens[`${overviewCode}_ov_dr`] = directReportsMeetMinimum
        ? formatScore(getCompetencyOverall(submittedTasks, behaviourIds, 'dr'))
        : 'NA'
      tokens[`${overviewCode}_ov_peer`] = formatScore(getCompetencyOverall(submittedTasks, behaviourIds, 'peer'))
      tokens[`${overviewCode}_ov_ic`] = tokens[`${overviewCode}_ov_peer`]
    }
  }

  return tokens
}

export async function getParticipantForReport(db, participantId) {
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

  const incompleteTasks = participant.feedbackTasks.filter((task) => {
    if (task.status !== 'SUBMITTED') return true
    const ratings = task.responses?.[0]?.ratings
    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return true
    const requiredIds = getBehaviourIds(getSurveySections(task.relationship))
    return requiredIds.some((id) => !Number.isFinite(ratings[id]) || ratings[id] < 1 || ratings[id] > 4)
  })
  if (incompleteTasks.length && !hasCutoffPassed(participant.cohort?.threeSixtyCutoff)) {
    throw httpError(409, `360° Feedback Report cannot be generated: ${incompleteTasks.length} respondent${incompleteTasks.length === 1 ? ' has' : 's have'} not submitted all required ratings`)
  }

  return participant
}

const PDF = {
  ink: '#34342f',
  brown: '#a55f3e',
  tan: '#c89b76',
  cream: '#fbf3d6',
  pale: '#f0dfb5',
  green: '#a8bd61',
  white: '#ffffff',
}

function addPage(doc, title, eyebrow = '') {
  doc.addPage({ size: 'A4', margin: 46, layout: 'portrait' })
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF.cream)
  if (eyebrow) doc.fillColor(PDF.brown).font('Helvetica-Bold').fontSize(10).text(eyebrow.toUpperCase(), 46, 42)
  doc.fillColor(PDF.white).rect(46, 66, doc.page.width - 92, 36).fill(PDF.green)
  doc.fillColor(PDF.white).font('Helvetica-Bold').fontSize(17).text(title, 58, 76, { width: doc.page.width - 116 })
  doc.fillColor('#795f50').font('Helvetica').fontSize(7)
    .text('Bajaj Auto Ltd · 360 Feedback Confidential Report', 46, doc.page.height - 30, { width: doc.page.width - 92 })
  doc.moveTo(46, doc.page.height - 35).lineTo(doc.page.width - 46, doc.page.height - 35).strokeColor(PDF.tan).stroke()
}

function textBlock(doc, text, x, y, width, options = {}) {
  doc.fillColor(options.color || PDF.ink)
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 10)
    .text(String(text || ''), x, y, { width, lineGap: options.lineGap ?? 3 })
}

function drawTable(doc, columns, rows, startY, options = {}) {
  const x = 46
  const width = doc.page.width - 92
  const widths = columns.map((column) => column.width * width)
  const headerHeight = options.headerHeight || 28
  let y = startY

  doc.rect(x, y, width, headerHeight).fill(PDF.tan)
  let cellX = x
  columns.forEach((column, index) => {
    textBlock(doc, column.label, cellX + 5, y + 8, widths[index] - 10, { size: 7, bold: true, color: PDF.ink })
    cellX += widths[index]
  })
  y += headerHeight

  rows.forEach((row, rowIndex) => {
    const rowHeight = Math.max(options.rowHeight || 30, ...row.map((value, index) =>
      doc.heightOfString(String(value ?? ''), { width: widths[index] - 10 }) + 12,
    ))
    if (y + rowHeight > doc.page.height - 48) return
    if (rowIndex % 2) doc.rect(x, y, width, rowHeight).fill('#ead8a8')
    cellX = x
    row.forEach((value, index) => {
      textBlock(doc, value, cellX + 5, y + 6, widths[index] - 10, {
        size: index === 0 ? 7.3 : 8,
        bold: index === 0,
      })
      cellX += widths[index]
    })
    doc.rect(x, y, width, rowHeight).strokeColor('#7d6c5b').lineWidth(0.35).stroke()
    y += rowHeight
  })
  return y
}

function drawCover(doc, tokens) {
  doc.addPage({ size: 'A4', margin: 0 })
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(PDF.brown)
  doc.rect(0, doc.page.height * 0.62, doc.page.width, doc.page.height * 0.38).fill(PDF.green)
  textBlock(doc, '360° FEEDBACK\nREPORT', 54, 150, 480, { size: 35, bold: true, color: PDF.white, lineGap: 1 })
  textBlock(doc, tokens.participant_name, 56, 270, 470, { size: 22, bold: true, color: PDF.white })
  textBlock(doc, `Employee ID  ${tokens.ticket_id}`, 56, 332, 230, { size: 10, color: PDF.white })
  textBlock(doc, `Cohort  ${tokens.cohort}`, 300, 332, 240, { size: 10, color: PDF.white })
  textBlock(doc, `Report period  ${tokens.report_month}`, 56, 360, 350, { size: 10, color: PDF.white })
  textBlock(doc, 'CONFIDENTIAL DEVELOPMENT REPORT', 56, 760, 400, { size: 9, bold: true, color: PDF.white })
}

function drawRespondentMix(doc, tokens) {
  addPage(doc, 'Who contributed', 'Your respondent mix')
  const items = [
    ['Self', tokens.mix_self_resp],
    ['Reporting Manager', tokens.mix_rm_resp],
    ['Skip Manager / BU Head', tokens.mix_skip_resp],
    ['Peers / Internal Customers', tokens.mix_peer_ic_resp],
    ['Direct Reports', tokens.mix_dr_resp],
    ['Total responses', tokens.mix_total_resp],
  ]
  items.forEach(([label, value], index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 46 + column * 252
    const y = 138 + row * 150
    doc.roundedRect(x, y, 230, 120, 5).fillAndStroke(PDF.pale, PDF.tan)
    textBlock(doc, value, x + 18, y + 20, 190, { size: 27, bold: true, color: PDF.brown })
    textBlock(doc, label, x + 18, y + 67, 190, { size: 10, bold: true })
  })
}

function drawOverview(doc, tokens) {
  addPage(doc, 'Self vs Others', 'Feedback overview')
  textBlock(doc, 'Compare your self-rating with the average from all other respondents. Arrows indicate a gap of 0.75 or more.', 46, 122, 500, { size: 9 })
  const competencies = [
    ['gi', 'Generates Ideas'], ['spc', 'Solves Problems Creatively'], ['cipc', 'Champions Improvement & Positive Change'],
    ['dep', 'Develops and Engages People'], ['amt', 'Aligns and Motivates Team'], ['cai', 'Collaborates with All Interfaces'],
    ['icex', 'Inculcates a Culture of Excellence'], ['acfs', 'Anticipates Changes & Formulates Strategy'],
  ]
  const rows = competencies.map(([code, label]) => {
    const self = tokens[`ov_${code}_self`]
    const others = tokens[`ov_${code}_others`]
    const gap = self && others ? Number(self) - Number(others) : null
    return [label, self, others, gap === null || Math.abs(gap) < 0.75 ? '' : gap > 0 ? '▲' : '▼']
  })
  drawTable(doc, [
    { label: 'Competency', width: 0.55 },
    { label: 'Self', width: 0.15 },
    { label: 'Others', width: 0.15 },
    { label: 'Gap', width: 0.15 },
  ], rows, 158, { rowHeight: 40 })
}

function drawCompetencyPages(doc, tokens) {
  let behaviourIndex = 0
  SURVEY_SECTIONS.forEach((section, sectionIndex) => {
    section.competencies.forEach((competency) => {
      addPage(doc, `${competency.title} (${competency.shortCode})`, `Section ${sectionIndex + 1}: ${section.title}`)
      const rows = competency.behaviours.map((behaviour) => {
        behaviourIndex += 1
        const key = `s${String(behaviourIndex).padStart(2, '0')}`
        return [
          behaviour.text,
          tokens[`${key}_self`],
          tokens[`${key}_others`],
          tokens[`${key}_rm`],
          tokens[`${key}_skip`],
          tokens[`${key}_peer`],
          tokens[`${key}_dr`],
        ]
      })
      drawTable(doc, [
        { label: 'Behaviour', width: 0.4 },
        { label: 'Self', width: 0.1 },
        { label: 'Others', width: 0.1 },
        { label: 'RM', width: 0.1 },
        { label: 'Skip / BU', width: 0.1 },
        { label: 'Peers', width: 0.1 },
        { label: 'Directs', width: 0.1 },
      ], rows, 126, { rowHeight: 54 })
    })

    const number = SECTION_NUMBER_BY_ID[section.id]
    addPage(doc, 'Start. Stop. Continue.', `Overall feedback on ${section.title}`)
    const cards = [
      ['Start doing', tokens[`ssc_sec${number}_start`]],
      ['Stop doing', tokens[`ssc_sec${number}_stop`]],
      ['Continue doing', tokens[`ssc_sec${number}_continue`]],
      ['Self reflections', tokens[`ssc_sec${number}_self`]],
    ]
    cards.forEach(([title, value], index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = 46 + column * 252
      const y = 128 + row * 282
      doc.roundedRect(x, y, 230, 250, 4).fillAndStroke(PDF.pale, PDF.tan)
      textBlock(doc, title, x + 15, y + 16, 200, { size: 11, bold: true, color: PDF.brown })
      textBlock(doc, value || 'No response provided.', x + 15, y + 45, 200, { size: 8.5, lineGap: 4 })
    })
  })
}

async function renderPdf(tokens, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const doc = new PDFDocument({ autoFirstPage: false, compress: true, info: { Title: '360° Feedback Report' } })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  const completed = new Promise((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })

  drawCover(doc, tokens)
  addPage(doc, 'Welcome', '360 feedback')
  textBlock(doc, 'Feedback is most useful when it becomes a thoughtful conversation—and then deliberate action.', 62, 155, 470, { size: 24, bold: true, color: PDF.brown, lineGap: 8 })
  doc.roundedRect(62, 330, 470, 170, 5).fill(PDF.pale)
  textBlock(doc, 'This report brings together your self-perception and aggregated feedback from the people you work with. Look for themes, strengths to use deliberately, and one or two focused growth priorities.', 86, 365, 422, { size: 12, lineGap: 7 })
  addPage(doc, 'Rating scale', 'How to read this report')
  drawTable(doc, [
    { label: 'Rating', width: 0.2 }, { label: '1', width: 0.16 }, { label: '2', width: 0.16 },
    { label: '3', width: 0.16 }, { label: '4', width: 0.16 }, { label: 'NA', width: 0.16 },
  ], [['Meaning', 'Rarely', 'Occasionally', 'Often', 'Almost Always', 'Not observed']], 145, { rowHeight: 58 })
  textBlock(doc, 'Individual responses are never shown. Peer and Direct Report scores require at least two respondents; Self, Reporting Manager and Skip Manager may appear with one.', 62, 285, 470, { size: 11, lineGap: 6 })
  drawRespondentMix(doc, tokens)
  drawOverview(doc, tokens)
  drawCompetencyPages(doc, tokens)

  doc.end()
  await completed
  await fs.writeFile(outputPath, Buffer.concat(chunks))
}

async function renderPptx(tokens, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  const template = await fs.readFile(pptxTemplatePath)
  const zip = new PizZip(template)
  // The supplied template has one accidental GUID in place of the statement 18
  // Skip/BU Head token. Repair it in-memory so every configured score can render.
  const statementSlidePath = 'ppt/slides/slide11.xml'
  const statementSlide = zip.file(statementSlidePath)?.asText()
  if (statementSlide) {
    zip.file(statementSlidePath, statementSlide.replace(
      '{{0ACE7BD7-C860-1F38-0AEE-0C2B4442CDE5}}',
      '{{s18_skip}}',
    ))
  }
  const respondentMixSlidePath = 'ppt/slides/slide5.xml'
  const respondentMixSlide = zip.file(respondentMixSlidePath)?.asText()
  if (respondentMixSlide) {
    const nominatedValues = [
      tokens.mix_skip_nom,
      tokens.mix_peer_ic_nom,
      tokens.mix_total_nom,
      tokens.mix_dr_nom,
    ]
    let nominatedIndex = 0
    zip.file(respondentMixSlidePath, respondentMixSlide.replaceAll('[N]', () => nominatedValues[nominatedIndex++] || '0'))
  }
  addPptxFeedbackContinuationSlides(zip, tokens)
  const document = new Docxtemplater(zip, {
    delimiters: { start: '{{', end: '}}' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  document.render(tokens)
  const output = document.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  })
  await fs.writeFile(outputPath, output)
}

function splitPptxFeedback(value, maxCharacters = 150) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean)
  const chunks = []
  let chunk = ''
  for (const originalWord of words) {
    const wordParts = originalWord.length > maxCharacters
      ? originalWord.match(new RegExp(`.{1,${maxCharacters}}`, 'g'))
      : [originalWord]
    for (const word of wordParts) {
      const candidate = chunk ? `${chunk} ${word}` : word
      if (chunk && candidate.length > maxCharacters) {
        chunks.push(chunk)
        chunk = word
      } else chunk = candidate
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks.length ? chunks : ['']
}

function addPptxFeedbackContinuationSlides(zip, tokens) {
  const sections = [
    { slide: 10, prefix: 'ssc_sec1' },
    { slide: 14, prefix: 'ssc_sec2' },
    { slide: 16, prefix: 'ssc_sec3' },
    { slide: 18, prefix: 'ssc_sec4' },
  ]
  const fields = ['start', 'stop', 'continue', 'self']
  const presentationPath = 'ppt/presentation.xml'
  const presentationRelsPath = 'ppt/_rels/presentation.xml.rels'
  const contentTypesPath = '[Content_Types].xml'
  let presentation = zip.file(presentationPath).asText()
  let presentationRels = zip.file(presentationRelsPath).asText()
  let contentTypes = zip.file(contentTypesPath).asText()
  const slideNumbers = Object.keys(zip.files).map((name) => name.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1]).filter(Boolean).map(Number)
  let nextSlideNumber = Math.max(...slideNumbers) + 1
  let nextSlideId = Math.max(...[...presentation.matchAll(/<p:sldId id="(\d+)"/g)].map((match) => Number(match[1]))) + 1
  let nextRelationshipId = Math.max(...[...presentationRels.matchAll(/Id="rId(\d+)"/g)].map((match) => Number(match[1]))) + 1

  for (const section of sections) {
    const chunksByField = Object.fromEntries(fields.map((field) => [field, splitPptxFeedback(tokens[`${section.prefix}_${field}`])]))
    const pageCount = Math.max(...fields.map((field) => chunksByField[field].length))
    fields.forEach((field) => { tokens[`${section.prefix}_${field}`] = chunksByField[field][0] || '' })
    if (pageCount <= 1) continue

    const sourceSlidePath = `ppt/slides/slide${section.slide}.xml`
    const sourceRelsPath = `ppt/slides/_rels/slide${section.slide}.xml.rels`
    const sourceSlide = zip.file(sourceSlidePath).asText()
    const sourceRels = zip.file(sourceRelsPath)?.asText()
    const sourceRelationship = [...presentationRels.matchAll(new RegExp(`<Relationship Id="(rId\\d+)"[^>]+Target="slides/slide${section.slide}\\.xml"[^>]*/>`, 'g'))][0]
    if (!sourceRelationship) continue
    let insertAfterRelationshipId = sourceRelationship[1]

    for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
      const slideNumber = nextSlideNumber++
      const relationshipId = `rId${nextRelationshipId++}`
      let clonedSlide = sourceSlide
      fields.forEach((field) => {
        const originalToken = `{{${section.prefix}_${field}}}`
        const continuationTokenName = `${section.prefix}_${field}_cont_${pageIndex}`
        clonedSlide = clonedSlide.replaceAll(originalToken, `{{${continuationTokenName}}}`)
        tokens[continuationTokenName] = chunksByField[field][pageIndex] || ''
      })
      zip.file(`ppt/slides/slide${slideNumber}.xml`, clonedSlide)
      if (sourceRels) {
        const clonedRels = sourceRels.replace(/<Relationship[^>]+Type="[^"]*\/notesSlide"[^>]*\/>/g, '')
        zip.file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`, clonedRels)
      }
      presentationRels = presentationRels.replace('</Relationships>', `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${slideNumber}.xml"/></Relationships>`)
      const anchor = new RegExp(`(<p:sldId id="\\d+" r:id="${insertAfterRelationshipId}"/>)`)
      presentation = presentation.replace(anchor, `$1<p:sldId id="${nextSlideId++}" r:id="${relationshipId}"/>`)
      insertAfterRelationshipId = relationshipId
      contentTypes = contentTypes.replace('</Types>', `<Override PartName="/ppt/slides/slide${slideNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`)
    }
  }
  zip.file(presentationPath, presentation)
  zip.file(presentationRelsPath, presentationRels)
  zip.file(contentTypesPath, contentTypes)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

export async function get360ReportPreviewHtml(db, participantId) {
  const participant = await getParticipantForReport(db, participantId)
  const tokens = buildReportTokens(participant)
  const template = await loadHtmlTemplate()

  return template.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, tokenName) => escapeHtml(tokens[tokenName]))
}

async function saveReportRecord(db, participant, outputPath) {
  const existing = await db.report.findFirst({
    where: {
      participantId: participant.id,
      type: '360',
    },
  })

  const data = {
    status: existing?.status === 'RELEASED' ? 'RELEASED' : 'GENERATED',
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
  const tokens = buildReportTokens(participant)

  await renderPptx(tokens, outputPath)
  const report = await saveReportRecord(db, participant, outputPath)

  await db.participant.update({
    where: { id: participant.id },
    data: {
      reportStatus: report.status === 'RELEASED' ? 'RELEASED' : 'GENERATED',
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
  const existing = await db.report.findFirst({
    where: {
      participantId,
      type: '360',
      status: { in: ['GENERATED', 'RELEASED'] },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (existing?.fileUrl && path.extname(existing.fileUrl).toLowerCase() === '.pptx') {
    try {
      await fs.access(existing.fileUrl)
      return {
        report: existing,
        outputPath: existing.fileUrl,
        fileName: path.basename(existing.fileUrl),
      }
    } catch {
      throw httpError(410, 'The generated report file is missing. Talent Development must generate the report again.')
    }
  }

  throw httpError(404, 'This 360° Feedback Report has not been generated by Talent Development.')
}
