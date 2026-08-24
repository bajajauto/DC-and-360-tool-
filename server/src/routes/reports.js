import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { generate360ReportForParticipant, get360ReportPreviewHtml, getOrGenerate360Report } from '../reports/generate360Report.js'
import { generateDcReportForParticipant, getDcReportPreviewHtml } from '../reports/generateDcReport.js'
import { build360ResponseDataWorkbook } from '../reports/build360ResponseData.js'
import { buildCohort360MasterWorkbook } from '../reports/buildCohort360Master.js'
import { queueEmail } from '../notifications/service.js'
import { createZip } from '../utils/zip.js'
import { hasDeadlinePassed } from '../utils/deadlines.js'

export const reportsRouter = Router()

function requireTd(req) {
  if (!req.auth.roles.includes('td')) throw httpError(403, 'Talent Development access required')
}

function isVisibleInRepository(report) {
  if (report.status === 'RELEASED') return true
  const allSubmitted = report.participant.feedbackTasks.length > 0 && report.participant.feedbackTasks.every((task) => task.status === 'SUBMITTED')
  const cutoff = report.participant.cohort.threeSixtyCutoff
  const cutoffPassed = hasDeadlinePassed(cutoff)
  return allSubmitted || cutoffPassed
}

function safeFilePart(value, fallback) {
  const result = String(value || '').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\s+/g, ' ')
  return result || fallback
}

async function assertReportDownloadAccess(req) {
  if (req.auth.roles.includes('td')) return
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    select: { userId: true, reports: { where: { type: '360', status: 'RELEASED' }, take: 1, select: { id: true } } },
  })
  if (!participant) throw httpError(404, 'Participant not found')
  const isAssessor = req.auth.roles.includes('assessor')
  if (participant.userId !== req.auth.userId && !isAssessor) {
    throw httpError(403, 'You do not have access to this report')
  }
  if (!participant.reports.length) throw httpError(403, 'This report has not been released by Talent Development')
}

async function assertDcReportAccess(req) {
  if (req.auth.roles.includes('td')) return
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    select: { userId: true, reports: { where: { type: 'dc', status: 'RELEASED' }, take: 1, select: { id: true } } },
  })
  if (!participant) throw httpError(404, 'Participant not found')
  if (participant.userId !== req.auth.userId && !req.auth.roles.includes('assessor')) throw httpError(403, 'You do not have access to this report')
  if (!participant.reports.length) throw httpError(403, 'This report has not been released by Talent Development')
}

reportsRouter.get('/repository', asyncHandler(async (req, res) => {
  requireTd(req)
  const reports = await prisma.report.findMany({
    where: { participant: { archivedAt: null } },
    orderBy: [{ generatedAt: 'desc' }, { updatedAt: 'desc' }],
    include: {
      participant: {
        include: {
          user: true,
          cohort: true,
          nominees: true,
          feedbackTasks: { select: { status: true, relationship: true } },
        },
      },
    },
  })

  const visibleReports = reports.filter(isVisibleInRepository)

  res.json({ data: visibleReports.map((report) => {
    const participant = report.participant
    const responses = participant.feedbackTasks.filter((task) => task.status === 'SUBMITTED' && task.relationship !== 'SELF').length
    return {
      reportId: report.id,
      reportType: report.type.toLowerCase(),
      reportStatus: report.status.toLowerCase(),
      generatedAt: report.generatedAt?.toISOString() || null,
      releasedAt: report.releasedAt?.toISOString() || null,
      lastActivity: report.updatedAt.toISOString(),
      id: participant.id,
      name: participant.user.name,
      initials: participant.user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      employeeId: participant.user.employeeId,
      designation: participant.user.designation,
      bu: participant.user.businessUnit,
      cohortId: participant.cohortId,
      cohortName: participant.cohort.name,
      cohortProgramme: participant.cohort.programme,
      responses,
      totalResponses: participant.nominees.length,
    }
  }) })
}))

