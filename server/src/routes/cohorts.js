import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { deriveTaskStatus, taskCompletionPercent, toParticipantSummary } from '../utils/mappers.js'
import { hashPassword } from '../utils/passwords.js'
import { createQueuedEmail, sendEmail } from '../notifications/service.js'

export const cohortsRouter = Router()

const dateField = z.coerce.date().optional().nullable()

const emailField = z.string().trim().email()
const optionalMasterPersonSchema = z.object({
  name: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
  email: z.union([emailField, z.literal('')]).optional(),
})
const participantImportSchema = z.object({
  name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: emailField,
  designation: z.string().trim().min(1), businessUnit: z.string().trim().min(1),
  reportingManager: optionalMasterPersonSchema.optional(),
  skipManager: optionalMasterPersonSchema.optional(),
  buHead: optionalMasterPersonSchema.optional(),
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

const addParticipantSchema = z.object({
  name: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  email: emailField,
  designation: z.string().trim().min(1),
  businessUnit: z.string().trim().min(1),
})

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'cohort'
}

function financialYear(value) {
  if (!value) return ''
  const year = value.getFullYear()
  const startYear = value.getMonth() >= 3 ? year : year - 1
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`
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

  const pendingEmailIds = []

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
      await tx.user.upsert({
        where: { email: row.buhr.email.toLowerCase() },
        update: { name: row.buhr.name, employeeId: row.buhr.employeeId, businessUnit: row.businessUnit, roles: ['BUHR'] },
        create: { name: row.buhr.name, email: row.buhr.email.toLowerCase(), employeeId: row.buhr.employeeId, businessUnit: row.businessUnit, passwordHash, roles: ['BUHR'] },
      })
      const welcomeEmail = await createQueuedEmail({ templateId: 'welcome', toEmail: user.email, toName: user.name, context: { 'Participant Name': user.name, 'Participant Email': user.email, 'Participant Password': process.env.MOCK_USER_PASSWORD || 'Welcome@123', 'Login Link': process.env.APP_URL || 'http://localhost:5173', Cohort: created.name, 'Financial Year': financialYear(created.eventStart), 'Prework Deadline': created.preWorkDeadline?.toLocaleDateString('en-GB') || 'TBD' }, entity: 'Participant', entityId: participant.id }, tx)
      pendingEmailIds.push(welcomeEmail.id)
    }
    return tx.cohort.findUnique({ where: { id: created.id }, include: { _count: { select: { participants: true } } } })
  })

  await Promise.all(pendingEmailIds.map((id) => sendEmail(id)))

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
      reports: { orderBy: { updatedAt: 'desc' } },
      assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  })

  res.json({
    data: participants.map((participant) => {
      const summary = toParticipantSummary(participant)
      const nomineesSubmitted = participant.nominees.length > 0 && participant.nominees.every((nominee) => nominee.status === 'SUBMITTED')
      const allResponsesComplete = summary.totalResponses > 0 && summary.responses === summary.totalResponses
      const latest360Report = participant.reports.find((report) => report.type.toLowerCase() === '360') || null
      const taskStatus = deriveTaskStatus(participant, {
        allResponsesComplete,
        nomineesSubmitted,
        latestReport: latest360Report,
        latestAssessorReview: participant.assessorReviews[0] || null,
      })
      return {
        ...summary,
        nominationsSubmitted: nomineesSubmitted,
        reports: participant.reports.map((report) => ({
          id: report.id,
          type: report.type.toLowerCase(),
          status: report.status.toLowerCase(),
          generatedAt: report.generatedAt?.toISOString() || null,
          releasedAt: report.releasedAt?.toISOString() || null,
        })),
        taskStatus,
        taskCompletionPercent: taskCompletionPercent(taskStatus),
      }
    }),
  })
}))

cohortsRouter.post('/:cohortId/participants', asyncHandler(async (req, res) => {
  const payload = addParticipantSchema.parse(req.body)
  const cohort = await prisma.cohort.findUnique({ where: { id: req.params.cohortId } })
  if (!cohort) throw httpError(404, 'Cohort not found')

  const email = payload.email.toLowerCase()
  const existingByEmail = await prisma.user.findUnique({ where: { email }, include: { participant: true } })
  const existingByEmployeeId = await prisma.user.findUnique({ where: { employeeId: payload.employeeId }, include: { participant: true } })
  const existing = existingByEmail || existingByEmployeeId
  if (existingByEmail && existingByEmployeeId && existingByEmail.id !== existingByEmployeeId.id) throw httpError(409, 'Email and Ticket ID belong to different existing accounts')
  if (existing?.participant) throw httpError(409, 'This employee already belongs to a cohort')

  const passwordHash = await hashPassword(process.env.MOCK_USER_PASSWORD || 'Welcome@123')
  const participant = await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { ...payload, email, roles: existing.roles.includes('PARTICIPANT') ? existing.roles : [...existing.roles, 'PARTICIPANT'] },
        })
      : await tx.user.create({ data: { ...payload, email, passwordHash, roles: ['PARTICIPANT'] } })
    const created = await tx.participant.create({
      data: { userId: user.id, cohortId: cohort.id, masterData: {}, stage: 'APPLICATION_PROFILE', progress: 0, reportStatus: 'WAITING', lastActivityAt: new Date() },
      include: { user: true, nominees: true, feedbackTasks: true },
    })
    const welcomeEmail = await createQueuedEmail({ templateId: 'welcome', toEmail: user.email, toName: user.name, context: { 'Participant Name': user.name, 'Participant Email': user.email, 'Participant Password': process.env.MOCK_USER_PASSWORD || 'Welcome@123', 'Login Link': process.env.APP_URL || 'http://localhost:5173', Cohort: cohort.name, 'Financial Year': financialYear(cohort.eventStart), 'Prework Deadline': cohort.preWorkDeadline?.toLocaleDateString('en-GB') || 'TBD' }, entity: 'Participant', entityId: created.id }, tx)
    return { created, welcomeEmailId: welcomeEmail.id }
  })

  await sendEmail(participant.welcomeEmailId)

  res.status(201).json({ data: toParticipantSummary(participant.created) })
}))

cohortsRouter.delete('/:cohortId/participants/:participantId', asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findFirst({
    where: { id: req.params.participantId, cohortId: req.params.cohortId },
    include: { user: true },
  })
  if (!participant) throw httpError(404, 'Participant not found in this cohort')

  await prisma.$transaction(async (tx) => {
    await tx.participant.delete({ where: { id: participant.id } })
    const remainingRoles = participant.user.roles.filter((role) => role !== 'PARTICIPANT')
    if (remainingRoles.length) await tx.user.update({ where: { id: participant.userId }, data: { roles: remainingRoles } })
    else await tx.user.delete({ where: { id: participant.userId } })
  })

  res.json({ data: { id: participant.id, deleted: true } })
}))
