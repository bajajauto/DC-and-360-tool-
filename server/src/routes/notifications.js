import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { ensureNotificationTemplates, queueEmail, sendEmail } from '../notifications/service.js'

export const notificationsRouter = Router()

const queueEmailSchema = z.object({
  templateId: z.string().trim().min(1),
  toEmail: z.string().trim().email(),
  toName: z.string().trim().optional().nullable(),
  context: z.record(z.string()).default({}),
  magicLinkId: z.string().optional().nullable(),
  entity: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).default({}),
})

function toTemplateDto(template) {
  return {
    id: template.id,
    templateId: template.templateId,
    phase: template.phase,
    trigger: template.trigger,
    recipient: template.recipient,
    subject: template.subject,
    body: template.body,
    active: template.active,
    updatedAt: template.updatedAt.toISOString(),
  }
}

function toEmailDto(email) {
  return {
    id: email.id,
    templateId: email.templateId,
    toEmail: email.toEmail,
    toName: email.toName,
    recipientRole: email.recipientRole,
    subject: email.subject,
    body: email.body,
    status: email.status.toLowerCase(),
    providerMessageId: email.providerMessageId,
    error: email.error,
    magicLinkId: email.magicLinkId,
    entity: email.entity,
    entityId: email.entityId,
    metadata: email.metadata,
    queuedAt: email.queuedAt.toISOString(),
    sentAt: email.sentAt?.toISOString() || null,
  }
}

notificationsRouter.get('/templates', asyncHandler(async (req, res) => {
  await ensureNotificationTemplates()

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: [
      { phase: 'asc' },
      { trigger: 'asc' },
    ],
  })

  res.json({ data: templates.map(toTemplateDto) })
}))

notificationsRouter.get('/outbox', asyncHandler(async (req, res) => {
  const emails = await prisma.emailOutbox.findMany({
    orderBy: { queuedAt: 'desc' },
    take: 200,
  })

  res.json({ data: emails.map(toEmailDto) })
}))

notificationsRouter.post('/outbox', asyncHandler(async (req, res) => {
  const payload = queueEmailSchema.parse(req.body)
  const email = await queueEmail(payload)
  res.status(201).json({ data: toEmailDto(email) })
}))

notificationsRouter.post('/outbox/:emailId/send', asyncHandler(async (req, res) => {
  const existing = await prisma.emailOutbox.findUnique({
    where: { id: req.params.emailId },
  })

  if (!existing) throw httpError(404, 'Email not found')
  if (existing.status === 'SENT') throw httpError(409, 'Email already sent')

  const email = await sendEmail(existing.id)
  res.json({ data: toEmailDto(email) })
}))
