import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { ensureNotificationTemplates, queueEmail, renderTemplate, sendEmail } from '../notifications/service.js'

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

const bulkSendSchema = z.object({
  templateId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50000),
  recipients: z.array(z.object({
    email: z.string().trim().email(),
    name: z.string().trim().optional().nullable(),
    sourceType: z.enum(['user', 'magicLink', 'manual']).default('manual'),
    sourceId: z.string().trim().optional().nullable(),
  })).min(1).max(500),
})

const MAGIC_LINK_TEMPLATES = new Set(['resp-invite', 'resp-reminder'])
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g

function dateLabel(value) {
  return value ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'
}

function metadataContext(email) {
  const metadata = email?.metadata
  return metadata && typeof metadata === 'object' && metadata.context && typeof metadata.context === 'object'
    ? metadata.context
    : {}
}

async function resolveRecipient(recipient) {
  if (recipient.sourceType === 'magicLink') {
    if (!recipient.sourceId) throw httpError(400, `Missing magic-link source for ${recipient.email}`)
    const magicLink = await prisma.magicLink.findUnique({
      where: { id: recipient.sourceId },
      include: { emails: { orderBy: { queuedAt: 'desc' } } },
    })
    if (!magicLink || magicLink.email.toLowerCase() !== recipient.email.toLowerCase()) throw httpError(400, `Magic link not found for ${recipient.email}`)
    if (magicLink.expiresAt <= new Date()) throw httpError(400, `Magic link has expired for ${recipient.email}`)
    const sourceEmail = magicLink.emails.find((email) => metadataContext(email)['Magic Link'])
    if (!sourceEmail) throw httpError(400, `Generated magic-link URL is unavailable for ${recipient.email}`)
    return {
      email: magicLink.email.toLowerCase(),
      name: recipient.name || sourceEmail.toName || null,
      context: metadataContext(sourceEmail),
      magicLinkId: magicLink.id,
    }
  }

  if (recipient.sourceType === 'user') {
    if (!recipient.sourceId) throw httpError(400, `Missing account source for ${recipient.email}`)
    const user = await prisma.user.findUnique({
      where: { id: recipient.sourceId },
      include: { participant: { include: { cohort: true } } },
    })
    if (!user || user.email.toLowerCase() !== recipient.email.toLowerCase()) throw httpError(400, `Account not found for ${recipient.email}`)
    const cohort = user.participant?.cohort
    return {
      email: user.email.toLowerCase(),
      name: user.name,
      context: {
        'Recipient Name': user.name,
        'Participant Name': user.name,
        'BUHR Name': user.name,
        Cohort: cohort?.name || '',
        'Nomination Deadline': dateLabel(cohort?.nominationDeadline),
        '360 Cutoff': dateLabel(cohort?.threeSixtyCutoff),
        'Item Name': '',
        Deadline: '',
      },
      magicLinkId: null,
    }
  }

  return { email: recipient.email.toLowerCase(), name: recipient.name || null, context: {}, magicLinkId: null }
}

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

notificationsRouter.get('/recipients', asyncHandler(async (req, res) => {
  const templateId = String(req.query.templateId || '')
  if (MAGIC_LINK_TEMPLATES.has(templateId)) {
    const links = await prisma.magicLink.findMany({
      where: { role: 'RESPONDENT', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { emails: { orderBy: { queuedAt: 'desc' } } },
    })
    const taskIds = [...new Set(links.map((link) => link.payload?.taskId).filter(Boolean))]
    const openTasks = await prisma.feedbackTask.findMany({
      where: { id: { in: taskIds }, status: { not: 'SUBMITTED' } },
      select: { id: true },
    })
    const openTaskIds = new Set(openTasks.map((task) => task.id))
    const seenTasks = new Set()
    const rows = []
    for (const link of links) {
      const taskId = link.payload?.taskId
      const sourceEmail = link.emails.find((email) => metadataContext(email)['Magic Link'])
      if (!taskId || !openTaskIds.has(taskId) || seenTasks.has(taskId) || !sourceEmail) continue
      const context = metadataContext(sourceEmail)
      seenTasks.add(taskId)
      rows.push({
        id: `magicLink:${link.id}`,
        sourceType: 'magicLink',
        sourceId: link.id,
        name: sourceEmail.toName || link.payload?.name || link.email,
        email: link.email,
        employeeId: null,
        roles: ['respondent'],
        businessUnit: null,
        detail: `${context.Relationship || 'Respondent'} for ${context['Participant Name'] || 'participant'}`,
      })
    }
    res.json({ data: rows })
    return
  }

  const users = await prisma.user.findMany({
    where: { email: { not: '' } },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: { id: true, name: true, email: true, employeeId: true, roles: true, businessUnit: true },
  })

  res.json({
    data: users.map((user) => ({
      ...user,
      sourceType: 'user',
      sourceId: user.id,
      roles: user.roles.map((role) => role.toLowerCase()),
    })),
  })
}))

notificationsRouter.post('/send', asyncHandler(async (req, res) => {
  const payload = bulkSendSchema.parse(req.body)
  const template = await prisma.notificationTemplate.findUnique({ where: { templateId: payload.templateId } })
  if (!template) throw httpError(404, 'Notification template not found')

  const uniqueRecipients = [...new Map(payload.recipients.map((recipient) => [`${recipient.sourceType}:${recipient.sourceId || recipient.email.toLowerCase()}`, recipient])).values()]
  const resolvedRecipients = []
  for (const recipient of uniqueRecipients) resolvedRecipients.push(await resolveRecipient(recipient))

  const personalized = resolvedRecipients.map((recipient) => {
    const personalizedSubject = renderTemplate(payload.subject, recipient.context)
    const personalizedBody = renderTemplate(payload.body, recipient.context)
    const unresolved = [...new Set([...(personalizedSubject.match(PLACEHOLDER_RE) || []), ...(personalizedBody.match(PLACEHOLDER_RE) || [])])]
    if (unresolved.length) throw httpError(400, `Cannot send to ${recipient.email}; unresolved placeholders: ${unresolved.join(', ')}`)
    return { ...recipient, subject: personalizedSubject, body: personalizedBody }
  })

  const results = []
  for (const recipient of personalized) {
    const queued = await prisma.emailOutbox.create({
      data: {
        templateId: template.templateId,
        toEmail: recipient.email,
        toName: recipient.name,
        recipientRole: template.recipient,
        subject: recipient.subject,
        body: recipient.body,
        magicLinkId: recipient.magicLinkId,
        actorId: req.auth.userId,
        metadata: { source: 'template-compose', templateTrigger: template.trigger, context: recipient.context },
      },
    })
    const sent = await sendEmail(queued.id)
    results.push(toEmailDto(sent))
  }

  res.status(201).json({
    data: {
      total: results.length,
      sent: results.filter((email) => email.status === 'sent').length,
      failed: results.filter((email) => email.status === 'failed').length,
      emails: results,
    },
  })
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
