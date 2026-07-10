import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { toParticipantSummary } from '../utils/mappers.js'

export const cohortsRouter = Router()

cohortsRouter.get('/', asyncHandler(async (req, res) => {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  })

  res.json({
    data: cohorts.map((cohort) => ({
      id: cohort.id,
      slug: cohort.slug,
      name: cohort.name,
      programme: cohort.programme,
      eventStart: cohort.eventStart?.toISOString() || null,
      eventEnd: cohort.eventEnd?.toISOString() || null,
      eventDate: cohort.eventStart && cohort.eventEnd
        ? `${cohort.eventStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${cohort.eventEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        : 'TBD',
      participantCount: cohort._count.participants,
    })),
  })
}))

cohortsRouter.get('/:cohortId/participants', asyncHandler(async (req, res) => {
  const cohort = await prisma.cohort.findUnique({
    where: { id: req.params.cohortId },
  })

  if (!cohort) throw httpError(404, 'Cohort not found')

  const participants = await prisma.participant.findMany({
    where: { cohortId: cohort.id },
    orderBy: { user: { name: 'asc' } },
    include: {
      user: true,
      nominees: true,
      feedbackTasks: true,
    },
  })

  res.json({
    data: participants.map(toParticipantSummary),
  })
}))
