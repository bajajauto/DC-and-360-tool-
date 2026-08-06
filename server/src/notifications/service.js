import { prisma } from '../db.js'
import { notificationTemplates } from './templates.js'

const TEMPLATE_CC_ROLES = {
  welcome: ['BUHR', 'LEARN'],
  'buhr-participant-credentials': ['PALAK'],
  'stage-deadline-reminder': ['BUHR', 'LEARN'],
  'report-360-released': ['BUHR', 'LEARN', 'MANAGER'],
  'report-dc-released': ['BUHR', 'LEARN', 'MANAGER'],
  'respondent-thank-you': ['PARTICIPANT'],
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function buildEmailHtml(body, context = {}) {
  let html = escapeHtml(body)
  const credentials = context['Participant Credentials']
  if (typeof credentials === 'string' && credentials.trim()) {
    const plainTable = `Participant Name | Ticket ID | Login Email | Password\n${credentials}`
    const rows = credentials.split('\n').map((row) => row.split('|').map((cell) => cell.trim()))
    const tableHtml = `<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr>${['Participant Name', 'Ticket ID', 'Login Email', 'Password'].map((heading) => `<th style="border:1px solid #cbd5e1;background:#ebf2fa;padding:8px;text-align:left;">${heading}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #cbd5e1;padding:8px;">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    html = html.replace(escapeHtml(plainTable), tableHtml)
  }
  const secureLinks = [
    [context['Login Link'], 'Direct login'],
    [context['App Link'], 'dc and 360 tool website link'],
    [context['Magic Link'], 'Open feedback form'],
  ].filter(([link]) => typeof link === 'string' && /^https?:\/\//i.test(link))

  for (const [link, label] of secureLinks) {
    const escapedLink = escapeHtml(link)
    html = html.replaceAll(
      escapedLink,
      `<a href="${escapedLink}" style="color:#1e4d8c;font-weight:600;text-decoration:underline;">${label}</a>`,
    )
  }

  return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1a1f2e;">${html.replaceAll('\n', '<br>')}</div>`
}

async function resolveParticipantId({ entity, entityId, metadata = {} }, db) {
  if (metadata?.participantId) return metadata.participantId
  if (entity === 'Participant') return entityId
  if (entity === 'ParticipantTask') return String(entityId || '').split(':')[0] || null
  if (entity === 'FeedbackTask') {
    const task = await db.feedbackTask.findUnique({ where: { id: entityId }, select: { participantId: true } })
    return task?.participantId || null
  }
  if (entity === 'Report') {
    const report = await db.report.findUnique({ where: { id: entityId }, select: { participantId: true } })
    return report?.participantId || null
  }
  return null
}

export async function resolveCcRecipients({ templateId, toEmail, entity, entityId, metadata }, db = prisma) {
  const roles = TEMPLATE_CC_ROLES[templateId] || []
  if (!roles.length) return []
  const participantId = await resolveParticipantId({ entity, entityId, metadata }, db)
  if (!participantId) {
    return roles.map((role) => ({
      LEARN: process.env.NOTIFICATION_LEARN_EMAIL || 'learn@bajajauto.co.in',
      PALAK: process.env.NOTIFICATION_PALAK_EMAIL || 'pshukla1@bajajauto.co.in',
    })[role]).map(normalizeEmail).filter(Boolean)
  }

  const participant = await db.participant.findUnique({
    where: { id: participantId },
    include: { user: true },
  })
  if (!participant) return []
  const masterData = participant.masterData && typeof participant.masterData === 'object' ? participant.masterData : {}
  const addresses = roles.map((role) => ({
    PARTICIPANT: participant.user?.email,
    BUHR: masterData.buhrEmail,
    MANAGER: masterData.reportingManagerEmail,
    LEARN: process.env.NOTIFICATION_LEARN_EMAIL || 'learn@bajajauto.co.in',
    PALAK: process.env.NOTIFICATION_PALAK_EMAIL || 'pshukla1@bajajauto.co.in',
  })[role])
  const normalizedTo = normalizeEmail(toEmail)
  return [...new Set(addresses.map(normalizeEmail).filter((email) => email && email !== normalizedTo))]
}

export function renderTemplate(text, context = {}) {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = context[key.trim()]
    return value === undefined || value === null ? match : String(value)
  })
}

export async function ensureNotificationTemplates(db = prisma) {
  for (const template of notificationTemplates) {
    await db.notificationTemplate.upsert({
      where: { templateId: template.templateId },
      update: {
        phase: template.phase,
        trigger: template.trigger,
        recipient: template.recipient,
        subject: template.subject,
        body: template.body,
      },
      create: template,
    })
  }
}

// Build (and cache) the SMTP transporter. Returns null with a human-readable
// reason string when the configuration is incomplete, so callers can record a
// helpful failure instead of a cryptic nodemailer stack trace.
let cachedTransporter = null
let cachedTransporterKey = null