reportsRouter.get('/bulk-download', asyncHandler(async (req, res) => {
  requireTd(req)
  const cohortId = typeof req.query.cohortId === 'string' ? req.query.cohortId : 'all'
  const reportType = typeof req.query.reportType === 'string' ? req.query.reportType.toLowerCase() : 'all'
  if (!['all', 'dc', '360'].includes(reportType)) throw httpError(400, 'Report type must be all, dc, or 360')

  const reports = await prisma.report.findMany({
    where: {
      participant: { archivedAt: null, ...(cohortId !== 'all' ? { cohortId } : {}) },
      ...(reportType !== 'all' ? { type: { equals: reportType, mode: 'insensitive' } } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      participant: {
        include: {
          user: true,
          cohort: true,
          feedbackTasks: { select: { status: true } },
        },
      },
    },
  })

  const visibleReports = reports.filter(isVisibleInRepository)
  if (!visibleReports.length) throw httpError(404, 'No reports are available for the selected filters')

  const entries = []
  const unavailable = []
  for (const report of visibleReports) {
    if (!report.fileUrl) {
      unavailable.push(`${report.participant.user.name} — ${report.type.toUpperCase()} report has no stored file`)
      continue
    }

    try {
      const data = await fs.readFile(report.fileUrl)
      const cohortFolder = safeFilePart(report.participant.cohort.name, 'Unassigned cohort')
      const extension = path.extname(report.fileUrl) || (report.type.toLowerCase() === '360' ? '.pptx' : '.pdf')
      const employee = safeFilePart(report.participant.user.employeeId, report.participant.id)
      const participant = safeFilePart(report.participant.user.name, 'Participant')
      const type = report.type.toLowerCase() === '360' ? '360-feedback' : 'dc'
      entries.push({
        name: `${cohortFolder}/${employee} - ${participant} - ${type}-report${extension}`,
        data,
        modifiedAt: report.generatedAt || report.updatedAt,
      })
    } catch {
      unavailable.push(`${report.participant.user.name} — ${report.type.toUpperCase()} report file is missing`)
    }
  }

  if (unavailable.length) {
    entries.push({
      name: 'Unavailable reports.txt',
      data: `The following repository entries could not be included:\r\n\r\n${unavailable.join('\r\n')}\r\n`,
    })
  }
  if (!entries.some((entry) => entry.name !== 'Unavailable reports.txt')) {
    throw httpError(410, 'The report records exist, but none of their stored files are available')
  }

  const cohortLabel = cohortId === 'all'
    ? 'all-cohorts'
    : safeFilePart(visibleReports[0]?.participant.cohort.name, 'cohort').replace(/\s+/g, '-')
  const typeLabel = reportType === 'all' ? 'all-reports' : `${reportType}-reports`
  const fileName = `${cohortLabel}-${typeLabel}.zip`
  const zip = createZip(entries)

  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.setHeader('Content-Length', zip.length)
  res.send(zip)
}))

reportsRouter.get('/cohort-360-master', asyncHandler(async (req, res) => {
  requireTd(req)
  const { buffer, fileName } = await buildCohort360MasterWorkbook(prisma)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.send(buffer)
}))

reportsRouter.use('/:participantId', asyncHandler(async (req, _res, next) => {
  const participant = await prisma.participant.findFirst({
    where: { id: req.params.participantId, archivedAt: null },
    select: { id: true },
  })
  if (!participant) throw httpError(404, 'Active participant not found')
  next()
}))

reportsRouter.post('/:participantId/360/generate', asyncHandler(async (req, res) => {
  requireTd(req)
  const generated = await generate360ReportForParticipant(prisma, req.params.participantId)

  res.json({
    data: {
      id: generated.report.id,
      type: generated.report.type,
      status: generated.report.status.toLowerCase(),
      generatedAt: generated.report.generatedAt?.toISOString() || null,
      fileName: generated.fileName,
      downloadUrl: `/api/reports/${req.params.participantId}/360/download`,
    },
  })
}))

reportsRouter.get('/:participantId/360/download', asyncHandler(async (req, res) => {
  await assertReportDownloadAccess(req)
  // TD downloads should always reflect the current response data and generator
  // template. Participant/assessor downloads retain the explicitly released file.
  const generated = req.auth.roles.includes('td')
    ? await generate360ReportForParticipant(prisma, req.params.participantId)
    : await getOrGenerate360Report(prisma, req.params.participantId)

  res.download(generated.outputPath, generated.fileName || path.basename(generated.outputPath))
}))

reportsRouter.get('/:participantId/360/preview', asyncHandler(async (req, res) => {
  await assertReportDownloadAccess(req)
  const html = await get360ReportPreviewHtml(prisma, req.params.participantId)
  res.type('html').send(html)
}))

reportsRouter.get('/:participantId/360/response-data', asyncHandler(async (req, res) => {
  requireTd(req)
  const { buffer, fileName } = await build360ResponseDataWorkbook(prisma, req.params.participantId)

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
  res.send(buffer)
}))

reportsRouter.post('/:participantId/dc/generate', asyncHandler(async (req, res) => {
  requireTd(req)
  const generated = await generateDcReportForParticipant(prisma, req.params.participantId)
  res.json({ data: {
    id: generated.report.id,
    type: generated.report.type,
    status: generated.report.status.toLowerCase(),
    generatedAt: generated.report.generatedAt?.toISOString() || null,
    previewUrl: `/api/reports/${req.params.participantId}/dc/preview`,
  } })
}))

reportsRouter.get('/:participantId/dc/preview', asyncHandler(async (req, res) => {
  await assertDcReportAccess(req)
  const html = await getDcReportPreviewHtml(prisma, req.params.participantId)
  res.type('html').send(html)
}))

reportsRouter.put('/:participantId/:reportType/visibility', asyncHandler(async (req, res) => {
  requireTd(req)
  const reportType = String(req.params.reportType || '').toLowerCase()
  if (!['360', 'dc'].includes(reportType)) throw httpError(400, 'Report type must be 360 or dc')
  if (typeof req.body?.visible !== 'boolean') throw httpError(400, 'Visible must be true or false')

  const report = await prisma.report.findFirst({
    where: {
      participantId: req.params.participantId,
      type: reportType,
      status: { in: ['GENERATED', 'RELEASED'] },
    },
    orderBy: { updatedAt: 'desc' },
  })
  if (!report) throw httpError(409, 'Generate the report before changing its visibility.')

  const wasReleased = report.status === 'RELEASED'
  const visible = req.body.visible
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.report.update({
      where: { id: report.id },
      data: { status: visible ? 'RELEASED' : 'GENERATED', releasedAt: visible ? (report.releasedAt || new Date()) : null },
    })
    const participant = await tx.participant.update({
      where: { id: req.params.participantId },
      data: reportType === '360' ? { reportStatus: visible ? 'RELEASED' : 'GENERATED', lastActivityAt: new Date() } : {},
      include: { user: true },
    })
    if (visible && !wasReleased) {
      await queueEmail({
        templateId: reportType === '360' ? 'report-360-released' : 'report-dc-released',
        toEmail: participant.user.email,
        toName: participant.user.name,
        context: { 'Participant Name': participant.user.name },
        entity: 'Report',
        entityId: saved.id,
      }, tx)
    }
    return saved
  })

  res.json({ data: { id: updated.id, type: updated.type, status: updated.status.toLowerCase(), releasedAt: updated.releasedAt?.toISOString() || null } })
}))

