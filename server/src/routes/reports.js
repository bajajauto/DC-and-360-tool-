import path from 'node:path'
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { generate360ReportForParticipant, get360ReportPreviewHtml, getOrGenerate360Report } from '../reports/generate360Report.js'
import { build360ResponseDataWorkbook } from '../reports/build360ResponseData.js'
import { queueEmail } from '../notifications/service.js'

export const reportsRouter = Router()

function requireTd(req) {
  if (!req.auth.roles.includes('td')) throw httpError(403, 'Talent Development access required')
}

async function assertReportDownloadAccess(req) {
  if (req.auth.roles.includes('td')) return
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    select: { userId: true, reports: { where: { type: '360', status: 'RELEASED' }, take: 1, select: { id: true } } },
  })
  if (!participant) throw httpError(404, 'Participant not found')
  if (participant.userId !== req.auth.userId) {
    throw httpError(403, 'You do not have access to this report')
  }
  if (!participant.reports.length) throw httpError(403, 'This report has not been released by Talent Development')
}

reportsRouter.get('/repository', asyncHandler(async (req, res) => {
  requireTd(req)
  const reports = await prisma.report.findMany({
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

  const visibleReports = reports.filter((report) => {
    if (report.status === 'RELEASED') return true
    const allSubmitted = report.participant.feedbackTasks.length > 0 && report.participant.feedbackTasks.every((task) => task.status === 'SUBMITTED')
    const cutoff = report.participant.cohort.threeSixtyCutoff
    const cutoffPassed = cutoff ? new Date() > new Date(new Date(cutoff).setUTCHours(23, 59, 59, 999)) : false
    return allSubmitted || cutoffPassed
  })

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
  const generated = await getOrGenerate360Report(prisma, req.params.participantId)

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
