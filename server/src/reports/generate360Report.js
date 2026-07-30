import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getBehaviourIds, getSurveySections, SURVEY_SECTIONS } from '../../../src/data/surveyConfig.js'
import { httpError } from '../utils/httpError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..', '..')
// Point REPORTS_DIR at storage outside the deployment root in hosted environments;
// a deploy replaces the app directory and would otherwise wipe generated reports.
const reportsDirectory = process.env.REPORTS_DIR
  ? path.resolve(process.env.REPORTS_DIR)
  : path.join(serverRoot, 'generated', 'reports')

function hasCutoffPassed(cutoff, now = new Date()) {
  if (!cutoff) return false
  const endOfCutoffDay = new Date(cutoff)
  endOfCutoffDay.setUTCHours(23, 59, 59, 999)
  return now > endOfCutoffDay
}

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
    designation: participant.user.designation || '-',
    business_unit: participant.user.businessUnit || '-',
    reporting_manager: participant.masterData?.reportingManagerName || '-',
    skip_manager: participant.masterData?.skipManagerName || '-',
    bu_head: participant.masterData?.buHeadName || '-',
    buhr: participant.masterData?.buhrName || '-',
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
    throw httpError(409, `360 report cannot be generated: ${incompleteTasks.length} respondent${incompleteTasks.length === 1 ? ' has' : 's have'} not submitted all required ratings`)
  }

  return participant
}

