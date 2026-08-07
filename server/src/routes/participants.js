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
import { deriveTaskStatus, taskCompletionPercent, toNomineeDto, toParticipantSummary } from '../utils/mappers.js'
import { createQueuedEmail, sendEmail } from '../notifications/service.js'
import { getBehaviourIds, getSurveySections } from '../../../src/data/surveyConfig.js'
import { hasDeadlinePassed } from '../utils/deadlines.js'

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
  employeeId: z.string().trim().optional().nullable(),
  isExternal: z.boolean().optional().default(false),
  designation: z.string().trim().optional().nullable(),
  relationship: z.enum(['reporting-manager', 'skip-manager', 'peer', 'direct-report']),
  source: z.string().trim().optional(),
  locked: z.boolean().optional(),
})

const nomineesPayloadSchema = z.object({
  nominees: z.array(nomineeSchema).min(1),
})

const nomineeEligibilitySchema = nomineeSchema.pick({
  email: true,
  employeeId: true,
  isExternal: true,
  relationship: true,
})

const RESTRICTED_POSITION_LEVELS = new Set(['MX', 'CX', 'DX', 'L0', 'L1'])
const RESTRICTED_POSITION_RELATIONSHIPS = new Set(['peer', 'direct-report'])
const EXTERNAL_ALLOWED_RELATIONSHIPS = new Set(['peer', 'direct-report'])
const RESTRICTED_NOMINATION_MESSAGE = 'You cannot choose the selected user as your 360 respondent for this category. You may add them under the Reporting Manager, Skip Manager, or BU Head category (wherever applicable) instead.'
const BLOCKED_SELF_SELECTION_MESSAGE = 'Selection of this user as a 360° respondent is restricted.'
const BLOCKED_SELF_SELECTION_EMPLOYEE_IDS = new Set(['26207', '36020', '10258', '54521'])
const BLOCKED_SELF_SELECTION_EMAILS = new Set([
  'pshrivastava@bajajauto.co.in',
  'ajoseph@bajajauto.co.in',
  'kpdsa@bajajauto.co.in',
  'rsharma@bajajauto.co.in',
])

function normalizedPositionLevel(value) {
  return String(value || '').trim().toUpperCase()
}

async function findDirectoryEntry(nominee, db = prisma) {
  if (nominee.isExternal) return null
  const email = normalizeEmail(nominee.email)
  const employeeId = String(nominee.employeeId || '').trim()
  return db.employeeDirectoryEntry.findFirst({
    where: { OR: [{ email }, ...(employeeId ? [{ employeeId }] : [])] },
  })
}

async function assertNomineePositionEligibility(nominee, db = prisma) {
  const employeeId = String(nominee.employeeId || '').trim()
  if (BLOCKED_SELF_SELECTION_EMPLOYEE_IDS.has(employeeId) || BLOCKED_SELF_SELECTION_EMAILS.has(normalizeEmail(nominee.email))) {
    throw httpError(400, BLOCKED_SELF_SELECTION_MESSAGE)
  }
  if (nominee.isExternal) {
    const internalEntry = await db.employeeDirectoryEntry.findFirst({
      where: { email: normalizeEmail(nominee.email) },
    })
    if (internalEntry) throw httpError(400, 'Employees listed in the employee directory cannot be marked as external stakeholders')
    return null
  }
  const directoryEntry = await findDirectoryEntry(nominee, db)
  if (directoryEntry && (BLOCKED_SELF_SELECTION_EMPLOYEE_IDS.has(String(directoryEntry.employeeId || '').trim())
    || BLOCKED_SELF_SELECTION_EMAILS.has(normalizeEmail(directoryEntry.email)))) {
    throw httpError(400, BLOCKED_SELF_SELECTION_MESSAGE)
  }
  if (!directoryEntry || !RESTRICTED_POSITION_RELATIONSHIPS.has(nominee.relationship)) return directoryEntry
  if (RESTRICTED_POSITION_LEVELS.has(normalizedPositionLevel(directoryEntry.positionLevel))) {
    throw httpError(400, RESTRICTED_NOMINATION_MESSAGE)
  }
  return directoryEntry
}

