import cron from 'node-cron'
import { prisma } from '../db.js'
import { queueEmail } from './service.js'
import {
  buildInviteUrl,
  generateMagicToken,
  getMagicLinkExpiry,
  hashMagicToken,
} from '../utils/magicLinks.js'

const STAGE_ORDER = [
  'APPLICATION_PROFILE',
  'ROLE_INTERVIEW',
  'PHOTOGRAPH',
  'PRE_WORK',
  'NOMINEES_360',
  'FEEDBACK_360',
  'DC_ASSESSMENTS',
  'COMPLETED',
]

const STAGE_ITEMS = [
  { stage: 'ROLE_INTERVIEW', deadlineField: 'roleInterviewDeadline', label: 'Role Interview' },
  { stage: 'PHOTOGRAPH', deadlineField: 'photoDeadline', label: 'Photograph' },
  { stage: 'PRE_WORK', deadlineField: 'preWorkDeadline', label: 'Pre-Work' },
]

function formatDate(date) {
  return date
    ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'the cutoff date set for your cohort'
}

function daysUntil(date) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - startOfToday) / 86400000)
}

async function alreadyQueuedToday(db, templateId, entity, entityId) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const existing = await db.emailOutbox.findFirst({
    where: { templateId, entity, entityId, queuedAt: { gte: startOfToday } },
  })
  return Boolean(existing)
}

async function alreadyQueuedEver(db, templateId, entity, entityId) {
  const existing = await db.emailOutbox.findFirst({ where: { templateId, entity, entityId } })
  return Boolean(existing)
}

// Role Interview / Photograph / Pre-Work deadline reminders (Section 8: T-3, T-1)
async function sendStageDeadlineReminders(db) {
  for (const item of STAGE_ITEMS) {
    const notDoneStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(item.stage) + 1)
    const participants = await db.participant.findMany({
      where: { stage: { in: notDoneStages } },
      include: { user: true, cohort: true },
    })

    for (const participant of participants) {
      const deadline = participant.cohort[item.deadlineField]
      if (!deadline) continue

      const diff = daysUntil(deadline)
      if (diff !== 3 && diff !== 1) continue

      if (await alreadyQueuedToday(db, 'stage-deadline-reminder', 'Participant', participant.id)) continue

      await queueEmail({
        templateId: 'stage-deadline-reminder',
        toEmail: participant.user.email,
        toName: participant.user.name,
        context: {
          'Participant Name': participant.user.name,
          'Item Name': item.label,
          Deadline: formatDate(deadline),
        },
        entity: 'Participant',
        entityId: participant.id,
        metadata: { item: item.label, daysRemaining: diff },
      }, db)
    }
  }
}

// Tiered 360 respondent reminders: every 3 days for week 1, then daily, until submission or cutoff
async function sendRespondentReminders(db) {
  const tasks = await db.feedbackTask.findMany({
    where: { status: 'PENDING' },
    include: {
      participant: { include: { user: true } },
      nominee: true,
      respondent: true,
    },
  })

  const now = new Date()

  for (const task of tasks) {
    if (task.dueAt && task.dueAt < now) continue

    const daysSinceLaunch = Math.floor((now - task.createdAt) / 86400000)
    if (daysSinceLaunch < 1) continue

    const dueForReminder = daysSinceLaunch <= 7 ? daysSinceLaunch % 3 === 0 : true
    if (!dueForReminder) continue

    if (await alreadyQueuedToday(db, 'resp-reminder', 'FeedbackTask', task.id)) continue

    const toEmail = task.nominee?.email || task.respondent?.email
    const toName = task.nominee?.name || task.respondent?.name
    if (!toEmail) continue

    const token = generateMagicToken()
    const inviteUrl = buildInviteUrl(token)
    const expiresAt = getMagicLinkExpiry()

    const magicLink = await db.magicLink.create({
      data: {
        userId: task.respondentId || null,
        email: toEmail,
        role: 'RESPONDENT',
        tokenHash: hashMagicToken(token),
        expiresAt,
        payload: {
          taskId: task.id,
          nomineeId: task.nomineeId,
          participantId: task.participantId,
          name: toName,
          nomineeType: task.respondentId ? 'internal' : 'external',
        },
      },
    })

    await queueEmail({
      templateId: 'resp-reminder',
      toEmail,
      toName,
      context: {
        'Respondent Name': toName,
        'Participant Name': task.participant.user.name,
        'Estimated Time': '20 minutes',
        '360 Cutoff': formatDate(task.dueAt),
        'Magic Link': inviteUrl,
      },
      magicLinkId: magicLink.id,
      entity: 'FeedbackTask',
      entityId: task.id,
    }, db)
  }
}

// TD Admin notice once the 360 window closes (all submitted or cutoff reached) for a participant
async function sendThreeSixtyClosedNotices(db) {
  const participants = await db.participant.findMany({
    where: { stage: 'FEEDBACK_360' },
    include: { feedbackTasks: true, cohort: true, user: true },
  })

  const now = new Date()

  for (const participant of participants) {
    const tasks = participant.feedbackTasks
    if (!tasks.length) continue

    const allSubmitted = tasks.every((task) => task.status === 'SUBMITTED')
    const cutoffPassed = participant.cohort.threeSixtyCutoff && participant.cohort.threeSixtyCutoff < now
    if (!allSubmitted && !cutoffPassed) continue

    if (await alreadyQueuedEver(db, 'threesixty-closed', 'Participant', participant.id)) continue

    const submittedCount = tasks.filter((task) => task.status === 'SUBMITTED').length
    const tdAdmins = await db.user.findMany({ where: { roles: { has: 'TD' } } })

    for (const admin of tdAdmins) {
      await queueEmail({
        templateId: 'threesixty-closed',
        toEmail: admin.email,
        toName: admin.name,
        context: {
          Cohort: participant.cohort.name,
          'Response Summary': `${submittedCount} of ${tasks.length} respondents submitted for ${participant.user.name}`,
        },
        entity: 'Participant',
        entityId: participant.id,
      }, db)
    }
  }
}

export async function runNotificationScheduler() {
  await sendStageDeadlineReminders(prisma)
  await sendRespondentReminders(prisma)
  await sendThreeSixtyClosedNotices(prisma)
}

export function startNotificationScheduler() {
  cron.schedule('0 */6 * * *', () => {
    runNotificationScheduler().catch((error) => {
      console.error('Notification scheduler run failed:', error)
    })
  })
  console.log('Notification scheduler started (every 6 hours)')
}