function escapeHtml(value) {
  return String(value ?? '-').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

function scoreCell(tokens, index, group) {
  return `<td>${escapeHtml(tokens[`s${String(index).padStart(2, '0')}_${group}`])}</td>`
}

function reportHtml(participant, replacements) {
  const { tokens } = replacements
  let behaviourIndex = 0
  const sections = SURVEY_SECTIONS.map((section, sectionIndex) => {
    const competencyPages = section.competencies.map((competency) => {
      const rows = competency.behaviours.map((behaviour) => {
        behaviourIndex += 1
        return `<tr><th>${escapeHtml(behaviour.text)}</th>${['self', 'others', 'rm', 'skip', 'peer', 'dr', 'ic'].map((group) => scoreCell(tokens, behaviourIndex, group)).join('')}</tr>`
      }).join('')
      return `<section class="page"><div class="page-no">${String(sectionIndex + 7).padStart(2, '0')}</div><p class="eyebrow">SECTION ${sectionIndex + 1}: ${escapeHtml(section.title)}</p><h2>${escapeHtml(competency.title)} <span>(${escapeHtml(competency.shortCode)})</span></h2><p class="intro">Scores are aggregated by respondent group. A dash means the confidentiality threshold was not met.</p><table><thead><tr><th>Behaviour</th><th>Self</th><th>Others</th><th>Reporting Manager</th><th>Skip Manager / BU Head</th><th>Peers</th><th>Direct Reports</th><th>Internal Customers</th></tr></thead><tbody>${rows}</tbody></table></section>`
    }).join('')
    const n = sectionIndex + 1
    return `${competencyPages}<section class="page feedback"><div class="page-no">${String(sectionIndex + 15).padStart(2, '0')}</div><p class="eyebrow">OVERALL FEEDBACK ON ${escapeHtml(section.title).toUpperCase()}</p><h2>Start. Stop. Continue.</h2><div class="feedback-grid"><article><h3>Start doing</h3><p>${escapeHtml(tokens[`ssc_sec${n}_start`])}</p></article><article><h3>Stop doing</h3><p>${escapeHtml(tokens[`ssc_sec${n}_stop`])}</p></article><article><h3>Continue doing</h3><p>${escapeHtml(tokens[`ssc_sec${n}_continue`])}</p></article><article><h3>Self reflections</h3><p>${escapeHtml(tokens[`ssc_sec${n}_self`])}</p></article></div></section>`
  }).join('')

  const overviewRows = [
    ['gi', 'Generates Ideas'], ['spc', 'Solves Problems Creatively'], ['cipc', 'Champions Improvement & Positive Change'],
    ['dep', 'Develops and Engages People'], ['amt', 'Aligns and Motivates Team'], ['cai', 'Collaborate with All Interfaces'],
    ['icex', 'Inculcates a Culture of Excellence'], ['acfs', 'Anticipates Changes & Formulates Strategy'],
  ].map(([code, label]) => `<tr><th>${label}</th><td>${escapeHtml(tokens[`ov_${code}_self`])}</td><td>${escapeHtml(tokens[`ov_${code}_others`])}</td><td>${escapeHtml(tokens[`ov_${code}_gap`])}</td></tr>`).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(tokens.participant_name)} — 360 Feedback Report</title><style>
  :root{font-family:Arial,Helvetica,sans-serif;color:#34342f;background:#1f1f1b}*{box-sizing:border-box}body{margin:0}.page{position:relative;width:210mm;min-height:297mm;margin:10mm auto;padding:18mm 16mm 16mm;background-color:#fbf3d6;background-image:radial-gradient(#9b8b5b18 .55px,transparent .7px),radial-gradient(#fff8df80 .7px,transparent .9px);background-position:0 0,4px 5px;background-size:7px 7px,9px 9px;page-break-after:always;overflow:hidden;box-shadow:0 4px 24px #0008}.page:last-child{page-break-after:auto}.page:after{content:'Bajaj Auto Ltd · 360 Feedback Confidential Report';position:absolute;left:16mm;right:16mm;bottom:8mm;border-top:1px solid #bd805d;padding-top:3mm;color:#795f50;font-size:8pt}.cover{color:#fff;background:linear-gradient(145deg,#76472f,#bb7754 55%,#a7ba60)}.cover:after{color:#fff4d7;border-color:#f4d8b5}.cover h1,.page h2,.eyebrow{font-family:Impact,'Arial Narrow',Arial,sans-serif;text-transform:uppercase}.cover h1{font-size:36pt;line-height:1.02;margin:75mm 0 8mm}.cover .name{font-size:22pt;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:15mm}.meta div{border-top:1px solid #eed6b9;padding-top:3mm}.page-no{position:absolute;right:16mm;top:12mm;color:#776f5d;font-weight:700}.eyebrow{display:inline-block;color:#b87450;font-size:22pt;font-weight:800;letter-spacing:-.03em;margin:0 0 6mm}.page h2{font-size:17pt;color:#fff;margin:0 0 4mm;padding:3mm 4mm;background:#a8bd61}.page h2 span{font-size:12pt;color:#fff}.intro{color:#615b4e;line-height:1.55;max-width:165mm;font-style:italic}table{width:100%;border-collapse:collapse;margin-top:6mm;font-size:8pt}th,td{border:0;border-right:1px solid #443b31;padding:2.6mm;text-align:center}th:first-child{text-align:left;width:34%}thead th{background:#c89b76;color:#29251f;border-top:1px solid #443b31;border-bottom:1px solid #443b31;font-weight:500}tbody tr:nth-child(even){background:#ead8a8aa}tbody tr:last-child{border-bottom:1px solid #443b31}.hero{margin:20mm 0 12mm;font-family:Georgia,serif;font-size:28pt;line-height:1.16;color:#9a5e42}.callout{padding:8mm;background:#efe0b5aa;border-left:4px solid #a8bd61;line-height:1.7}.mix{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:12mm}.mix article{padding:7mm;border:1px solid #c9a77d;background:#f7e9c4aa}.mix strong{display:block;font-size:25pt;color:#a55f3e}.feedback-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;margin-top:12mm}.feedback article{min-height:72mm;padding:8mm;background:#f0dfb5aa;border-top:4px solid #a8bd61}.feedback h3{color:#9b5d3d}.feedback p{white-space:pre-wrap;line-height:1.65}.questions{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.questions article{min-height:58mm;padding:7mm;border:1px solid #caa881;background:#f8eccbaa}.questions h3{color:#95583c}@media print{body{background:#fff}.page{margin:0;box-shadow:none}@page{size:A4;margin:0}}@media(max-width:850px){.page{width:100%;margin:0;min-height:100vh}.feedback-grid,.questions{grid-template-columns:1fr}}
  </style></head><body>
  <section class="page cover"><h1>360° Feedback<br>Report</h1><div class="name">${escapeHtml(tokens.participant_name)}</div><div class="meta"><div>Employee ID<br><strong>${escapeHtml(tokens.ticket_id)}</strong></div><div>Cohort<br><strong>${escapeHtml(tokens.cohort)}</strong></div><div>Designation<br><strong>${escapeHtml(tokens.designation)}</strong></div><div>Business Unit<br><strong>${escapeHtml(tokens.business_unit)}</strong></div><div>Reporting Manager<br><strong>${escapeHtml(tokens.reporting_manager)}</strong></div><div>Report period<br><strong>${escapeHtml(tokens.report_month)}</strong></div></div></section>
  <section class="page"><div class="page-no">02</div><p class="eyebrow">Welcome</p><div class="hero">Feedback is most useful when it becomes a thoughtful conversation—and then deliberate action.</div><div class="callout">This report brings together your self-perception and aggregated feedback from the people you work with. It is developmental and will be shared with your manager and HR team. Look for themes, strengths to use deliberately, and one or two focused growth priorities.</div></section>
  <section class="page"><div class="page-no">03</div><p class="eyebrow">How to read this report</p><h2>Rating scale</h2><table><thead><tr><th>Rating</th><th>1</th><th>2</th><th>3</th><th>4</th><th>NA</th></tr></thead><tbody><tr><th>Meaning</th><td>Rarely</td><td>Occasionally</td><td>Often</td><td>Almost Always</td><td>Not observed</td></tr></tbody></table><div class="callout" style="margin-top:15mm">Individual responses are never shown. Scores appear only as aggregates. Peer, Direct Report and Internal Customer scores require at least two respondents; Self, Reporting Manager and Skip Manager may appear with one.</div></section>
  <section class="page"><div class="page-no">04</div><p class="eyebrow">Your respondent mix</p><h2>Who contributed</h2><div class="mix"><article><strong>${escapeHtml(tokens.mix_self_resp)}</strong>Self</article><article><strong>${escapeHtml(tokens.mix_rm_resp)}</strong>Reporting Manager</article><article><strong>${escapeHtml(tokens.mix_skip_resp)}</strong>Skip Manager / BU Head</article><article><strong>${escapeHtml(tokens.mix_peer_ic_resp)}</strong>Peers / Internal Customers</article><article><strong>${escapeHtml(tokens.mix_dr_resp)}</strong>Direct Reports</article><article><strong>${escapeHtml(tokens.mix_total_resp)}</strong>Total responses</article></div></section>
  <section class="page"><div class="page-no">05</div><p class="eyebrow">Feedback overview</p><h2>Self vs Others</h2><p class="intro">Compare your self-rating with the average from all other respondents. Positive gaps mean your self-rating is higher.</p><table><thead><tr><th>Competency</th><th>Self</th><th>Others</th><th>Gap</th></tr></thead><tbody>${overviewRows}</tbody></table></section>
  ${sections}
  <section class="page"><p class="eyebrow">Your reflection workbook</p><h2>Turn insight into action</h2><div class="questions">${['What stood out when I first read this report?','Where does the feedback match how I see myself?','Where does it differ, and what might explain the gap?','Which 2–3 strengths will I use more deliberately?','Which 2–3 areas will I develop over the next 9–12 months?','What specific actions will I take, and by when?','Who will I ask for support?','When will I review my progress?'].map((question, index) => `<article><h3>${index + 1}. ${question}</h3></article>`).join('')}</div></section>
  </body></html>`
}

async function renderHtml(participant, replacements, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, reportHtml(participant, replacements), 'utf8')
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
  const fileName = `${participantSlug(participant)}-360-report.html`
  const outputPath = path.join(reportsDirectory, fileName)
  const replacements = buildReportTokens(participant)

  await renderHtml(participant, replacements, outputPath)
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

  if (existing?.fileUrl && path.extname(existing.fileUrl).toLowerCase() === '.html') {
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

  throw httpError(404, 'This 360 report has not been generated by Talent Development.')
}