reportsRouter.post('/:participantId/360/release', asyncHandler(async (req, res) => {
  requireTd(req)
  const report = await prisma.report.findFirst({
    where: {
      participantId: req.params.participantId,
      type: '360',
      status: { in: ['READY', 'GENERATED', 'RELEASED'] },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!report) {
    res.status(409).json({ error: { message: 'Generate the 360° Feedback Report before publishing it.' } })
    return
  }

  const releasedAt = report.releasedAt || new Date()
  const releasedReport = await prisma.$transaction(async (tx) => {
    const updatedReport = await tx.report.update({
      where: { id: report.id },
      data: {
        status: 'RELEASED',
        releasedAt,
      },
    })

    const participant = await tx.participant.update({
      where: { id: req.params.participantId },
      data: {
        reportStatus: 'RELEASED',
        progress: 100,
        lastActivityAt: new Date(),
      },
      include: { user: true },
    })

    await queueEmail({
      templateId: 'report-360-released',
      toEmail: participant.user.email,
      toName: participant.user.name,
      context: {
        'Participant Name': participant.user.name,
      },
      entity: 'Report',
      entityId: updatedReport.id,
    }, tx)

    return updatedReport
  })

  res.json({
    data: {
      id: releasedReport.id,
      type: releasedReport.type,
      status: releasedReport.status.toLowerCase(),
      releasedAt: releasedReport.releasedAt?.toISOString() || null,
    },
  })
}))
