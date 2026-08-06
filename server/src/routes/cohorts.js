import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { deriveTaskStatus, taskCompletionPercent, toParticipantSummary } from '../utils/mappers.js'
import { hashPassword } from '../utils/passwords.js'
import { createQueuedEmail, sendEmail } from '../notifications/service.js'
import { createBuhrMagicLink, createParticipantMagicLink } from '../utils/magicLinks.js'

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

const addParticipantSchema = participantImportSchema

const employeeDirectoryImportSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  entries: z.array(z.object({
    employeeId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    positionLevel: z.string().trim().min(1),
    email: z.string().trim().email().nullable(),
  })).min(1).max(15000),
})

const buhrCredentialEmailSchema = z.object({
  emails: z.array(emailField).min(1).max(500),
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

function participantCredentialTable(participants) {
  const password = process.env.MOCK_USER_PASSWORD || 'Welcome@123'
  return participants
    .map((participant) => `${participant.name} | ${participant.employeeId} | ${participant.email} | ${password}`)
    .join('\n')
}

async function queueBuhrCredentialEmails(db, cohort, groups, actorId = null) {
  const emailIds = []
  for (const group of groups.values()) {
    const buhrUser = await db.user.findUnique({ where: { email: group.email } })
    if (!buhrUser || !buhrUser.roles.includes('BUHR')) continue
    const buhrLink = await createBuhrMagicLink(db, { userId: buhrUser.id, email: buhrUser.email })
    const email = await createQueuedEmail({
      templateId: 'buhr-participant-credentials',
      toEmail: group.email,
      toName: group.name,
      context: {
        'BUHR Name': group.name,
        'BUHR Email': group.email,
        'BUHR Password': process.env.MOCK_USER_PASSWORD || 'Welcome@123',
        Cohort: cohort.name,
        'Login Link': buhrLink.inviteUrl,
        'App Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
        'Participant Credentials': participantCredentialTable(group.participants),
      },
      entity: 'Cohort',
      entityId: cohort.id,
      actorId,
      magicLinkId: buhrLink.magicLink.id,
      metadata: { cohortId: cohort.id, buhrEmail: group.email, participantCount: group.participants.length },
    }, db)
    if (email) emailIds.push(email.id)
  }
  return emailIds
}

function addToBuhrGroup(groups, buhr, participant) {
  const email = buhr.email.toLowerCase()
  const group = groups.get(email) || { name: buhr.name, employeeId: buhr.employeeId, email, participants: [] }
  group.participants.push(participant)
  groups.set(email, group)
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
  const buhrGroups = new Map()

  const cohort = await prisma.$transaction(async (tx) => {
    const created = await tx.cohort.create({ data: { ...cohortData, slug } })
    for (const row of participants) {
      const participantEmail = row.email.toLowerCase()
      const existingParticipantUser = await tx.user.findUnique({ where: { email: participantEmail } })
      const participantUserData = { name: row.name, employeeId: row.employeeId, designation: row.designation, businessUnit: row.businessUnit }
      const user = existingParticipantUser
        ? await tx.user.update({
            where: { id: existingParticipantUser.id },
            data: {
              ...participantUserData,
              roles: existingParticipantUser.roles.includes('PARTICIPANT')
                ? existingParticipantUser.roles
                : [...existingParticipantUser.roles, 'PARTICIPANT'],
            },
          })
        : await tx.user.create({ data: { ...participantUserData, email: participantEmail, passwordHash, roles: ['PARTICIPANT'] } })
      const participant = await tx.participant.upsert({
        where: { userId: user.id },
        update: { cohortId: created.id, masterData: row.masterData, stage: 'APPLICATION_PROFILE', progress: 10, reportStatus: 'WAITING', lastActivityAt: new Date() },
        create: { userId: user.id, cohortId: created.id, masterData: row.masterData, stage: 'APPLICATION_PROFILE', progress: 10, lastActivityAt: new Date() },
      })
      const buhrEmail = row.buhr.email.toLowerCase()
      const existingBuhr = await tx.user.findUnique({ where: { email: buhrEmail } })
      if (existingBuhr) {
        await tx.user.update({
          where: { id: existingBuhr.id },
          data: {
            name: row.buhr.name,
            employeeId: row.buhr.employeeId,
            businessUnit: row.businessUnit,
            roles: existingBuhr.roles.includes('BUHR') ? existingBuhr.roles : [...existingBuhr.roles, 'BUHR'],
          },
        })
      } else {
        await tx.user.create({
          data: { name: row.buhr.name, email: buhrEmail, employeeId: row.buhr.employeeId, businessUnit: row.businessUnit, passwordHash, roles: ['BUHR'] },
        })
      }
      const participantLink = await createParticipantMagicLink(tx, { userId: user.id, email: user.email, participantId: participant.id })
      const welcomeEmail = await createQueuedEmail({ templateId: 'welcome', toEmail: user.email, toName: user.name, context: { 'Participant Name': user.name, 'Participant Email': user.email, 'Participant Password': process.env.MOCK_USER_PASSWORD || 'Welcome@123', 'Login Link': participantLink.inviteUrl, 'App Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173', Cohort: created.name, 'Financial Year': financialYear(created.eventStart), 'Prework Deadline': created.preWorkDeadline?.toLocaleDateString('en-GB') || 'TBD' }, magicLinkId: participantLink.magicLink.id, entity: 'Participant', entityId: participant.id }, tx)
      if (welcomeEmail) pendingEmailIds.push(welcomeEmail.id)
      addToBuhrGroup(buhrGroups, row.buhr, { name: user.name, employeeId: user.employeeId, email: user.email })
    }
    pendingEmailIds.push(...await queueBuhrCredentialEmails(tx, created, buhrGroups, req.auth?.userId || null))
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

cohortsRouter.get('/employee-directory/status', asyncHandler(async (_req, res) => {
  const [metadata, aggregate] = await Promise.all([
    prisma.employeeDirectoryImport.findUnique({ where: { id: 'current' } }),
    prisma.employeeDirectoryEntry.aggregate({
      _count: { _all: true, email: true },
      _max: { updatedAt: true },
    }),
  ])
  const total = aggregate._count._all
  res.json({
    data: total ? {
      fileName: metadata?.fileName || null,
      total,
      withEmail: aggregate._count.email,
      withoutEmail: total - aggregate._count.email,
      uploadedAt: (metadata?.uploadedAt || aggregate._max.updatedAt)?.toISOString() || null,
    } : null,
  })
}))

cohortsRouter.post('/employee-directory/import', asyncHandler(async (req, res) => {
  const payload = employeeDirectoryImportSchema.parse(req.body)
  const entries = [...new Map(payload.entries.map((entry) => [entry.employeeId.toLowerCase(), {
    employeeId: entry.employeeId,
    name: entry.name,
    positionLevel: entry.positionLevel.toUpperCase(),
    email: entry.email?.toLowerCase() || null,
  }])).values()]
  const now = new Date()
  const withEmail = entries.filter((entry) => entry.email).length

  await prisma.$transaction(async (tx) => {
    await tx.employeeDirectoryEntry.deleteMany()
    await tx.employeeDirectoryEntry.createMany({
      data: entries.map((entry) => ({ ...entry, createdAt: now, updatedAt: now })),
    })
    await tx.employeeDirectoryImport.upsert({
      where: { id: 'current' },
      update: { fileName: payload.fileName, total: entries.length, withEmail, withoutEmail: entries.length - withEmail, uploadedAt: now, uploadedById: req.auth?.userId || null },
      create: { id: 'current', fileName: payload.fileName, total: entries.length, withEmail, withoutEmail: entries.length - withEmail, uploadedAt: now, uploadedById: req.auth?.userId || null },
    })
  })

  res.json({
    data: {
      imported: entries.length,
      fileName: payload.fileName,
      withEmail,
      withoutEmail: entries.length - withEmail,
      importedAt: now.toISOString(),
    },
  })
}))

cohortsRouter.delete('/:cohortId', asyncHandler(async (req, res) => {
  const cohort = await prisma.cohort.findUnique({
    where: { id: req.params.cohortId },
    include: {
      participants: {
        include: {
          user: true,
          feedbackTasks: { select: { id: true } },
          reports: { select: { id: true } },
        },
      },
    },
  })
  if (!cohort) throw httpError(404, 'Cohort not found')

  const participantIds = cohort.participants.map((participant) => participant.id)
  const feedbackTaskIds = cohort.participants.flatMap((participant) => participant.feedbackTasks.map((task) => task.id))
  const reportIds = cohort.participants.flatMap((participant) => participant.reports.map((report) => report.id))
  const participantUsers = cohort.participants.map((participant) => participant.user)
  const magicLinks = participantIds.length ? await prisma.magicLink.findMany({
    where: { role: 'RESPONDENT' },
    select: { id: true, payload: true },
  }) : []
  const participantIdSet = new Set(participantIds)
  const magicLinkIds = magicLinks
    .filter((link) => link.payload && typeof link.payload === 'object' && participantIdSet.has(link.payload.participantId))
    .map((link) => link.id)

  await prisma.$transaction(async (tx) => {
    const emailFilters = [
      participantIds.length ? { entity: 'Participant', entityId: { in: participantIds } } : null,
      feedbackTaskIds.length ? { entity: 'FeedbackTask', entityId: { in: feedbackTaskIds } } : null,
      reportIds.length ? { entity: 'Report', entityId: { in: reportIds } } : null,
      participantIds.length ? { entity: 'ParticipantTask', OR: participantIds.map((id) => ({ entityId: { startsWith: `${id}:` } })) } : null,
      magicLinkIds.length ? { magicLinkId: { in: magicLinkIds } } : null,
    ].filter(Boolean)
    if (emailFilters.length) await tx.emailOutbox.deleteMany({ where: { OR: emailFilters } })
    if (magicLinkIds.length) await tx.magicLink.deleteMany({ where: { id: { in: magicLinkIds } } })
    await tx.cohort.delete({ where: { id: cohort.id } })

    const usersByRemainingRoles = new Map()
    for (const user of participantUsers) {
      const remainingRoles = user.roles.filter((role) => role !== 'PARTICIPANT')
      const key = JSON.stringify(remainingRoles)
      const group = usersByRemainingRoles.get(key) || { roles: remainingRoles, ids: [] }
      group.ids.push(user.id)
      usersByRemainingRoles.set(key, group)
    }
    for (const group of usersByRemainingRoles.values()) {
      await tx.user.updateMany({ where: { id: { in: group.ids } }, data: { roles: group.roles } })
    }
  })

  res.json({
    data: {
      id: cohort.id,
      name: cohort.name,
      participantCount: cohort.participants.length,
      deleted: true,
    },
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
      reports: { orderBy: { updatedAt: 'desc' } },
      assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  })

  res.json({
    data: participants.map((participant) => {
      const summary = toParticipantSummary(participant)
      const nomineesSubmitted = participant.nominees.length > 0 && participant.nominees.every((nominee) => nominee.status === 'SUBMITTED')
      const allResponsesComplete = summary.selfFeedback.status === 'submitted'
        && summary.totalResponses > 0
        && summary.responses === summary.totalResponses
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
    const participantUserData = {
      name: payload.name,
      employeeId: payload.employeeId,
      email,
      designation: payload.designation,
      businessUnit: payload.businessUnit,
    }
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { ...participantUserData, roles: existing.roles.includes('PARTICIPANT') ? existing.roles : [...existing.roles, 'PARTICIPANT'] },
        })
      : await tx.user.create({ data: { ...participantUserData, passwordHash, roles: ['PARTICIPANT'] } })
    const created = await tx.participant.create({
      data: { userId: user.id, cohortId: cohort.id, masterData: payload.masterData, stage: 'APPLICATION_PROFILE', progress: 0, reportStatus: 'WAITING', lastActivityAt: new Date() },
      include: { user: true, nominees: true, feedbackTasks: true },
    })
    const buhrEmail = payload.buhr.email.toLowerCase()
    const existingBuhr = await tx.user.findUnique({ where: { email: buhrEmail } })
    if (existingBuhr) {
      await tx.user.update({
        where: { id: existingBuhr.id },
        data: {
          name: payload.buhr.name,
          employeeId: payload.buhr.employeeId,
          businessUnit: payload.businessUnit,
          roles: existingBuhr.roles.includes('BUHR') ? existingBuhr.roles : [...existingBuhr.roles, 'BUHR'],
        },
      })
    } else {
      await tx.user.create({
        data: { name: payload.buhr.name, email: buhrEmail, employeeId: payload.buhr.employeeId, businessUnit: payload.businessUnit, passwordHash, roles: ['BUHR'] },
      })
    }
    const participantLink = await createParticipantMagicLink(tx, { userId: user.id, email: user.email, participantId: created.id })
    const welcomeEmail = await createQueuedEmail({ templateId: 'welcome', toEmail: user.email, toName: user.name, context: { 'Participant Name': user.name, 'Participant Email': user.email, 'Participant Password': process.env.MOCK_USER_PASSWORD || 'Welcome@123', 'Login Link': participantLink.inviteUrl, 'App Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173', Cohort: cohort.name, 'Financial Year': financialYear(cohort.eventStart), 'Prework Deadline': cohort.preWorkDeadline?.toLocaleDateString('en-GB') || 'TBD' }, magicLinkId: participantLink.magicLink.id, entity: 'Participant', entityId: created.id }, tx)
    return { created, welcomeEmailId: welcomeEmail?.id || null }
  })

  if (participant.welcomeEmailId) await sendEmail(participant.welcomeEmailId)

  res.status(201).json({ data: toParticipantSummary(participant.created) })
}))

cohortsRouter.post('/:cohortId/participants/buhr-credentials', asyncHandler(async (req, res) => {
  const payload = buhrCredentialEmailSchema.parse(req.body)
  const cohort = await prisma.cohort.findUnique({
    where: { id: req.params.cohortId },
    include: { participants: { include: { user: true } } },
  })
  if (!cohort) throw httpError(404, 'Cohort not found')

  const requestedEmails = new Set(payload.emails.map((email) => email.toLowerCase()))
  const groups = new Map()
  for (const participant of cohort.participants) {
    const masterData = participant.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
    const email = String(masterData.buhrEmail || '').trim().toLowerCase()
    if (!requestedEmails.has(email)) continue
    const legacyBuhrEmployeeId = Object.entries(masterData).find(([key]) => /buhr.*(ticket|employee).*id/i.test(key))?.[1]
    addToBuhrGroup(groups, { name: String(masterData.buhrName || email), employeeId: String(masterData.buhrEmployeeId || legacyBuhrEmployeeId || ''), email }, {
      name: participant.user.name,
      employeeId: participant.user.employeeId,
      email: participant.user.email,
    })
  }
  if (!groups.size) throw httpError(400, 'No mapped participants were found for the selected BUHR accounts')

  const emailIds = await prisma.$transaction((tx) => queueBuhrCredentialEmails(tx, cohort, groups, req.auth?.userId || null))
  const emails = await Promise.all(emailIds.map((id) => sendEmail(id)))
  res.status(201).json({ data: { emails: emails.length, buhrs: groups.size } })
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
