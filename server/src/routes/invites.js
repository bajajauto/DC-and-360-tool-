import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { hashMagicToken } from '../utils/magicLinks.js'

export const invitesRouter = Router()

const redeemSchema = z.object({
  token: z.string().trim().min(24),
})

invitesRouter.post('/redeem', asyncHandler(async (req, res) => {
  const { token } = redeemSchema.parse(req.body)
  const tokenHash = hashMagicToken(token)

  const magicLink = await prisma.magicLink.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!magicLink) throw httpError(404, 'Invite link not found')
  if (magicLink.expiresAt <= new Date()) throw httpError(410, 'Invite link has expired')
  if (magicLink.role !== 'RESPONDENT') throw httpError(400, 'Invite link is not for a respondent')

  const taskId = magicLink.payload?.taskId
  if (!taskId) throw httpError(400, 'Invite link is missing its feedback task')

  const task = await prisma.feedbackTask.findUnique({
    where: { id: taskId },
    include: {
      participant: { include: { user: true, cohort: true } },
      nominee: true,
      respondent: true,
    },
  })

  if (!task) throw httpError(404, 'Feedback task not found')
  if (task.status === 'SUBMITTED') throw httpError(409, 'Feedback has already been submitted')

  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: magicLink.usedAt || new Date() },
  })

  const respondentName = task.respondent?.name || task.nominee?.name || magicLink.payload?.name || '360 Respondent'
  const respondentEmail = task.respondent?.email || task.nominee?.email || magicLink.email

  res.json({
    data: {
      role: 'respondent',
      name: respondentName,
      email: respondentEmail,
      employeeId: task.respondent?.employeeId || null,
      taskId: task.id,
      participantName: task.participant.user.name,
      relationship: task.relationship,
      expiresAt: magicLink.expiresAt.toISOString(),
    },
  })
}))
