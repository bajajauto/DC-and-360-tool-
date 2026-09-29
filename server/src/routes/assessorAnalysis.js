import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'

export const assessorAnalysisRouter = Router()

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(150),
  size: z.number().int().positive().max(7_000_000),
  dataUrl: z.string().max(9_500_000).refine((value) => /^data:(application|text)\//.test(value), 'Invalid workbook data'),
})

function toDto(participant) {
  const review = participant.assessorReviews?.[0] || null
  const workbook = review?.evidence?.workbook || null
  return {
    participantId: participant.id,
    name: participant.user.name,
    employeeId: participant.user.employeeId,
    designation: participant.user.designation || '',
    businessUnit: participant.user.businessUnit || '',
    cohort: participant.cohort?.name || null,
    workbook: workbook ? {
      fileName: workbook.fileName,
      mimeType: workbook.mimeType,
      size: workbook.size,
      uploadedAt: workbook.uploadedAt,
      uploadedBy: workbook.uploadedBy,
    } : null,
  }
}

function isMissingParticipantColumn(error) {
  return error?.code === 'P2022'
}

const participantListSelect = {
  id: true,
  user: { select: { name: true, employeeId: true, designation: true, businessUnit: true } },
  cohort: { select: { name: true } },
  assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1, select: { evidence: true } },
}

assessorAnalysisRouter.get('/', asyncHandler(async (_req, res) => {
  let participants
  try {
    participants = await prisma.participant.findMany({
      where: { archivedAt: null },
      orderBy: { user: { name: 'asc' } },
      select: participantListSelect,
    })
  } catch (error) {
    if (!isMissingParticipantColumn(error)) throw error
    participants = await prisma.participant.findMany({
      where: { cohortId: { not: null } },
      orderBy: { user: { name: 'asc' } },
      select: {
        id: true,
        user: { select: { name: true, employeeId: true } },
        cohort: { select: { name: true } },
      },
    })
  }
  res.json({ data: participants.map(toDto) })
}))

assessorAnalysisRouter.put('/:participantId', asyncHandler(async (req, res) => {
  const payload = uploadSchema.parse(req.body)
  let participant
  try {
    participant = await prisma.participant.findFirst({
      where: { id: req.params.participantId, archivedAt: null },
      select: { id: true },
    })
  } catch (error) {
    if (!isMissingParticipantColumn(error)) throw error
    participant = await prisma.participant.findFirst({
      where: { id: req.params.participantId, cohortId: { not: null } },
      select: { id: true },
    })
  }
  if (!participant) throw httpError(404, 'Participant not found')
  const actor = await prisma.user.findUnique({ where: { id: req.auth.userId }, select: { name: true } })
  const existing = await prisma.assessorReview.findFirst({ where: { participantId: participant.id }, orderBy: { updatedAt: 'desc' } })
  const workbook = { ...payload, uploadedAt: new Date().toISOString(), uploadedBy: actor?.name || 'User' }
  const review = existing
    ? await prisma.assessorReview.update({ where: { id: existing.id }, data: { status: 'uploaded', assessorName: actor?.name || existing.assessorName, evidence: { ...(existing.evidence || {}), workbook } } })
    : await prisma.assessorReview.create({ data: { participantId: participant.id, assessorName: actor?.name || 'User', status: 'uploaded', evidence: { workbook } } })
  res.json({ data: { participantId: participant.id, workbook: review.evidence.workbook } })
}))

assessorAnalysisRouter.get('/:participantId/download', asyncHandler(async (req, res) => {
  const review = await prisma.assessorReview.findFirst({ where: { participantId: req.params.participantId, participant: { archivedAt: null } }, orderBy: { updatedAt: 'desc' } })
  const workbook = review?.evidence?.workbook
  if (!workbook?.dataUrl) throw httpError(404, 'Assessor analysis workbook not found')
  const match = workbook.dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw httpError(500, 'Stored workbook is invalid')
  res.setHeader('Content-Type', match[1])
  res.setHeader('Content-Disposition', `attachment; filename="${String(workbook.fileName).replaceAll('"', '')}"`)
  res.send(Buffer.from(match[2], 'base64'))
}))
