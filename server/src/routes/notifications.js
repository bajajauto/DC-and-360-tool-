import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { httpError } from '../utils/httpError.js'
import { createQueuedEmail, ensureNotificationTemplates, renderTemplate, resolveCcRecipients, sendEmail } from '../notifications/service.js'
import { createBuhrMagicLink, createParticipantMagicLink } from '../utils/magicLinks.js'
import { generatePassword, hashPassword } from '../utils/passwords.js'

export const notificationsRouter = Router()

const bulkSendSchema = z.object({
  templateId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(50000),
  recipients: z.array(z.object({
    email: z.string().trim().email(),
    name: z.string().trim().optional().nullable(),
    sourceType: z.enum(['user', 'magicLink', 'masterContact', 'manual']).default('manual'),
    sourceId: z.string().trim().optional().nullable(),
  })).min(1).max(500),
})

const automationSettingsSchema = z.object({
  templates: z.array(z.object({
    templateId: z.string().trim().min(1),
    automatic: z.boolean(),
  })).min(1).max(100),
})

const ccPreviewSchema = z.object({
  templateId: z.string().trim().min(1),
  recipients: bulkSendSchema.shape.recipients,
})

const MAGIC_LINK_TEMPLATES = new Set(['resp-invite', 'resp-reminder', 'resp-recurring-reminder'])
const RESPONDENT_TEMPLATES = new Set([...MAGIC_LINK_TEMPLATES, 'respondent-thank-you'])
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g

function dateLabel(value) {
  return value ? value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'
}

