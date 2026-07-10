import path from 'node:path'
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { generate360ReportForParticipant, getOrGenerate360Report } from '../reports/generate360Report.js'

export const reportsRouter = Router()

reportsRouter.post('/:participantId/360/generate', asyncHandler(async (req, res) => {
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
  const generated = await getOrGenerate360Report(prisma, req.params.participantId)

  res.download(generated.outputPath, generated.fileName || path.basename(generated.outputPath))
}))

reportsRouter.post('/:participantId/360/release', asyncHandler(async (req, res) => {
  const report = await prisma.report.findFirst({
    where: {
      participantId: req.params.participantId,
      type: '360',
      status: { in: ['READY', 'GENERATED', 'RELEASED'] },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!report) {
    res.status(409).json({ error: { message: 'Generate the 360 report before publishing it.' } })
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

    await tx.participant.update({
      where: { id: req.params.participantId },
      data: {
        reportStatus: 'RELEASED',
        progress: 100,
        lastActivityAt: new Date(),
      },
    })

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
