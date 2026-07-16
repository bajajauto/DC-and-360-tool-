import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import {
  buildInviteUrl,
  generateMagicToken,
  getMagicLinkExpiry,
  hashMagicToken,
  normalizeEmail,
} from '../utils/magicLinks.js'
import { toNomineeDto, toParticipantSummary } from '../utils/mappers.js'
import { queueEmail } from '../notifications/service.js'
import { logAudit } from '../utils/audit.js'
import { getBehaviourIds, getSurveySections } from '../../../src/data/surveyConfig.js'

export const participantsRouter = Router()

const relationshipMap = {
  'reporting-manager': 'REPORTING_MANAGER',
  'skip-manager': 'SKIP_MANAGER',
  peer: 'PEER',
  'direct-report': 'DIRECT_REPORT',
}

const nomineeSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  designation: z.string().trim().optional().nullable(),
  relationship: z.enum(['reporting-manager', 'skip-manager', 'peer', 'direct-report']),
  source: z.string().trim().optional(),
  locked: z.boolean().optional(),
})

const nomineesPayloadSchema = z.object({
  nominees: z.array(nomineeSchema).min(1),
})

const participantWorkSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  submit: z.boolean().optional().default(false),
})

function formatCutoff(date) {
  return date
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'the cutoff date set for your cohort'
}

function assertParticipantAccess(req, participant) {
  const auth = req.auth
  if (auth.roles.includes('td')) return
  if (participant.userId === auth.userId) return
  throw httpError(403, 'You do not have access to this participant')
}

async function findParticipant(id) {
  const participant = await prisma.participant.findUnique({
    where: { id },
    include: {
      user: true,
      cohort: true,
      nominees: { orderBy: { createdAt: 'asc' } },
      feedbackTasks: { include: { responses: true } },
    },
  })

  if (!participant) throw httpError(404, 'Participant not found')
  return participant
}