async function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.office365.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  const missing = []
  if (!user) missing.push('SMTP_USER')
  if (!pass) missing.push('SMTP_PASS')
  if (missing.length) {
    return { transporter: null, error: `SMTP is not configured: missing ${missing.join(', ')} in the server environment.` }
  }

  const key = `${host}:${port}:${secure}:${user}`
  if (cachedTransporter && cachedTransporterKey === key) {
    return { transporter: cachedTransporter, error: null }
  }

  const nodemailer = await import('nodemailer')
  cachedTransporter = nodemailer.default.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  cachedTransporterKey = key
  return { transporter: cachedTransporter, error: null }
}

function describeSmtpError(error) {
  if (error.code === 'EAUTH') {
    return `SMTP authentication failed (${error.message}). For Office365 with MFA enabled, SMTP_PASS must be an app password, and SMTP AUTH must be enabled for the mailbox.`
  }
  if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
    return `Could not reach the SMTP server at ${process.env.SMTP_HOST || 'smtp.office365.com'}:${process.env.SMTP_PORT || 587} (${error.message}). Check SMTP_HOST/SMTP_PORT/SMTP_SECURE and network access.`
  }
  return error.message
}

// Called on server boot to surface SMTP misconfiguration early instead of
// failing silently on the first email. Logs a clear line; never throws.
export async function verifyEmailTransport() {
  const mode = process.env.EMAIL_MODE || 'smtp'
  if (mode !== 'smtp') {
    console.warn(`[email] EMAIL_MODE=${mode} — no email will be sent until EMAIL_MODE=smtp.`)
    return
  }

  const { transporter, error: configError } = await getTransporter()
  if (!transporter) {
    console.warn(`[email] ${configError}`)
    return
  }

  try {
    await transporter.verify()
    console.log(`[email] SMTP ready — ${process.env.SMTP_HOST || 'smtp.office365.com'}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER}`)
  } catch (error) {
    console.warn(`[email] SMTP verification failed — ${describeSmtpError(error)}`)
  }
}

async function deliverEmail(email, db = prisma) {
  const mode = process.env.EMAIL_MODE || 'smtp'
  if (mode !== 'smtp') {
    return db.emailOutbox.update({
      where: { id: email.id },
      data: {
        status: 'FAILED',
        error: `Immediate delivery requires EMAIL_MODE=smtp; received ${mode}`,
      },
    })
  }

  const { transporter, error: configError } = await getTransporter()
  if (!transporter) {
    return db.emailOutbox.update({
      where: { id: email.id },
      data: { status: 'FAILED', error: configError },
    })
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: email.toName ? `${email.toName} <${email.toEmail}>` : email.toEmail,
      cc: Array.isArray(email.metadata?.cc) && email.metadata.cc.length ? email.metadata.cc : undefined,
      subject: email.subject,
      text: email.body,
      html: buildEmailHtml(email.body, email.metadata?.context),
    })

    return db.emailOutbox.update({
      where: { id: email.id },
      data: {
        status: 'SENT',
        providerMessageId: result.messageId || null,
        sentAt: new Date(),
        error: null,
      },
    })
  } catch (error) {
    return db.emailOutbox.update({
      where: { id: email.id },
      data: {
        status: 'FAILED',
        error: describeSmtpError(error),
      },
    })
  }
}

// Creates the outbox row only — no SMTP send. Use this inside a database transaction
// (real network calls inside an interactive transaction risk hitting Prisma's
// transaction timeout once there are more than a couple of recipients); call
// sendEmail() for each returned row's id after the transaction commits.
export async function createQueuedEmail({
  dedupeKey = null,
  templateId,
  toEmail,
  toName,
  context = {},
  magicLinkId = null,
  entity = null,
  entityId = null,
  actorId = null,
  metadata = {},
  subject = null,
  body = null,
}, db = prisma) {
  let template = await db.notificationTemplate.findUnique({ where: { templateId } })

  if (!template) {
    const defaultTemplate = notificationTemplates.find((item) => item.templateId === templateId)
    if (!defaultTemplate) throw new Error(`Notification template not found: ${templateId}`)
    template = await db.notificationTemplate.create({ data: defaultTemplate })
  }

  const cc = await resolveCcRecipients({ templateId, toEmail, entity, entityId, metadata }, db)
  try {
    return await db.emailOutbox.create({
      data: {
        dedupeKey,
        templateId,
        toEmail,
        toName,
        recipientRole: template.recipient,
        subject: renderTemplate(subject || template.subject, context),
        body: renderTemplate(body || template.body, context),
        magicLinkId,
        entity,
        entityId,
        actorId,
        metadata: {
          ...metadata,
          context,
          cc,
        },
      },
    })
  } catch (error) {
    // Scheduled jobs can run concurrently on more than one app instance.
    // The unique key turns queueing into one atomic, database-enforced claim.
    if (dedupeKey && error?.code === 'P2002') return null
    throw error
  }
}

export async function queueEmail(params, db = prisma) {
  const template = await db.notificationTemplate.findUnique({ where: { templateId: params.templateId } })
  if (template && !template.active) return null
  const email = await createQueuedEmail(params, db)
  if (!email) return null
  return deliverEmail(email, db)
}

export async function sendEmail(outboxId, { force = false } = {}) {
  const email = await prisma.emailOutbox.findUnique({ where: { id: outboxId }, include: { template: true } })
  if (!email) throw new Error('Email not found')
  if (!force && email.template && !email.template.active) return email
  return deliverEmail(email)
}
