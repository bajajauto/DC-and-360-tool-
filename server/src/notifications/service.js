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

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

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
        error: error.message,
      },
    })
  }
}

export async function queueEmail({
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

  const email = await db.emailOutbox.create({
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

  return deliverEmail(email, db)
}

export async function sendEmail(outboxId) {
  const email = await prisma.emailOutbox.findUnique({ where: { id: outboxId } })
  if (!email) throw new Error('Email not found')
  return deliverEmail(email)
}
