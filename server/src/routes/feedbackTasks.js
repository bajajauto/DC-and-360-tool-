import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { generate360ReportForParticipant } from '../reports/generate360Report.js'

export const feedbackTasksRouter = Router()

const responseSchema = z.object({
  ratings: z.record(z.number().int().min(1).max(4)).default({}),
  sectionSsc: z.record(z.record(z.string())).default({}),
  ssc: z.record(z.string()).default({}),
})

function assertTaskAccess(req, task) {
  const auth = req.auth
  if (auth.roles.includes('td')) return
  if (auth.typ === 'respondent' && auth.taskId === task.id) return
  if (task.respondentId && task.respondentId === auth.userId) return
  throw httpError(403, 'You do not have access to this feedback task')
}

async function findTask(id) {
  const task = await prisma.feedbackTask.findUnique({
    where: { id },
    include: {
      participant: { include: { user: true } },
      nominee: true,
      responses: true,
    },
  })

  if (!task) throw httpError(404, 'Feedback task not found')
  return task
}

feedbackTasksRouter.get('/:taskId', asyncHandler(async (req, res) => {
  const task = await findTask(req.params.taskId)
  assertTaskAccess(req, task)

  res.json({
    data: {
      id: task.id,
      participantName: task.participant.user.name,
      relationship: task.relationship,
      status: task.status.toLowerCase(),
      dueAt: task.dueAt?.toISOString() || null,
      response: task.responses[0] || null,
    },
  })
}))

feedbackTasksRouter.put('/:taskId/draft', asyncHandler(async (req, res) => {
  const task = await findTask(req.params.taskId)
  assertTaskAccess(req, task)
  const payload = responseSchema.parse(req.body)

  const response = await prisma.$transaction(async (tx) => {
    await tx.feedbackTask.update({
      where: { id: req.params.taskId },
      data: { status: 'SAVED' },
    })

    return tx.feedbackResponse.upsert({
      where: {
        feedbackTaskId_responseKey: {
          feedbackTaskId: req.params.taskId,
          responseKey: 'overall',
        },
      },
      update: {
        ratings: payload.ratings,
        sectionSsc: payload.sectionSsc,
        overallSsc: payload.ssc,
      },
      create: {
        feedbackTaskId: req.params.taskId,
        responseKey: 'overall',
        ratings: payload.ratings,
        sectionSsc: payload.sectionSsc,
        overallSsc: payload.ssc,
      },
    })
  })

  res.json({ data: response })
}))

feedbackTasksRouter.post('/:taskId/submit', asyncHandler(async (req, res) => {
  assertTaskAccess(req, await findTask(req.params.taskId))
  const payload = responseSchema.parse(req.body)

  const task = await prisma.$transaction(async (tx) => {
    await tx.feedbackResponse.upsert({
      where: {
        feedbackTaskId_responseKey: {
          feedbackTaskId: req.params.taskId,
          responseKey: 'overall',
        },
      },
      update: {
        ratings: payload.ratings,
        sectionSsc: payload.sectionSsc,
        overallSsc: payload.ssc,
      },
      create: {
        feedbackTaskId: req.params.taskId,
        responseKey: 'overall',
        ratings: payload.ratings,
        sectionSsc: payload.sectionSsc,
        overallSsc: payload.ssc,
      },
    })

    return tx.feedbackTask.update({
      where: { id: req.params.taskId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        participant: {
          include: {
            feedbackTasks: true,
          },
        },
      },
    })
  })

  const allSubmitted = task.participant.feedbackTasks.every((item) => item.status === 'SUBMITTED')
  let generatedReport = null

  if (allSubmitted) {
    await prisma.participant.update({
      where: { id: task.participantId },
      data: {
        reportStatus: 'READY',
        progress: 92,
        lastActivityAt: new Date(),
      },
    })

    generatedReport = await generate360ReportForParticipant(prisma, task.participantId)
  }

  res.json({
    data: {
      id: task.id,
      status: task.status.toLowerCase(),
      submittedAt: task.submittedAt?.toISOString() || null,
      report: generatedReport
        ? {
            id: generatedReport.report.id,
            status: generatedReport.report.status.toLowerCase(),
            downloadUrl: `/api/reports/${task.participantId}/360/download`,
          }
        : null,
    },
  })
}))