function assertNomineeIsNotParticipant(nominee, participant) {
  const nomineeEmail = normalizeEmail(nominee.email)
  const participantEmail = normalizeEmail(participant.user.email)
  const nomineeEmployeeId = String(nominee.employeeId || '').trim().toLowerCase()
  const participantEmployeeId = String(participant.user.employeeId || '').trim().toLowerCase()
  if (nomineeEmail === participantEmail || (nomineeEmployeeId && participantEmployeeId && nomineeEmployeeId === participantEmployeeId)) {
    throw httpError(400, 'You cannot nominate yourself as a 360 respondent. Your self survey is included automatically.')
  }
}

function assertNomineesAreUnique(nominees) {
  const emails = nominees.map((nominee) => normalizeEmail(nominee.email)).filter(Boolean)
  if (new Set(emails).size !== emails.length) {
    throw httpError(400, 'Each person can only be nominated once.')
  }
  const employeeIds = nominees
    .map((nominee) => String(nominee.employeeId || '').trim().toLowerCase())
    .filter(Boolean)
  if (new Set(employeeIds).size !== employeeIds.length) {
    throw httpError(400, 'Each person can only be nominated once.')
  }
}

const participantWorkSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  submit: z.boolean().optional().default(false),
})

const placeholderPattern = /^(?:n\/?a|none|nil|[^\p{L}\p{N}]+)$/iu
const PRE_WORK_QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q8', 'q9', 'q10']

function validResponse(value, minimum = 1) {
  const text = String(value || '').trim()
  return text.length >= minimum && !placeholderPattern.test(text)
}

function validateParticipantWork(type, answers) {
  if (type === 'pre-work') {
    const invalid = PRE_WORK_QUESTION_KEYS.filter((key) => !validResponse(answers[key], 15))
    if (invalid.length) throw httpError(400, 'Please answer every Self Reflection question with at least 15 characters. Placeholder responses such as NA, None, hyphens, or dots are not accepted.')
    return
  }

  const transitionFields = ['role', 'roleDescription', 'bu', 'duration']
  const transitionKeys = transitionFields.map((key) => `transition1_${key}`)
  const shortFields = ['currentRole', ...transitionKeys]
  const reflectionFields = ['responsibilities', 'highlight1', 'highlight2', 'challenge1', 'challenge2']
  const optionalReflectionFields = ['highlight3', 'challenge3']
  const invalidOptionalResponse = optionalReflectionFields.some((key) => answers[key] && !validResponse(answers[key], 15))
  const validDuration = (value) => /^(0[1-9]|1[0-2])\/(19[6-9]\d|20\d{2})$/.test(String(value || ''))
  const invalidRequiredDuration = !validDuration(answers.transition1_duration)
  const invalidOptionalTransition = [2, 3].some((number) => {
    const values = transitionFields.map((key) => answers[`transition${number}_${key}`])
    return values.some((value) => String(value || '').trim())
      && (values.slice(0, 3).some((value) => !validResponse(value)) || !validDuration(values[3]))
  })
  if (shortFields.some((key) => !validResponse(answers[key])) || invalidRequiredDuration || invalidOptionalTransition || reflectionFields.some((key) => !validResponse(answers[key], 15)) || invalidOptionalResponse) {
    throw httpError(400, 'Please complete every required Role Interview field. Detailed responses require at least 15 characters, and placeholder responses are not accepted.')
  }
}

const photoSchema = z.object({
  dataUrl: z.string().max(7_500_000).refine((value) => /^data:image\/(jpeg|png);base64,/.test(value), 'Only JPG and PNG photographs are accepted'),
})

function formatCutoff(date) {
  return date
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'the cutoff date set for your cohort'
}

function hasCutoffPassed(cutoff, now = new Date()) {
  return hasDeadlinePassed(cutoff, now)
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
      reports: { orderBy: { updatedAt: 'desc' } },
      assessorReviews: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  })

  if (!participant) throw httpError(404, 'Participant not found')
  return participant
}

const ROLE_INTERVIEW_KEYS = [
  'currentRole',
  'responsibilities',
  'highlight1',
  'highlight2',
  'challenge1',
  'challenge2',
  ...['role', 'roleDescription', 'bu', 'duration'].map((key) => `transition1_${key}`),
]

function countAnsweredPreWork(preWork) {
  const answers = preWork?.answers || {}
  return PRE_WORK_QUESTION_KEYS.filter((key) => String(answers[key] || '').trim().length > 0).length
}

