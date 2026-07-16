import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { toParticipantSummary } from '../utils/mappers.js'
import { hashPassword } from '../utils/passwords.js'
import { queueEmail } from '../notifications/service.js'
import { logAudit } from '../utils/audit.js'

export const cohortsRouter = Router()

const dateField = z.coerce.date().optional().nullable()

const emailField = z.string().trim().email()
const participantImportSchema = z.object({
  name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField,
  designation: z.string().trim().min(1), businessUnit: z.string().trim().min(1),
  reportingManager: z.object({ name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField }),
  skipManager: z.object({ name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField }),
  buHead: z.object({ name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField }),
  buhr: z.object({ name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField }),
  masterData: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
})

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
  participants: z.array(participantImportSchema).max(1000).optional(),
})

const updateCohortSchema = createCohortSchema.omit({ participants: true }).partial()

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
  const participants = payload.participants || []
  const duplicateIds = participants.filter((row, index) => participants.findIndex((item) => item.employeeId.toLowerCase() === row.employeeId.toLowerCase()) !== index)
  const duplicateEmails = participants.filter((row, index) => participants.findIndex((item) => item.email.toLowerCase() === row.email.toLowerCase()) !== index)
  if (duplicateIds.length || duplicateEmails.length) throw httpError(400, 'Participant Ticket IDs and email addresses must be unique within the upload')
  const slug = await uniqueSlug(slugify(payload.name))
  const { participants: _rows, ...cohortData } = payload
  const passwordHash = await hashPassword(process.env.MOCK_USER_PASSWORD || 'Welcome@123')

  const cohort = await prisma.$transaction(async (tx) => {
    const created = await tx.cohort.create({ data: { ...cohortData, slug } })
    for (const row of participants) {
      const user = await tx.user.upsert({
        where: { email: row.email.toLowerCase() },
        update: { name: row.name, employeeId: row.employeeId, designation: row.designation, businessUnit: row.businessUnit, roles: ['PARTICIPANT'] },
        create: { name: row.name, email: row.email.toLowerCase(), employeeId: row.employeeId, designation: row.designation, businessUnit: row.businessUnit, passwordHash, roles: ['PARTICIPANT'] },
      })
      const participant = await tx.participant.upsert({
        where: { userId: user.id },
        update: { cohortId: created.id, masterData: row.masterData, stage: 'APPLICATION_PROFILE', progress: 10, reportStatus: 'WAITING', lastActivityAt: new Date() },
        create: { userId: user.id, cohortId: created.id, masterData: row.masterData, stage: 'APPLICATION_PROFILE', progress: 10, lastActivityAt: new Date() },
      })
      const skipIsBuHead = row.skipManager.email.toLowerCase() === row.buHead.email.toLowerCase()
      const nomineesToCreate = [
        { ...row.reportingManager, relationship: 'REPORTING_MANAGER', designation: 'Reporting Manager' },
      ]
      if (!skipIsBuHead) {
        nomineesToCreate.push({ ...row.skipManager, relationship: 'SKIP_MANAGER', designation: 'Skip Manager' })
      }
      for (const nominee of nomineesToCreate) {
        await tx.nominee.upsert({
          where: { participantId_email_relationship: { participantId: participant.id, email: nominee.email.toLowerCase(), relationship: nominee.relationship } },
          update: { name: nominee.name, designation: nominee.designation, locked: true, source: 'employee-master' },
          create: { participantId: participant.id, name: nominee.name, email: nominee.email.toLowerCase(), designation: nominee.designation, relationship: nominee.relationship, locked: true, source: 'employee-master' },
        })
      }
      await tx.user.upsert({
        where: { email: row.buhr.email.toLowerCase() },
        update: { name: row.buhr.name, employeeId: row.buhr.employeeId, businessUnit: row.businessUnit, roles: ['BUHR'] },
        create: { name: row.buhr.name, email: row.buhr.email.toLowerCase(), employeeId: row.buhr.employeeId, businessUnit: row.businessUnit, passwordHash, roles: ['BUHR'] },
      })
      await queueEmail({ templateId: 'welcome', toEmail: user.email, toName: user.name, context: { 'Participant Name': user.name, Cohort: created.name, 'Password Link': process.env.APP_URL || '', 'Nomination Deadline': created.nominationDeadline?.toISOString() || 'TBD' }, entity: 'Participant', entityId: participant.id }, tx)
    }
    await logAudit(tx, {
      actorId: req.auth.userId,
      action: 'Cohort created',
      entity: 'Cohort',
      entityId: created.id,
      metadata: { name: created.name, participantCount: participants.length },
    })

    return tx.cohort.findUnique({ where: { id: created.id }, include: { _count: { select: { participants: true } } } })
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

  await logAudit(prisma, {
    actorId: req.auth.userId,
    action: 'Cohort updated',
    entity: 'Cohort',
    entityId: cohort.id,
    metadata: { name: cohort.name, fields: Object.keys(payload) },
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
