import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { verifyPassword } from '../utils/passwords.js'
import { signToken } from '../utils/jwt.js'
import { getRelationshipLabel, getRequiredQuestionTotal } from '../../../src/data/surveyConfig.js'

export const authRouter = Router()

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
})

function roleToClient(role) {
  return role.toLowerCase()
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDeadline(date) {
  return date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'the deadline configured for your cohort'
}

authRouter.post('/login', asyncHandler(async (req, res) => {
  const payload = loginSchema.parse(req.body)
  const normalized = payload.identifier.toLowerCase()

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        { employeeId: payload.identifier },
      ],
    },
    include: {
      participant: {
        include: { cohort: true },
      },
      respondentTasks: {
        include: {
          participant: { include: { user: true, cohort: true } },
        },
      },
    },
  })

  if (!user) throw httpError(401, 'Invalid employee ID/email or password')
  const validPassword = await verifyPassword(payload.password, user.passwordHash)
  if (!validPassword) throw httpError(401, 'Invalid employee ID/email or password')
  if (!user.roles.length) throw httpError(403, 'This account no longer has access to the application')

  const roles = user.roles.map(roleToClient)
  const token = signToken({
    sub: user.id,
    roles,
    typ: 'user',
    participantId: user.participant?.id || null,
  })

  res.json({
    data: {
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      initials: initials(user.name),
      designation: user.designation,
      bu: user.businessUnit,
      roles,
      participantId: user.participant?.id || null,
      cohort: user.participant?.cohort?.name || null,
      respondentTasks: user.respondentTasks.map((task) => {
        const relationship = getRelationshipLabel(task.relationship)
        const totalQuestions = getRequiredQuestionTotal(relationship)

        return {
          id: task.id,
          participantName: task.participant.user.name,
          participantInitials: initials(task.participant.user.name),
          designation: task.participant.user.designation || 'Participant',
          bu: task.participant.user.businessUnit || '',
          relationship,
          status: task.status.toLowerCase(),
          progress: task.status === 'SUBMITTED' ? 100 : 0,
          totalQuestions,
          answered: task.status === 'SUBMITTED' ? totalQuestions : 0,
          dcType: task.participant.cohort?.programme || 'DC',
          deadline: formatDeadline(task.dueAt || task.participant.cohort?.threeSixtyCutoff),
        }
      }),
    },
  })
}))