function countAnsweredRoleInterview(roleInterview) {
  const answers = roleInterview?.answers || {}
  return ROLE_INTERVIEW_KEYS.filter((key) => String(answers[key] || '').trim().length > 0).length
}

const respondentRelationshipLabels = {
  SELF: 'Self',
  REPORTING_MANAGER: 'Reporting Manager',
  SKIP_MANAGER: 'Skip Manager',
  PEER: 'Peer',
  DIRECT_REPORT: 'Direct Report',
}

function buildRespondentStatuses(participant, nomineesSubmitted) {
  if (!nomineesSubmitted) return []

  const selfTask = participant.feedbackTasks.find((task) => task.relationship === 'SELF')
  const self = {
    id: selfTask?.id || `self-${participant.id}`,
    name: participant.user.name,
    isSelf: true,
    relationship: 'Self',
    status: selfTask?.status?.toLowerCase() || 'pending',
    submittedAt: selfTask?.submittedAt?.toISOString() || null,
  }

  const nominees = participant.nominees.map((nominee) => {
    const task = participant.feedbackTasks.find((item) => item.nomineeId === nominee.id)
    return {
      id: task?.id || nominee.id,
      name: nominee.name,
      isSelf: false,
      relationship: respondentRelationshipLabels[nominee.relationship] || nominee.relationship,
      status: task?.status?.toLowerCase() || 'pending',
      submittedAt: task?.submittedAt?.toISOString() || null,
    }
  })

  return [self, ...nominees]
}

