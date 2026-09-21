import { Router } from 'express'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'


export const assessorRouter = Router()

function formValue(value) {
  return value && typeof value === 'object'
    ? { answers: value.answers || {}, status: value.status || 'draft', submittedAt: value.submittedAt || null }
    : { answers: {}, status: 'draft', submittedAt: null }
}

function toCandidate(participant, summary = false) {
  const submittedResponses = participant.feedbackTasks.filter((task) => task.status === 'SUBMITTED').length
  const latestReport = participant.reports[0] || null
  return {
    id: participant.id,
    nickname: participant.nickname,
    employeeId: participant.user.employeeId,
    designation: participant.user.designation,
    bu: participant.user.businessUnit,
    cohortId: participant.cohort.id,
    cohort: participant.cohort.name,
    stage: participant.stage.toLowerCase().replaceAll('_', ' '),
    progress: participant.progress,
    masterData: {
      jobLevel: participant.masterData?.jobLevel || null,
      positionLevel: participant.masterData?.positionLevel || null,
      dateOfJoining: participant.masterData?.dateOfJoining || participant.masterData?.DOJ_3 || participant.masterData?.DOJ_4 || null,
    },
    photograph: { url: participant.photoUrl || null, status: participant.photoUrl ? 'submitted' : 'not submitted' },
    roleInterview: summary ? { status: formValue(participant.roleInterview).status } : formValue(participant.roleInterview),
    preWork: summary ? { status: formValue(participant.preWork).status } : formValue(participant.preWork),
    report360: {
      status: latestReport?.status?.toLowerCase() || participant.reportStatus.toLowerCase(),
      submittedResponses,
      totalResponses: participant.feedbackTasks.length,
      generatedAt: latestReport?.generatedAt?.toISOString() || null,
    },
  }
}

const candidateInclude = {
  user: { select: { employeeId: true, designation: true, businessUnit: true } },
  cohort: { select: { id: true, name: true } },
  feedbackTasks: { select: { status: true } },
  reports: { where: { type: '360' }, orderBy: { updatedAt: 'desc' }, take: 1, select: { status: true, generatedAt: true } },
}

assessorRouter.get('/candidates', asyncHandler(async (req, res) => {
  const cohortId = typeof req.query.cohortId === 'string' ? req.query.cohortId.trim() : ''
  if (cohortId === 'all') throw httpError(400, 'Select a specific cohort')
  const [participants, cohorts] = await Promise.all([
    cohortId ? prisma.participant.findMany({
      where: { cohortId, archivedAt: null, nickname: { not: null } },
      select: {
        id: true, nickname: true, stage: true, progress: true, reportStatus: true,
        roleInterview: true, preWork: true, photoUrl: true,
        ...candidateInclude,
      },
    }) : Promise.resolve([]),
    prisma.cohort.findMany({
      orderBy: [{ eventStart: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ])
  const candidates = participants.map((participant) => toCandidate(participant, true)).sort((left, right) => {
    if (!left.nickname) return right.nickname ? 1 : 0
    if (!right.nickname) return -1
    return left.nickname.localeCompare(right.nickname, undefined, { numeric: true, sensitivity: 'base' })
  })
  res.json({ data: candidates, meta: { cohorts } })
}))

assessorRouter.get('/candidates/:participantId', asyncHandler(async (req, res) => {
  const participant = await prisma.participant.findFirst({
    where: { id: req.params.participantId, archivedAt: null, nickname: { not: null } },
    include: candidateInclude,
  })
  if (!participant) throw httpError(404, 'Participant not found')
  res.json({ data: toCandidate(participant) })
}))
