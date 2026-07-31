import { prisma } from '../db.js'
import { notificationTemplates } from './templates.js'

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
        active: true,
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
      subject: email.subject,
      text: email.body,
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
  templateId,
  toEmail,
  toName,
  context = {},
  magicLinkId = null,
  entity = null,
  entityId = null,
  actorId = null,
  metadata = {},
}, db = prisma) {
  let template = await db.notificationTemplate.findUnique({ where: { templateId } })

  if (!template) {
    const defaultTemplate = notificationTemplates.find((item) => item.templateId === templateId)
    if (!defaultTemplate) throw new Error(`Notification template not found: ${templateId}`)
    template = await db.notificationTemplate.create({ data: defaultTemplate })
  }

  return db.emailOutbox.create({
    data: {
      templateId,
      toEmail,
      toName,
      recipientRole: template.recipient,
      subject: renderTemplate(template.subject, context),
      body: renderTemplate(template.body, context),
      magicLinkId,
      entity,
      entityId,
      actorId,
      metadata: {
        ...metadata,
        context,
      },
    },
  })
}

export async function queueEmail(params, db = prisma) {
  const email = await createQueuedEmail(params, db)
  return deliverEmail(email, db)
}

export async function sendEmail(outboxId) {
  const email = await prisma.emailOutbox.findUnique({ where: { id: outboxId } })
  if (!email) throw new Error('Email not found')
  return deliverEmail(email)
}