participantsRouter.get('/:participantId', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)

  const allResponsesComplete = participant.feedbackTasks.length > 0 && participant.feedbackTasks.every((task) => {
    if (task.status !== 'SUBMITTED') return false
    const ratings = task.responses?.[0]?.ratings
    if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return false
    return getBehaviourIds(getSurveySections(task.relationship)).every((id) => Number.isFinite(ratings[id]) && ratings[id] >= 1 && ratings[id] <= 4)
  })
  const cutoffPassed = hasCutoffPassed(participant.cohort.threeSixtyCutoff)
  const nomineesSubmitted = participant.nominees.length > 0 && participant.nominees.every((nominee) => nominee.status === 'SUBMITTED')
  const latest360Report = participant.reports.find((report) => report.type.toLowerCase() === '360') || null
  const taskStatus = deriveTaskStatus(participant, {
    allResponsesComplete,
    nomineesSubmitted,
    latestReport: latest360Report,
    latestAssessorReview: participant.assessorReviews[0] || null,
  })
  const respondents = buildRespondentStatuses(participant, nomineesSubmitted)
  const submittedRespondents = respondents.filter((respondent) => respondent.status === 'submitted').length
  const responseSummary = {
    submitted: submittedRespondents,
    total: respondents.length,
    pending: respondents.length - submittedRespondents,
    percent: respondents.length ? Math.round((submittedRespondents / respondents.length) * 100) : 0,
  }

  res.json({
    data: {
      ...toParticipantSummary(participant),
      reportStatus: latest360Report?.status?.toLowerCase() || (participant.reportStatus === 'READY' ? 'ready' : 'waiting'),
      reports: participant.reports.map((report) => ({
        id: report.id,
        type: report.type.toLowerCase(),
        status: report.status.toLowerCase(),
        generatedAt: report.generatedAt?.toISOString() || null,
        releasedAt: report.releasedAt?.toISOString() || null,
      })),
      assessorTemplateUploaded: participant.assessorReviews[0]?.status === 'uploaded',
      masterData: participant.masterData || {},
      reportReady: participant.feedbackTasks.length > 0 && (allResponsesComplete || cutoffPassed),
      allResponsesComplete,
      threeSixtyCutoffPassed: cutoffPassed,
      taskStatus,
      taskCompletionPercent: taskCompletionPercent(taskStatus),
      respondents,
      responseSummary,
      preWorkAnsweredCount: countAnsweredPreWork(participant.preWork),
      roleInterviewAnsweredCount: countAnsweredRoleInterview(participant.roleInterview),
      roleInterviewQuestionCount: ROLE_INTERVIEW_KEYS.length,
      cohort: {
        id: participant.cohort.id,
        name: participant.cohort.name,
        programme: participant.cohort.programme,
        eventStart: participant.cohort.eventStart?.toISOString() || null,
        eventEnd: participant.cohort.eventEnd?.toISOString() || null,
        threeSixtyCutoff: participant.cohort.threeSixtyCutoff?.toISOString() || null,
        nominationDeadline: participant.cohort.nominationDeadline?.toISOString() || null,
        roleInterviewDeadline: participant.cohort.roleInterviewDeadline?.toISOString() || null,
        photoDeadline: participant.cohort.photoDeadline?.toISOString() || null,
        preWorkDeadline: participant.cohort.preWorkDeadline?.toISOString() || null,
        eventDate: participant.cohort.eventStart && participant.cohort.eventEnd
          ? `${participant.cohort.eventStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${participant.cohort.eventEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
          : 'TBD',
      },
    },
  })
}))

participantsRouter.get('/:participantId/work/:type', asyncHandler(async (req, res) => {
  if (!['role-interview', 'pre-work'].includes(req.params.type)) throw httpError(404, 'Participant form not found')
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const value = req.params.type === 'role-interview' ? participant.roleInterview : participant.preWork
  const cutoff = req.params.type === 'role-interview' ? participant.cohort.roleInterviewDeadline : participant.cohort.preWorkDeadline
  res.json({ data: { ...(value || { answers: {}, status: 'draft', submittedAt: null }), cutoff: cutoff?.toISOString() || null, canEdit: !hasCutoffPassed(cutoff) } })
}))

participantsRouter.put('/:participantId/work/:type', asyncHandler(async (req, res) => {
  if (!['role-interview', 'pre-work'].includes(req.params.type)) throw httpError(404, 'Participant form not found')
  const payload = participantWorkSchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const field = req.params.type === 'role-interview' ? 'roleInterview' : 'preWork'
  const current = participant[field]
  const cutoff = req.params.type === 'role-interview' ? participant.cohort.roleInterviewDeadline : participant.cohort.preWorkDeadline
  if (hasCutoffPassed(cutoff)) throw httpError(409, `The ${req.params.type === 'role-interview' ? 'Role Interview' : 'Self Reflection'} cutoff has passed. This submission can no longer be edited.`)
  if (payload.submit) validateParticipantWork(req.params.type, payload.answers)
  const remainsSubmitted = current?.status === 'submitted'
  const submitted = payload.submit || remainsSubmitted
  const submittedAt = submitted ? current?.submittedAt || new Date().toISOString() : null
  const value = { answers: payload.answers, status: submitted ? 'submitted' : 'draft', submittedAt, updatedAt: new Date().toISOString() }
  await prisma.participant.update({ where: { id: participant.id }, data: { [field]: value, lastActivityAt: new Date() } })
  res.json({ data: value })
}))

participantsRouter.get('/:participantId/photo', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const cutoff = participant.cohort.photoDeadline
  res.json({ data: { url: participant.photoUrl || null, cutoff: cutoff?.toISOString() || null, canEdit: !hasCutoffPassed(cutoff) } })
}))

participantsRouter.put('/:participantId/photo', asyncHandler(async (req, res) => {
  const payload = photoSchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  if (hasCutoffPassed(participant.cohort.photoDeadline)) throw httpError(409, 'The Photograph Upload cutoff has passed. This submission can no longer be edited.')
  await prisma.participant.update({ where: { id: participant.id }, data: { photoUrl: payload.dataUrl, lastActivityAt: new Date() } })
  res.json({ data: { url: payload.dataUrl, status: 'submitted' } })
}))

participantsRouter.put('/:participantId/nominees', asyncHandler(async (req, res) => {
  const payload = nomineesPayloadSchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  if (hasCutoffPassed(participant.cohort.nominationDeadline)) throw httpError(409, 'The nomination deadline has passed. The nominee list can no longer be edited.')
  if (participant.nominees.some((nominee) => nominee.status === 'SUBMITTED')) throw httpError(409, 'Submitted nominations are final and cannot be edited')
  assertNomineesAreUnique(payload.nominees)
  if (payload.nominees.some((nominee) => !nominee.isExternal && !nominee.employeeId)) {
    throw httpError(400, 'Ticket ID is required for internal respondents')
  }
  if (payload.nominees.some((nominee) => nominee.isExternal && !EXTERNAL_ALLOWED_RELATIONSHIPS.has(nominee.relationship))) {
    throw httpError(400, 'External stakeholders can only be added within the Peers or Direct Reports categories')
  }
  for (const nominee of payload.nominees) {
    assertNomineeIsNotParticipant(nominee, participant)
    await assertNomineePositionEligibility(nominee)
  }
  const lockedNominees = participant.nominees.filter((nominee) => nominee.locked)
  for (const locked of lockedNominees) {
    const retained = payload.nominees.find((nominee) => normalizeEmail(nominee.email) === normalizeEmail(locked.email) && relationshipMap[nominee.relationship] === locked.relationship)
    if (!retained || retained.name !== locked.name || (retained.employeeId || null) !== (locked.employeeId || null)) {
      throw httpError(409, 'Prefilled Reporting Manager and Skip / BU Head rows cannot be changed')
    }
  }

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
        employeeId: nominee.employeeId || null,
        isExternal: nominee.isExternal,
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

participantsRouter.post('/:participantId/nominees/check-eligibility', asyncHandler(async (req, res) => {
  const nominee = nomineeEligibilitySchema.parse(req.body)
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  assertNomineeIsNotParticipant(nominee, participant)
  const directoryEntry = await assertNomineePositionEligibility(nominee)
  res.json({
    data: {
      eligible: true,
      verified: Boolean(directoryEntry),
      positionLevel: directoryEntry?.positionLevel || null,
    },
  })
}))

participantsRouter.get('/:participantId/employee-directory', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const query = String(req.query.q || '').trim()
  if (query.length < 2) return res.json({ data: [] })
  const rows = await prisma.employeeDirectoryEntry.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { employeeId: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ name: 'asc' }, { employeeId: 'asc' }],
    take: 10,
  })
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      employeeId: row.employeeId,
      positionLevel: row.positionLevel,
    })),
  })
}))

participantsRouter.post('/:participantId/self-feedback-task', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  if (hasCutoffPassed(participant.cohort.nominationDeadline)) throw httpError(409, 'The nomination deadline has passed. Nominations can no longer be submitted.')
  if (!participant.nominees.some((nominee) => nominee.status === 'SUBMITTED')) throw httpError(409, 'Submit your 360 nominations before starting the self survey')

  const existing = await prisma.feedbackTask.findFirst({
    where: { participantId: participant.id, respondentId: participant.userId, relationship: 'SELF' },
    include: { responses: true },
  })
  const task = existing || await prisma.feedbackTask.create({
    data: {
      participantId: participant.id,
      respondentId: participant.userId,
      relationship: 'SELF',
      status: 'PENDING',
      dueAt: participant.cohort.threeSixtyCutoff,
    },
    include: { responses: true },
  })
  const ratings = task.responses?.[0]?.ratings
  const requiredIds = getBehaviourIds(getSurveySections('SELF'))
  const answered = ratings && typeof ratings === 'object' && !Array.isArray(ratings)
    ? requiredIds.filter((id) => Number.isFinite(ratings[id]) && ratings[id] >= 1 && ratings[id] <= 4).length
    : 0
  res.json({
    data: {
      id: task.id,
      status: task.status.toLowerCase(),
      dueAt: task.dueAt?.toISOString() || null,
      answered,
      totalQuestions: requiredIds.length,
      progress: requiredIds.length ? Math.round((answered / requiredIds.length) * 100) : 0,
    },
  })
}))

participantsRouter.post('/:participantId/nominees/submit', asyncHandler(async (req, res) => {
  const participant = await findParticipant(req.params.participantId)
  assertParticipantAccess(req, participant)
  const nominees = participant.nominees
  assertNomineesAreUnique(nominees)
  for (const nominee of nominees) {
    assertNomineeIsNotParticipant(nominee, participant)
    await assertNomineePositionEligibility({
      ...nominee,
      relationship: nominee.relationship.toLowerCase().replaceAll('_', '-'),
    })
  }
  if (nominees.some((nominee) => nominee.status === 'SUBMITTED')) throw httpError(409, 'These nominations have already been submitted and are final')

  if (!nominees.length) throw httpError(400, 'Add nominees before submitting')
  if (!nominees.some((nominee) => nominee.relationship === 'REPORTING_MANAGER')) {
    throw httpError(400, 'At least 1 reporting manager nominee is required')
  }
  if (nominees.filter((nominee) => nominee.relationship === 'SKIP_MANAGER').length < 1) {
    throw httpError(400, 'At least 1 Skip / BU Head nominee is required')
  }
  if (nominees.filter((nominee) => nominee.relationship === 'PEER').length < 4) {
    throw httpError(400, 'At least 4 peer nominees are required')
  }
  if (nominees.filter((nominee) => nominee.relationship === 'DIRECT_REPORT').length === 1) {
    throw httpError(400, 'Direct Reports must either be left empty or include at least 2 nominees')
  }

  const { submittedNominees, pendingEmailIds } = await prisma.$transaction(async (tx) => {
    await tx.nominee.updateMany({
      where: { participantId: participant.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    const queuedEmailIds = []
    const cutoffDate = participant.cohort.threeSixtyCutoff
    const cutoffLabel = formatCutoff(cutoffDate)

    const existingSelfTask = await tx.feedbackTask.findFirst({
      where: { participantId: participant.id, respondentId: participant.userId, relationship: 'SELF' },
    })
    if (existingSelfTask) {
      await tx.feedbackTask.update({ where: { id: existingSelfTask.id }, data: { dueAt: cutoffDate } })
    } else {
      await tx.feedbackTask.create({
        data: { participantId: participant.id, respondentId: participant.userId, relationship: 'SELF', status: 'PENDING', dueAt: cutoffDate },
      })
    }

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

      // Every nominee receives a task-scoped link, including internal employees.
      // This keeps Email Centre recipient selection complete and gives each
      // respondent one consistent route into the exact feedback form.
      {
        const token = generateMagicToken()
        const inviteUrl = buildInviteUrl(token)
        const expiresAt = getMagicLinkExpiry()
        const nomineeType = respondentUser ? 'internal' : 'external'

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
              nomineeType,
            },
          },
        })

        const inviteEmail = await createQueuedEmail({
          templateId: 'resp-invite',
          toEmail: normalizeEmail(nominee.email),
          toName: nominee.name,
          context: {
            'Respondent Name': nominee.name,
            'Participant Name': participant.user.name,
            Relationship: nominee.relationship.toLowerCase().replaceAll('_', ' '),
            Cohort: participant.cohort.name,
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
            nomineeType,
          },
        }, tx)
        queuedEmailIds.push(inviteEmail.id)

      }
    }

    const confirmationEmail = await createQueuedEmail({
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
    queuedEmailIds.push(confirmationEmail.id)

    const masterData = participant.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
    const mappedBuhrEmail = normalizeEmail(masterData.buhrEmail)
    const participantEmail = normalizeEmail(participant.user.email)

    // Notify only the BUHR explicitly mapped to this participant. A BUHR role on
    // the participant's own account, or another BUHR in the same BU, must not
    // make the participant a recipient of this operational notification.
    if (mappedBuhrEmail && mappedBuhrEmail !== participantEmail) {
      const mappedBuhr = await tx.user.findUnique({ where: { email: mappedBuhrEmail } })
      const buhrName = String(masterData.buhrName || mappedBuhr?.name || mappedBuhrEmail).trim()
      const buhrEmail = await createQueuedEmail({
        templateId: 'nominees-submitted-buhr',
        toEmail: mappedBuhrEmail,
        toName: buhrName,
        context: {
          'BUHR Name': buhrName,
          'Participant Name': participant.user.name,
          Cohort: participant.cohort.name,
          'Respondent Count': String(nominees.length),
        },
        entity: 'Participant',
        entityId: participant.id,
      }, tx)
      queuedEmailIds.push(buhrEmail.id)
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

    return { submittedNominees: submitted, pendingEmailIds: queuedEmailIds }
  })

  // Real SMTP sends happen after the transaction commits — doing them inside the
  // transaction risks exceeding Prisma's interactive transaction timeout once a
  // participant has more than a couple of respondents.
  await Promise.all(pendingEmailIds.map((id) => sendEmail(id)))

  res.json({
    data: submittedNominees.map(toNomineeDto),
  })
}))