function financialYear(value) {
  if (!value) return ''
  const year = value.getFullYear()
  const startYear = value.getMonth() >= 3 ? year : year - 1
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`
}

function daysRemaining(value) {
  if (!value) return ''
  return String(Math.max(0, Math.ceil((value.getTime() - Date.now()) / 86400000)))
}

function metadataContext(email) {
  const metadata = email?.metadata
  return metadata && typeof metadata === 'object' && metadata.context && typeof metadata.context === 'object'
    ? metadata.context
    : {}
}

function buildParticipantContext(participant, recipientName) {
  const cohort = participant?.cohort
  const participantUser = participant?.user
  const tasks = participant?.feedbackTasks || []
  const nominees = participant?.nominees || []
  const responded = tasks.filter((task) => task.status === 'SUBMITTED')
  const relationshipStats = (relationship) => {
    const group = tasks.filter((task) => task.relationship === relationship)
    return { count: group.length, responded: group.filter((task) => task.status === 'SUBMITTED').length }
  }
  const self = relationshipStats('SELF')
  const rm = relationshipStats('REPORTING_MANAGER')
  const skip = relationshipStats('SKIP_MANAGER')
  const dr = relationshipStats('DIRECT_REPORT')
  const peer = relationshipStats('PEER')
  const status = (count, minimum) => count >= minimum ? 'Minimum met' : 'Below minimum'
  const pendingNames = nominees
    .filter((nominee) => nominee.status !== 'RESPONDED')
    .map((nominee) => nominee.name)
    .join(', ')
  const pendingItems = [
    participant?.roleInterview?.status !== 'submitted' && ['Role Interview Form', cohort?.roleInterviewDeadline],
    !participant?.photoUrl && ['Photograph', cohort?.photoDeadline],
    participant?.preWork?.status !== 'submitted' && ['Self Reflection Form', cohort?.preWorkDeadline],
  ].filter(Boolean)

  return {
    'Recipient Name': recipientName || participantUser?.name || '',
    'Participant Name': participantUser?.name || '',
    'Participant Email': participantUser?.email || '',
    'Participant Password': '',
    'Login Link': process.env.APP_URL || 'http://localhost:5173',
    'App Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'BUHR Name': recipientName || '',
    Cohort: cohort?.name || '',
    'Financial Year': financialYear(cohort?.eventStart),
    'DC Dates': cohort?.eventStart && cohort?.eventEnd ? `${dateLabel(cohort.eventStart)} - ${dateLabel(cohort.eventEnd)}` : dateLabel(cohort?.eventStart),
    'Nomination Deadline': dateLabel(cohort?.nominationDeadline),
    'Prework Deadline': dateLabel(cohort?.preWorkDeadline),
    'Pending Items': pendingItems.length
      ? pendingItems.map(([label, deadline]) => `- ${label}${deadline ? ` (due ${dateLabel(deadline)} EOD)` : ''}`).join('\n')
      : 'No pending items',
    '360 Cutoff': dateLabel(cohort?.threeSixtyCutoff),
    'Days Remaining': daysRemaining(cohort?.threeSixtyCutoff),
    'Respondent Count': String(tasks.length),
    'Responded Count': String(responded.length),
    'Groups Below Threshold': '',
    'Pending Respondent Names': pendingNames || 'None',
    'Self Responded': String(self.responded),
    'Self Status': status(self.responded, 1),
    'RM Count': String(rm.count),
    'RM Responded': String(rm.responded),
    'RM Status': status(rm.responded, 1),
    'Skip Count': String(skip.count),
    'Skip Responded': String(skip.responded),
    'Skip Status': status(skip.responded, 1),
    'DR Count': String(dr.count),
    'DR Responded': String(dr.responded),
    'DR Status': status(dr.responded, 2),
    'Peer Count': String(peer.count),
    'Peer Responded': String(peer.responded),
    'Peer Status': status(peer.responded, 2),
    'Item Name': '',
    Deadline: '',
  }
}

async function buildBuhrCredentialContext(recipient) {
  const buhrEmail = recipient.email.toLowerCase()
  const participants = await prisma.participant.findMany({
    include: { user: true, cohort: true },
    orderBy: [{ cohort: { createdAt: 'desc' } }, { user: { name: 'asc' } }],
  })
  const mappedParticipants = participants.filter((participant) => {
    const masterData = participant.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
    return String(masterData.buhrEmail || '').trim().toLowerCase() === buhrEmail
  })
  if (!mappedParticipants.length) {
    throw httpError(400, `No participants are mapped to BUHR ${recipient.email}`)
  }

  const latestCohort = mappedParticipants[0].cohort
  const cohortParticipants = mappedParticipants.filter((participant) => participant.cohortId === latestCohort.id)
  const buhrPassword = process.env.MOCK_USER_PASSWORD || 'Welcome@123'
  return {
    ...recipient.context,
    'BUHR Name': recipient.name || recipient.email,
    'BUHR Email': recipient.email,
    'BUHR Password': buhrPassword,
    Cohort: latestCohort.name,
    'Login Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'App Link': process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    'Participant Credentials': cohortParticipants
      .map((participant) => `${participant.user.name} | ${participant.user.employeeId || '-'} | ${participant.user.email} | Sent directly to participant`)
      .join('\n'),
  }
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
      context: {
        ...metadataContext(sourceEmail),
        'Days Remaining': metadataContext(sourceEmail)['Days Remaining'] || '',
      },
      magicLinkId: magicLink.id,
      entity: sourceEmail.entity,
      entityId: sourceEmail.entityId,
      metadata: sourceEmail.metadata,
    }
  }

  if (recipient.sourceType === 'user') {
    if (!recipient.sourceId) throw httpError(400, `Missing account source for ${recipient.email}`)
    const user = await prisma.user.findUnique({
      where: { id: recipient.sourceId },
      include: {
        participant: {
          include: {
            cohort: true,
            nominees: true,
            feedbackTasks: true,
            user: true,
          },
        },
      },
    })
    if (!user || user.email.toLowerCase() !== recipient.email.toLowerCase()) throw httpError(400, `Account not found for ${recipient.email}`)
    return {
      email: user.email.toLowerCase(),
      name: user.name,
      context: buildParticipantContext(user.participant, user.name),
      magicLinkId: null,
      entity: user.participant ? 'Participant' : null,
      entityId: user.participant?.id || null,
      metadata: user.participant ? { participantId: user.participant.id } : {},
    }
  }

  if (recipient.sourceType === 'masterContact') {
    const [participantId, role] = String(recipient.sourceId || '').split(':')
    const fields = {
      reportingManager: ['reportingManagerName', 'reportingManagerEmail'],
      skipManager: ['skipManagerName', 'skipManagerEmail'],
      buHead: ['buHeadName', 'buHeadEmail'],
    }[role]
    if (!participantId || !fields) throw httpError(400, `Invalid master-sheet contact source for ${recipient.email}`)

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { user: true, cohort: true, nominees: true, feedbackTasks: true },
    })
    const masterData = participant?.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
    const [nameField, emailField] = fields
    if (!participant || String(masterData[emailField] || '').toLowerCase() !== recipient.email.toLowerCase()) {
      throw httpError(400, `Master-sheet contact not found for ${recipient.email}`)
    }
    const name = String(masterData[nameField] || recipient.name || recipient.email)
    return {
      email: recipient.email.toLowerCase(),
      name,
      context: buildParticipantContext(participant, name),
      magicLinkId: null,
      entity: 'Participant',
      entityId: participant.id,
      metadata: { participantId: participant.id },
    }
  }

  return { email: recipient.email.toLowerCase(), name: recipient.name || null, context: {}, magicLinkId: null, entity: null, entityId: null, metadata: {} }
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
  const legacyUnsent = email.status === 'QUEUED' || email.status === 'SKIPPED'
  return {
    id: email.id,
    templateId: email.templateId,
    toEmail: email.toEmail,
    toName: email.toName,
    recipientRole: email.recipientRole,
    subject: email.subject,
    body: email.body,
    status: legacyUnsent ? 'not_sent' : email.status.toLowerCase(),
    providerMessageId: email.providerMessageId,
    error: legacyUnsent ? (email.error || 'Created before immediate email delivery was enabled') : email.error,
    magicLinkId: email.magicLinkId,
    entity: email.entity,
    entityId: email.entityId,
    metadata: email.metadata,
    cc: Array.isArray(email.metadata?.cc) ? email.metadata.cc : [],
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

notificationsRouter.put('/templates/automation', asyncHandler(async (req, res) => {
  const payload = automationSettingsSchema.parse(req.body)
  const templateIds = [...new Set(payload.templates.map((template) => template.templateId))]
  const existing = await prisma.notificationTemplate.findMany({
    where: { templateId: { in: templateIds } },
    select: { templateId: true },
  })
  if (existing.length !== templateIds.length) throw httpError(400, 'One or more notification templates do not exist')

  await prisma.$transaction(payload.templates.map((template) => prisma.notificationTemplate.update({
    where: { templateId: template.templateId },
    data: { active: template.automatic },
  })))

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: [{ phase: 'asc' }, { trigger: 'asc' }],
  })
  res.json({ data: templates.map(toTemplateDto) })
}))

notificationsRouter.get('/recipients', asyncHandler(async (req, res) => {
  const templateId = String(req.query.templateId || '')
  if (RESPONDENT_TEMPLATES.has(templateId)) {
    const links = await prisma.magicLink.findMany({
      where: { role: 'RESPONDENT', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      include: { emails: { orderBy: { queuedAt: 'desc' } } },
    })
    const taskIds = [...new Set(links.map((link) => link.payload?.taskId).filter(Boolean))]
    const eligibleTasks = await prisma.feedbackTask.findMany({
      where: {
        id: { in: taskIds },
        status: templateId === 'respondent-thank-you' ? 'SUBMITTED' : { not: 'SUBMITTED' },
      },
      select: { id: true },
    })
    const eligibleTaskIds = new Set(eligibleTasks.map((task) => task.id))
    const seenTasks = new Set()
    const rows = []
    for (const link of links) {
      const taskId = link.payload?.taskId
      const sourceEmail = link.emails.find((email) => metadataContext(email)['Magic Link'])
      if (!taskId || !eligibleTaskIds.has(taskId) || seenTasks.has(taskId) || !sourceEmail) continue
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

  await ensureNotificationTemplates()
  const template = await prisma.notificationTemplate.findUnique({ where: { templateId } })
  if (!template) throw httpError(404, 'Notification template not found')
  const intendedRole = {
    Participant: 'PARTICIPANT',
    BUHR: 'BUHR',
    'TD Admin': 'TD',
  }[template.recipient]

  const users = await prisma.user.findMany({
    where: {
      email: { not: '' },
      ...(intendedRole ? { roles: { has: intendedRole } } : {}),
    },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: { id: true, name: true, email: true, employeeId: true, roles: true, businessUnit: true },
  })
  const participants = template.recipient === 'Manager' ? await prisma.participant.findMany({
    orderBy: [{ cohort: { createdAt: 'desc' } }, { user: { name: 'asc' } }],
    select: {
      id: true,
      masterData: true,
      cohort: { select: { name: true } },
      user: { select: { name: true, employeeId: true, businessUnit: true } },
    },
  }) : []

  const masterContactDefinitions = [
    { role: 'reportingManager', nameField: 'reportingManagerName', emailField: 'reportingManagerEmail', label: 'Reporting Manager' },
    { role: 'skipManager', nameField: 'skipManagerName', emailField: 'skipManagerEmail', label: 'Skip Manager' },
    { role: 'buHead', nameField: 'buHeadName', emailField: 'buHeadEmail', label: 'BU Head' },
  ]
  const masterContacts = participants.flatMap((participant) => {
    const masterData = participant.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
    return masterContactDefinitions.flatMap((definition) => {
      const email = String(masterData[definition.emailField] || '').trim().toLowerCase()
      if (!email) return []
      const name = String(masterData[definition.nameField] || '').trim() || email
      return [{
        id: `masterContact:${participant.id}:${definition.role}`,
        sourceType: 'masterContact',
        sourceId: `${participant.id}:${definition.role}`,
        name,
        email,
        employeeId: null,
        roles: [definition.role],
        businessUnit: participant.user.businessUnit,
        detail: `${definition.label} for ${participant.user.name} · ${participant.cohort.name}`,
      }]
    })
  })

  res.json({
    data: [...users.map((user) => ({
      ...user,
      sourceType: 'user',
      sourceId: user.id,
      roles: user.roles.map((role) => role.toLowerCase()),
    })), ...masterContacts],
  })
}))

notificationsRouter.post('/cc-preview', asyncHandler(async (req, res) => {
  const payload = ccPreviewSchema.parse(req.body)
  const template = await prisma.notificationTemplate.findUnique({ where: { templateId: payload.templateId } })
  if (!template) throw httpError(404, 'Notification template not found')

  const uniqueRecipients = [...new Map(payload.recipients.map((recipient) => [`${recipient.sourceType}:${recipient.sourceId || recipient.email.toLowerCase()}`, recipient])).values()]
  const rows = []
  for (const recipient of uniqueRecipients) {
    const resolved = await resolveRecipient(recipient)
    const cc = await resolveCcRecipients({
      templateId: template.templateId,
      toEmail: resolved.email,
      entity: resolved.entity,
      entityId: resolved.entityId,
      metadata: resolved.metadata,
    })
    rows.push({ toEmail: resolved.email, toName: resolved.name, cc })
  }

  res.json({ data: rows })
}))

notificationsRouter.post('/send', asyncHandler(async (req, res) => {
  const payload = bulkSendSchema.parse(req.body)
  const template = await prisma.notificationTemplate.findUnique({ where: { templateId: payload.templateId } })
  if (!template) throw httpError(404, 'Notification template not found')

  const uniqueRecipients = [...new Map(payload.recipients.map((recipient) => [`${recipient.sourceType}:${recipient.sourceId || recipient.email.toLowerCase()}`, recipient])).values()]
  const resolvedRecipients = []
  for (const recipient of uniqueRecipients) {
    resolvedRecipients.push({ ...(await resolveRecipient(recipient)), sourceType: recipient.sourceType })
  }

  if (template.templateId === 'welcome') {
    for (const recipient of resolvedRecipients) {
      if (recipient.sourceType !== 'user' || recipient.entity !== 'Participant' || !recipient.entityId) continue
      const participant = await prisma.participant.findUnique({ where: { id: recipient.entityId }, include: { user: true } })
      if (!participant) throw httpError(404, `Participant account not found for ${recipient.email}`)
      const participantPassword = generatePassword()
      await prisma.user.update({
        where: { id: participant.userId },
        data: { passwordHash: await hashPassword(participantPassword) },
      })
      const participantLink = await createParticipantMagicLink(prisma, {
        userId: participant.userId,
        email: participant.user.email,
        participantId: participant.id,
      })
      recipient.context = { ...recipient.context, 'Participant Password': participantPassword, 'Login Link': participantLink.inviteUrl }
      recipient.magicLinkId = participantLink.magicLink.id
    }
  }

  if (template.templateId === 'buhr-participant-credentials') {
    for (const recipient of resolvedRecipients) {
      if (recipient.sourceType !== 'user') continue
      recipient.context = await buildBuhrCredentialContext(recipient)
      const buhrUser = await prisma.user.findUnique({ where: { email: recipient.email } })
      if (!buhrUser || !buhrUser.roles.includes('BUHR')) throw httpError(400, `BUHR account not found for ${recipient.email}`)
      const buhrLink = await createBuhrMagicLink(prisma, { userId: buhrUser.id, email: buhrUser.email })
      recipient.context = { ...recipient.context, 'Login Link': buhrLink.inviteUrl }
      recipient.magicLinkId = buhrLink.magicLink.id
    }
  }

  const personalized = resolvedRecipients.map((recipient) => {
    const personalizedSubject = renderTemplate(payload.subject, recipient.context)
    const personalizedBody = renderTemplate(payload.body, recipient.context)
    const unresolved = [...new Set([...(personalizedSubject.match(PLACEHOLDER_RE) || []), ...(personalizedBody.match(PLACEHOLDER_RE) || [])])]
    if (unresolved.length) throw httpError(400, `Cannot send to ${recipient.email}; unresolved placeholders: ${unresolved.join(', ')}`)
    return { ...recipient, subject: personalizedSubject, body: personalizedBody }
  })

  const results = []
  for (const recipient of personalized) {
    const deliveryRecord = await createQueuedEmail({
      templateId: template.templateId,
      toEmail: recipient.email,
      toName: recipient.name,
      subject: recipient.subject,
      body: recipient.body,
      context: recipient.context,
      magicLinkId: recipient.magicLinkId,
      entity: recipient.entity,
      entityId: recipient.entityId,
      actorId: req.auth.userId,
      metadata: { ...recipient.metadata, source: 'template-compose', templateTrigger: template.trigger },
    })
    const sent = await sendEmail(deliveryRecord.id, { force: true })
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
  const cohortId = typeof req.query.cohortId === 'string' ? req.query.cohortId.trim() : ''
  let where
  if (cohortId) {
    const [participants, feedbackTasks, reports] = await Promise.all([
      prisma.participant.findMany({ where: { cohortId }, select: { id: true } }),
      prisma.feedbackTask.findMany({ where: { participant: { cohortId } }, select: { id: true } }),
      prisma.report.findMany({ where: { participant: { cohortId } }, select: { id: true } }),
    ])
    const participantIds = participants.map((participant) => participant.id)
    where = {
      OR: [
        { entity: 'Cohort', entityId: cohortId },
        ...(participantIds.length ? [{ entity: 'Participant', entityId: { in: participantIds } }] : []),
        ...(participantIds.length ? participantIds.map((participantId) => ({ entity: 'ParticipantTask', entityId: { startsWith: `${participantId}:` } })) : []),
        ...(feedbackTasks.length ? [{ entity: 'FeedbackTask', entityId: { in: feedbackTasks.map((task) => task.id) } }] : []),
        ...(reports.length ? [{ entity: 'Report', entityId: { in: reports.map((report) => report.id) } }] : []),
      ],
    }
  }
  const emails = await prisma.emailOutbox.findMany({
    where,
    orderBy: { queuedAt: 'desc' },
    take: 200,
  })

  res.json({ data: emails.map(toEmailDto) })
}))
