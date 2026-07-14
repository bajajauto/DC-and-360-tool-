import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { toParticipantSummary } from '../utils/mappers.js'

export const cohortsRouter = Router()

const dateField = z.coerce.date().optional().nullable()

const createCohortSchema = z.object({
  name: z.string().trim().min(1),
  programme: z.string().trim().min(1),
  eventStart: dateField,
  eventEnd: dateField,
  roleInterviewDeadline: dateField,
  photoDeadline: dateField,
  preWorkDeadline: dateField,
  nominationDeadline: dateField,
  threeSixtyCutoff: dateField,
})

const updateCohortSchema = createCohortSchema.partial()

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cohort'
}

async function uniqueSlug(base) {
  let slug = base
  let suffix = 1
  while (await prisma.cohort.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${base}-${suffix}`
  }
  return slug
}

function toCohortDto(cohort) {
  return {
    id: cohort.id,
    slug: cohort.slug,
    name: cohort.name,
    programme: cohort.programme,
    eventStart: cohort.eventStart?.toISOString() || null,
    eventEnd: cohort.eventEnd?.toISOString() || null,
    eventDate: cohort.eventStart && cohort.eventEnd
      ? `${cohort.eventStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${cohort.eventEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
      : 'TBD',
    participantCount: cohort._count?.participants ?? 0,
    roleInterviewDeadline: cohort.roleInterviewDeadline?.toISOString() || null,
    photoDeadline: cohort.photoDeadline?.toISOString() || null,
    preWorkDeadline: cohort.preWorkDeadline?.toISOString() || null,
    nominationDeadline: cohort.nominationDeadline?.toISOString() || null,
    threeSixtyCutoff: cohort.threeSixtyCutoff?.toISOString() || null,
  }
}

cohortsRouter.get('/', asyncHandler(async (req, res) => {
  const cohorts = await prisma.cohort.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  })

  res.json({ data: cohorts.map(toCohortDto) })
}))

cohortsRouter.post('/', asyncHandler(async (req, res) => {
  const payload = createCohortSchema.parse(req.body)
  const slug = await uniqueSlug(slugify(payload.name))

  const cohort = await prisma.cohort.create({
    data: { ...payload, slug },
    include: { _count: { select: { participants: true } } },
  })

  res.status(201).json({ data: toCohortDto(cohort) })
}))

cohortsRouter.patch('/:cohortId', asyncHandler(async (req, res) => {
  const payload = updateCohortSchema.parse(req.body)
  const existing = await prisma.cohort.findUnique({ where: { id: req.params.cohortId } })
  if (!existing) throw httpError(404, 'Cohort not found')

  const cohort = await prisma.cohort.update({
    where: { id: req.params.cohortId },
    data: payload,
    include: { _count: { select: { participants: true } } },
  })

  res.json({ data: toCohortDto(cohort) })
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
