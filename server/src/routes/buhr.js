import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { toParticipantSummary } from '../utils/mappers.js'

export const buhrRouter = Router()

async function getBuhrUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.roles.includes('BUHR')) throw httpError(403, 'BUHR access required')
  if (!user.businessUnit) throw httpError(400, 'BUHR account is not mapped to a business unit')
  return user
}

function latest360Report(participant) {
  return participant.reports
    .filter((report) => report.type === '360')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] || null
}

buhrRouter.get('/:userId/participants', asyncHandler(async (req, res) => {
  const buhr = await getBuhrUser(req.params.userId)

  const participants = await prisma.participant.findMany({
    where: {
      user: {
        businessUnit: buhr.businessUnit,
      },
    },
    include: {
      user: true,
      cohort: true,
      nominees: { orderBy: { createdAt: 'asc' } },
      feedbackTasks: true,
      reports: true,
    },
    orderBy: [
      { cohort: { eventStart: 'desc' } },
      { user: { name: 'asc' } },
    ],
  })

  const rows = participants.map((participant) => {
    const report = latest360Report(participant)
    const released = participant.reportStatus === 'RELEASED' && report?.status === 'RELEASED'

    return {
      ...toParticipantSummary(participant),
      cohort: {
        id: participant.cohort.id,
        name: participant.cohort.name,
        programme: participant.cohort.programme,
        eventStart: participant.cohort.eventStart?.toISOString() || null,
        eventEnd: participant.cohort.eventEnd?.toISOString() || null,
      },
      report: report
        ? {
            id: report.id,
            type: report.type,
            status: report.status.toLowerCase(),
            generatedAt: report.generatedAt?.toISOString() || null,
            releasedAt: report.releasedAt?.toISOString() || null,
            downloadUrl: released ? `/api/buhr/${buhr.id}/reports/${participant.id}/360/download` : null,
          }
        : null,
    }
  })

  res.json({
    data: {
      businessUnit: buhr.businessUnit,
      participants: rows,
      summary: {
        total: rows.length,
        inProgress: rows.filter((participant) => participant.progress < 100).length,
        completed: rows.filter((participant) => participant.stage === 'Completed').length,
        releasedReports: rows.filter((participant) => participant.reportStatus === 'released').length,
      },
    },
  })
}))

buhrRouter.get('/:userId/reports/:participantId/360/download', asyncHandler(async (req, res) => {
  const buhr = await getBuhrUser(req.params.userId)
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    include: {
      user: true,
      reports: true,
    },
  })

  if (!participant) throw httpError(404, 'Participant not found')
  if (participant.user.businessUnit !== buhr.businessUnit) throw httpError(403, 'This participant is outside your BUHR scope')
  if (participant.reportStatus !== 'RELEASED') throw httpError(403, 'Report is not published yet')

  const report = latest360Report(participant)
  if (!report || report.status !== 'RELEASED' || !report.fileUrl) throw httpError(404, 'Published report file not found')

  try {
    await fs.access(report.fileUrl)
  } catch {
    throw httpError(404, 'Published report file is missing on the server')
  }

  res.download(report.fileUrl, path.basename(report.fileUrl))
}))
