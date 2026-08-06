import fs from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { deriveTaskStatus, taskCompletionPercent, toParticipantSummary } from '../utils/mappers.js'

export const buhrRouter = Router()

function assertBuhrSelf(req) {
  if (req.auth.roles.includes('td')) return
  if (req.auth.userId !== req.params.userId) {
    throw httpError(403, 'You can only access your own BUHR portfolio')
  }
}

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

function isMappedToBuhr(participant, buhr) {
  const masterData = participant?.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
  return String(masterData.buhrEmail || '').trim().toLowerCase() === buhr.email.trim().toLowerCase()
}

buhrRouter.get('/:userId/participants', asyncHandler(async (req, res) => {
  assertBuhrSelf(req)
  const buhr = await getBuhrUser(req.params.userId)

  const businessUnitParticipants = await prisma.participant.findMany({
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
      assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
    orderBy: [
      { cohort: { eventStart: 'desc' } },
      { user: { name: 'asc' } },
    ],
  })
  const participants = businessUnitParticipants.filter((participant) => isMappedToBuhr(participant, buhr))

  const rows = participants.map((participant) => {
    const report = latest360Report(participant)
    const released = participant.reportStatus === 'RELEASED' && report?.status === 'RELEASED'
    const summary = toParticipantSummary(participant)
    const nomineesSubmitted = participant.nominees.length > 0 && participant.nominees.every((nominee) => nominee.status === 'SUBMITTED')
    const taskStatus = deriveTaskStatus(participant, {
      allResponsesComplete: summary.selfFeedback.status === 'submitted'
        && summary.totalResponses > 0
        && summary.responses === summary.totalResponses,
      nomineesSubmitted,
      latestReport: report,
      latestAssessorReview: participant.assessorReviews[0] || null,
    })

    return {
      ...summary,
      taskStatus,
      assessorTemplateUploaded: participant.assessorReviews[0]?.status === 'uploaded',
      taskCompletionPercent: taskCompletionPercent(taskStatus),
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
      reports: participant.reports
        .filter((item) => item.status === 'RELEASED')
        .map((item) => ({
          id: item.id,
          type: item.type.toLowerCase(),
          status: item.status.toLowerCase(),
          generatedAt: item.generatedAt?.toISOString() || null,
          releasedAt: item.releasedAt?.toISOString() || null,
          downloadUrl: `/api/buhr/${buhr.id}/reports/${participant.id}/${item.type.toLowerCase()}/download`,
        })),
      reportStatuses: participant.reports.map((item) => ({
        type: item.type.toLowerCase(),
        status: item.status.toLowerCase(),
        generatedAt: item.generatedAt?.toISOString() || null,
        releasedAt: item.releasedAt?.toISOString() || null,
      })),
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

buhrRouter.get('/:userId/reports/:participantId/:reportType/download', asyncHandler(async (req, res) => {
  assertBuhrSelf(req)
  const buhr = await getBuhrUser(req.params.userId)
  const participant = await prisma.participant.findUnique({
    where: { id: req.params.participantId },
    include: {
      user: true,
      reports: true,
    },
  })

  if (!participant) throw httpError(404, 'Participant not found')
  if (!isMappedToBuhr(participant, buhr)) throw httpError(403, 'This participant is not mapped to your BUHR account')
  const report = participant.reports
    .filter((item) => item.type.toLowerCase() === req.params.reportType.toLowerCase())
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] || null
  if (!report || report.status !== 'RELEASED' || !report.fileUrl) throw httpError(404, 'Published report file not found')

  try {
    await fs.access(report.fileUrl)
  } catch {
    throw httpError(404, 'Published report file is missing on the server')
  }

  res.download(report.fileUrl, path.basename(report.fileUrl))
}))