participantsRouter.get('/:participantId', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)

  res.json({
    data: {
      ...toParticipantSummary(participant),
      masterData: participant.masterData || {},
      reportReady: participant.feedbackTasks.length > 0 && participant.feedbackTasks.every((task) => {
        if (task.status !== 'SUBMITTED') return false
        const ratings = task.responses?.[0]?.ratings
        if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return false
        return getBehaviourIds(getSurveySections(task.relationship)).every((id) => Number.isFinite(ratings[id]) && ratings[id] >= 1 && ratings[id] <= 4)
      }),
      cohort: {
        id: participant.cohort.id,
        name: participant.cohort.name,
        programme: participant.cohort.programme,
        eventStart: participant.cohort.eventStart?.toISOString() || null,
        eventEnd: participant.cohort.eventEnd?.toISOString() || null,
        eventDate: participant.cohort.eventStart && participant.cohort.eventEnd
          ? `${participant.cohort.eventStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${participant.cohort.eventEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
          : 'TBD',
      },
      nominees: participant.nominees.map(toNomineeDto),
    },
  })
}))

participantsRouter.get('/:participantId/work/:type', asyncHandler(async (req, res) => {
  if (!['role-interview', 'pre-work'].includes(req.params.type)) throw httpError(404, 'Participant form not found')
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const value = req.params.type === 'role-interview' ? participant.roleInterview : participant.preWork
  res.json({ data: value || { answers: {}, status: 'draft', submittedAt: null } })
}))

participantsRouter.put('/:participantId/work/:type', asyncHandler(async (req, res) => {
  if (!['role-interview', 'pre-work'].includes(req.params.type)) throw httpError(404, 'Participant form not found')
  const payload = participantWorkSchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const field = req.params.type === 'role-interview' ? 'roleInterview' : 'preWork'
  const current = participant[field]
  if (current?.status === 'submitted') throw httpError(409, 'This form has already been submitted and is locked')
  const value = { answers: payload.answers, status: payload.submit ? 'submitted' : 'draft', submittedAt: payload.submit ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
  await prisma.participant.update({ where: { id: participant.id }, data: { [field]: value, lastActivityAt: new Date() } })
  res.json({ data: value })
}))

participantsRouter.put('/:participantId/nominees', asyncHandler(async (req, res) => {
  const payload = nomineesPayloadSchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)

  const nominees = await prisma.$transaction(async (tx) => {
    await tx.nominee.deleteMany({
      where: {
        participantId: req.params.participantId,
        status: 'DRAFT',
      },
    })

    await tx.nominee.createMany({
      data: payload.nominees.map((nominee) => ({
        participantId: req.params.participantId,
        name: nominee.name,
        email: normalizeEmail(nominee.email),
        designation: nominee.designation || null,
        relationship: relationshipMap[nominee.relationship],
        source: nominee.source || 'manual',
        locked: nominee.locked || false,
        status: 'DRAFT',
      })),
      skipDuplicates: true,
    })

    await tx.participant.update({
      where: { id: req.params.participantId },
      data: {
        stage: 'NOMINEES_360',
        progress: Math.max(participant.progress, 45),
        lastActivityAt: new Date(),
      },
    })

    return tx.nominee.findMany({
      where: { participantId: req.params.participantId },
      orderBy: { createdAt: 'asc' },
    })
  })

  res.json({
    data: nominees.map(toNomineeDto),
  })
}))

participantsRouter.post('/:participantId/nominees/submit', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const nominees = participant.nominees

  if (!nominees.length) throw httpError(400, 'Add nominees before submitting')
  if (!nominees.some((nominee) => nominee.relationship === 'REPORTING_MANAGER')) {
    throw httpError(400, 'At least 1 reporting manager nominee is required')
  }
  if (nominees.filter((nominee) => nominee.relationship === 'PEER').length < 4) {
    throw httpError(400, 'At least 4 peer nominees are required')
  }

  const { submittedNominees, invites } = await prisma.$transaction(async (tx) => {
    await tx.nominee.updateMany({
      where: { participantId: participant.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    const generatedInvites = []
    const cutoffDate = participant.cohort.threeSixtyCutoff
    const cutoffLabel = formatCutoff(cutoffDate)

    for (const nominee of nominees) {
      const existingUser = await tx.user.findUnique({
        where: { email: normalizeEmail(nominee.email) },
      })
      const respondentUser = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              roles: existingUser.roles.includes('RESPONDENT')
                ? existingUser.roles
                : [...existingUser.roles, 'RESPONDENT'],
            },
          })
        : null

      const task = await tx.feedbackTask.upsert({
        where: { nomineeId: nominee.id },
        update: {
          respondentId: respondentUser?.id || undefined,
          dueAt: cutoffDate,
        },
        create: {
          participantId: participant.id,
          nomineeId: nominee.id,
          respondentId: respondentUser?.id || null,
          relationship: nominee.relationship,
          status: 'PENDING',
          dueAt: cutoffDate,
        },
      })

      if (respondentUser && !nominee.userId) {
        await tx.nominee.update({
          where: { id: nominee.id },
          data: { userId: respondentUser.id },
        })
      }

      const token = generateMagicToken()
      const inviteUrl = buildInviteUrl(token)
      const expiresAt = getMagicLinkExpiry()

      const magicLink = await tx.magicLink.create({
        data: {
          userId: respondentUser?.id || null,
          email: normalizeEmail(nominee.email),
          role: 'RESPONDENT',
          tokenHash: hashMagicToken(token),
          expiresAt,
          payload: {
            taskId: task.id,
            nomineeId: nominee.id,
            participantId: participant.id,
            name: nominee.name,
            nomineeType: respondentUser ? 'internal' : 'external',
          },
        },
      })

      await queueEmail({
        templateId: 'resp-invite',
        toEmail: normalizeEmail(nominee.email),
        toName: nominee.name,
        context: {
          'Respondent Name': nominee.name,
          'Participant Name': participant.user.name,
          Relationship: nominee.relationship.toLowerCase().replaceAll('_', ' '),
          'Estimated Time': '20 minutes',
          'Magic Link': inviteUrl,
          '360 Cutoff': cutoffLabel,
        },
        magicLinkId: magicLink.id,
        entity: 'FeedbackTask',
        entityId: task.id,
        metadata: {
          nomineeId: nominee.id,
          participantId: participant.id,
          nomineeType: respondentUser ? 'internal' : 'external',
        },
      }, tx)

      generatedInvites.push({
        nomineeId: nominee.id,
        taskId: task.id,
        name: nominee.name,
        email: normalizeEmail(nominee.email),
        nomineeType: respondentUser ? 'internal' : 'external',
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      })
    }

    await queueEmail({
      templateId: 'nominations-confirmed',
      toEmail: normalizeEmail(participant.user.email),
      toName: participant.user.name,
      context: {
        'Participant Name': participant.user.name,
        'Respondent Count': String(nominees.length),
        '360 Cutoff': cutoffLabel,
      },
      entity: 'Participant',
      entityId: participant.id,
      metadata: {
        nomineeCount: nominees.length,
      },
    }, tx)

    const buhrs = await tx.user.findMany({
      where: {
        roles: { has: 'BUHR' },
        businessUnit: participant.user.businessUnit,
      },
    })

    for (const buhr of buhrs) {
      await queueEmail({
        templateId: 'nominees-submitted-buhr',
        toEmail: normalizeEmail(buhr.email),
        toName: buhr.name,
        context: {
          'BUHR Name': buhr.name,
          'Participant Name': participant.user.name,
          Cohort: participant.cohort.name,
          'Respondent Count': String(nominees.length),
        },
        entity: 'Participant',
        entityId: participant.id,
      }, tx)
    }

    await tx.participant.update({
      where: { id: participant.id },
      data: {
        stage: 'FEEDBACK_360',
        progress: Math.max(participant.progress, 50),
        lastActivityAt: new Date(),
      },
    })

    const submitted = await tx.nominee.findMany({
      where: { participantId: participant.id },
      orderBy: { createdAt: 'asc' },
    })

    await logAudit(tx, {
      actorId: req.auth.userId,
      action: 'Nominations submitted',
      entity: 'Participant',
      entityId: participant.id,
      metadata: { participantName: participant.user.name, respondentCount: nominees.length },
    })

    return { submittedNominees: submitted, invites: generatedInvites }
  })

  res.json({
    data: submittedNominees.map(toNomineeDto),
    invites,
  })
}))
