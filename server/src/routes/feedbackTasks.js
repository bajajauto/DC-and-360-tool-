import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { queueEmail } from '../notifications/service.js'
import { hasDeadlinePassed } from '../utils/deadlines.js'

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
  if (task.status === 'SUBMITTED') throw httpError(409, 'Feedback has already been submitted and can no longer be saved as a draft.')
  if (hasDeadlinePassed(task.dueAt)) throw httpError(409, 'The 360 feedback deadline has passed. This response can no longer be edited.')
  const payload = responseSchema.parse(req.body)

  const response = await prisma.$transaction(async (tx) => {
    const updated = await tx.feedbackTask.updateMany({
      where: { id: req.params.taskId, status: { not: 'SUBMITTED' } },
      data: { status: 'SAVED' },
    })
    // A submit request may have committed while this draft request was waiting
    // for the row lock. Never allow that late autosave to revert SUBMITTED.
    if (!updated.count) throw httpError(409, 'Feedback has already been submitted and can no longer be saved as a draft.')

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
  const existingTask = await findTask(req.params.taskId)
  assertTaskAccess(req, existingTask)
  if (existingTask.status === 'SUBMITTED') {
    res.json({ data: { id: existingTask.id, status: 'submitted', submittedAt: existingTask.submittedAt?.toISOString() || null, report: null } })
    return
  }
  if (hasDeadlinePassed(existingTask.dueAt)) throw httpError(409, 'The 360 feedback deadline has passed. This response can no longer be submitted.')
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
        nominee: true,
        respondent: true,
        participant: {
          include: {
            user: true,
            feedbackTasks: true,
          },
        },
      },
    })
  })

  const allSubmitted = task.participant.feedbackTasks.every((item) => item.status === 'SUBMITTED')
  if (allSubmitted) {
    try {
      await prisma.participant.update({
        where: { id: task.participantId },
        data: { reportStatus: 'READY', progress: 92, lastActivityAt: new Date() },
      })
    } catch (error) {
      // The response itself is already committed. A tracker/progress failure
      // must not tell the respondent that their submission was lost.
      console.error('Feedback submitted, but participant progress could not be updated', error)
    }
  }

  res.json({ data: { id: task.id, status: task.status.toLowerCase(), submittedAt: task.submittedAt?.toISOString() || null, report: null } })

  const respondentEmail = task.nominee?.email || task.respondent?.email
  const respondentName = task.nominee?.name || task.respondent?.name
  if (respondentEmail) {
    queueEmail({
      dedupeKey: `respondent-thank-you:${task.id}`,
      templateId: 'respondent-thank-you',
      toEmail: respondentEmail,
      toName: respondentName,
      context: {
        'Respondent Name': respondentName || respondentEmail,
        'Participant Name': task.participant.user.name,
      },
      entity: 'FeedbackTask',
      entityId: task.id,
    }).catch((error) => console.error('Feedback submitted, but the thank-you email could not be queued', error))
  }
}))
