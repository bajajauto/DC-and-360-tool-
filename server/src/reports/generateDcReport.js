import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'
import { httpError } from '../utils/httpError.js'
import { build360PercentileWorkbenchRows } from './buildCohort360Master.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..', '..')
const templatePath = path.join(serverRoot, 'templates', 'dc-report', 'template.html')
const reportsDirectory = process.env.REPORTS_DIR
  ? path.resolve(process.env.REPORTS_DIR)
  : path.join(serverRoot, 'generated', 'reports')

const COMPETENCY_CODES = {
  GI: ['gi'], SPC: ['spc'], CIPC: ['cipc'], DEP: ['dep'], AMT: ['amt'],
  CWAI: ['cai'], ICE: ['icex'], ACFS: ['ac', 'fs'],
}

let cachedTemplate

function workbookBuffer(dataUrl) {
  const match = String(dataUrl || '').match(/^data:[^;]+;base64,(.+)$/)
  if (!match) throw httpError(409, 'The uploaded assessor workbook is invalid. Upload the completed Excel workbook again.')
  return Buffer.from(match[1], 'base64')
}

function clean(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function parseAssessorTokens(dataUrl) {
  let workbook
  try {
    workbook = XLSX.read(workbookBuffer(dataUrl), { type: 'buffer', cellFormula: true })
  } catch {
    throw httpError(409, 'The assessor file could not be read as an Excel workbook.')
  }
  const overall = workbook.Sheets['Overall Summary']
  const profile = workbook.Sheets['Competency Profile']
  if (!overall || !profile) throw httpError(409, 'The workbook must contain “Overall Summary” and “Competency Profile” sheets.')

  const tokens = {}
  for (let row = 6; row <= 14; row += 1) {
    const token = clean(overall[`E${row}`]?.v).match(/^\{\{([^{}]+)\}\}$/)?.[1]
    if (token) tokens[token] = clean(overall[`C${row}`]?.v)
  }

  const rows = XLSX.utils.sheet_to_json(profile, { header: 1, defval: '', raw: false })
  for (const row of rows.slice(5, 14)) {
    const tokenList = clean(row[14]).split(',').map((value) => value.trim()).filter(Boolean)
    const code = tokenList[0]?.replace(/_dc_score$/, '')
    if (!code) continue
    const values = {
      [`${code}_dc_score`]: row[3], [`${code}_other`]: row[4],
      [`${code}_strength_a`]: row[5], [`${code}_strength_b`]: row[6],
      [`${code}_dev_a`]: row[7], [`${code}_dev_b`]: row[8],
      [`${code}_tip_a`]: row[9], [`${code}_tip_b`]: row[10],
      [`${code}_tip_c`]: row[11], [`${code}_tip_d`]: row[12],
    }
    Object.entries(values).forEach(([key, value]) => { tokens[key] = clean(value) })
  }
  return tokens
}

async function buildTokens(db, participant, workbook) {
  const tokens = {
    ...parseAssessorTokens(workbook.dataUrl),
    participant_name: participant.user.name || '',
    ticket_id: participant.user.employeeId || '',
    cohort: participant.cohort.name || '',
  }
  const { rows } = await build360PercentileWorkbenchRows(db)
  const ticket = participant.user.employeeId || ''
  for (const [sourceCode, reportCodes] of Object.entries(COMPETENCY_CODES)) {
    const workbenchRow = rows.find((row) => row.ticket === ticket && row.competency === sourceCode)
    const score = workbenchRow?.others ?? null
    const percentile = workbenchRow?.percentile ?? null
    for (const reportCode of reportCodes) {
      tokens[`${reportCode}_360_score`] = score === null ? '' : score.toFixed(2)
      tokens[`${reportCode}_360_pct`] = percentile === null ? '' : percentile.toFixed(1)
    }
  }
  return tokens
}

function escapeHtml(value) {
  return clean(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

async function renderHtml(tokens) {
  cachedTemplate ||= await fs.readFile(templatePath, 'utf8')
  return cachedTemplate.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, token) => escapeHtml(tokens[token] ?? ''))
}

async function getParticipant(db, participantId) {
  const participant = await db.participant.findFirst({
    where: { id: participantId, archivedAt: null },
    include: {
      user: true, cohort: true,
      assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1 },
      feedbackTasks: { include: { responses: true } },
    },
  })
  if (!participant) throw httpError(404, 'Participant not found')
  const workbook = participant.assessorReviews[0]?.evidence?.workbook
  if (!workbook?.dataUrl) throw httpError(409, 'Upload the completed assessor workbook before generating the DC report.')
  return { participant, workbook }
}

export async function getDcReportPreviewHtml(db, participantId) {
  const { participant, workbook } = await getParticipant(db, participantId)
  return renderHtml(await buildTokens(db, participant, workbook))
}

export async function generateDcReportForParticipant(db, participantId) {
  const { participant, workbook } = await getParticipant(db, participantId)
  const html = await renderHtml(await buildTokens(db, participant, workbook))
  const slug = `${participant.user.employeeId || participant.id}-${participant.user.name || 'participant'}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const fileName = `${slug}-dc-report.html`
  const outputPath = path.join(reportsDirectory, fileName)
  await fs.mkdir(reportsDirectory, { recursive: true })
  await fs.writeFile(outputPath, html)
  const existing = await db.report.findFirst({ where: { participantId, type: 'dc' }, orderBy: { updatedAt: 'desc' } })
  const status = existing?.status === 'RELEASED' ? 'RELEASED' : 'GENERATED'
  const report = existing
    ? await db.report.update({ where: { id: existing.id }, data: { status, fileUrl: outputPath, generatedAt: new Date() } })
    : await db.report.create({ data: { participantId, type: 'dc', status, fileUrl: outputPath, generatedAt: new Date() } })
  return { report, outputPath, fileName }
}
