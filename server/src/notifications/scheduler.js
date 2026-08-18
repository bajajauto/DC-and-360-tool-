import cron from 'node-cron'
import { prisma } from '../db.js'
import { queueEmail } from './service.js'
import {
  buildInviteUrl,
  generateMagicToken,
  getMagicLinkExpiry,
  hashMagicToken,
} from '../utils/magicLinks.js'
import { hasDeadlinePassed } from '../utils/deadlines.js'

const STAGE_ITEMS = [
  { stage: 'ROLE_INTERVIEW', deadlineField: 'roleInterviewDeadline', label: 'Role Interview' },
  { stage: 'PHOTOGRAPH', deadlineField: 'photoDeadline', label: 'Photograph' },
  { stage: 'PRE_WORK', deadlineField: 'preWorkDeadline', label: 'Self Reflection' },
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

function relationshipSummary(tasks) {
  const stats = (relationship) => {
    const group = tasks.filter((task) => task.relationship === relationship)
    return { count: group.length, responded: group.filter((task) => task.status === 'SUBMITTED').length }
  }
  const self = stats('SELF')
  const rm = stats('REPORTING_MANAGER')
  const skip = stats('SKIP_MANAGER')
  const dr = stats('DIRECT_REPORT')
  const peer = stats('PEER')
  const below = [
    self.responded < 1 && 'Self',
    rm.count > 0 && rm.responded < 1 && 'Reporting Manager',
    skip.count > 0 && skip.responded < 1 && 'Skip / BU Head',
    dr.count > 0 && dr.responded < 2 && 'Direct Reports',
    peer.count > 0 && peer.responded < 2 && 'Peers / Stakeholders',
  ].filter(Boolean)
  return { self, rm, skip, dr, peer, below }
}

function responseStatusContext(participant) {
  const tasks = participant.feedbackTasks || []
  const summary = relationshipSummary(tasks)
  const responded = tasks.filter((task) => task.status === 'SUBMITTED').length
  const pendingNames = tasks
    .filter((task) => task.relationship !== 'SELF' && task.status !== 'SUBMITTED')
    .map((task) => task.nominee?.name || task.respondent?.name)
    .filter(Boolean)
    .join(', ')
  const status = (count, minimum) => count >= minimum ? 'Minimum met' : 'Below minimum'
  return {
    'Participant Name': participant.user.name,
    '360 Cutoff': formatDate(participant.cohort.threeSixtyCutoff),
    'Days Remaining': participant.cohort.threeSixtyCutoff ? String(Math.max(0, daysUntil(participant.cohort.threeSixtyCutoff))) : '',
    'Respondent Count': String(tasks.length),
    'Responded Count': String(responded),
    'Groups Below Threshold': summary.below.join(', ') || 'None',
    'Pending Respondent Names': pendingNames || 'None',
    'Self Responded': String(summary.self.responded),
    'Self Status': status(summary.self.responded, 1),
    'RM Count': String(summary.rm.count),
    'RM Responded': String(summary.rm.responded),
    'RM Status': status(summary.rm.responded, 1),
    'Skip Count': String(summary.skip.count),
    'Skip Responded': String(summary.skip.responded),
    'Skip Status': status(summary.skip.responded, 1),
    'DR Count': String(summary.dr.count),
    'DR Responded': String(summary.dr.responded),
    'DR Status': summary.dr.count ? status(summary.dr.responded, 2) : 'Not applicable',
    'Peer Count': String(summary.peer.count),
    'Peer Responded': String(summary.peer.responded),
    'Peer Status': status(summary.peer.responded, 2),
  }
}

function stageItemComplete(participant, item) {
  if (item.stage === 'ROLE_INTERVIEW') return participant.roleInterview?.status === 'submitted'
  if (item.stage === 'PRE_WORK') return participant.preWork?.status === 'submitted'
  return Boolean(participant.photoUrl)
}

function schedulerDayKey() {
  return new Date().toISOString().slice(0, 10)
}

async function stageReminderAlreadyQueuedToday(db, participant) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const existing = await db.emailOutbox.findFirst({
    where: {
      templateId: 'stage-deadline-reminder',
      toEmail: { equals: participant.user.email, mode: 'insensitive' },
      queuedAt: { gte: startOfToday },
    },
  })
  return Boolean(existing)
}

// One consolidated Role Interview / Photograph / Self Reflection reminder per
// participant at T-3/T-1 whenever any pending item's deadline triggers a run.
async function sendStageDeadlineReminders(db) {
  const participants = await db.participant.findMany({
    where: { archivedAt: null },
    include: { user: true, cohort: true },
  })

  for (const participant of participants) {
    const pendingItems = STAGE_ITEMS
      .filter((item) => !stageItemComplete(participant, item))
      .map((item) => ({ ...item, deadline: participant.cohort[item.deadlineField] }))
    const triggeringItems = pendingItems.filter((item) => item.deadline && [3, 1].includes(daysUntil(item.deadline)))
    if (!triggeringItems.length) continue
    if (await stageReminderAlreadyQueuedToday(db, participant)) continue

    await queueEmail({
      dedupeKey: `stage-deadline-reminder:${participant.id}:${schedulerDayKey()}`,
      templateId: 'stage-deadline-reminder',
      toEmail: participant.user.email,
      toName: participant.user.name,
      context: {
        'Participant Name': participant.user.name,
        Cohort: participant.cohort.name,
        'DC Dates': participant.cohort.eventStart && participant.cohort.eventEnd
          ? `${formatDate(participant.cohort.eventStart)} - ${formatDate(participant.cohort.eventEnd)}`
          : formatDate(participant.cohort.eventStart),
        'Pending Items': pendingItems
          .map((item) => `- ${item.label}${item.deadline ? ` (due ${formatDate(item.deadline)} EOD)` : ''}`)
          .join('\n'),
        'Prework Deadline': formatDate(triggeringItems[0].deadline),
      },
      entity: 'Participant',
      entityId: participant.id,
      metadata: {
        items: pendingItems.map((item) => item.label),
        triggeringItems: triggeringItems.map((item) => item.label),
      },
    }, db)
  }
}

// Nomination reminders at T-3 and T-1 while the list is not submitted.
async function sendNominationReminders(db) {
  const participants = await db.participant.findMany({
    where: { archivedAt: null },
    include: { user: true, cohort: true, nominees: true },
  })
  for (const participant of participants) {
    const deadline = participant.cohort.nominationDeadline
    if (!deadline || ![3, 1].includes(daysUntil(deadline))) continue
    const submitted = participant.nominees.length > 0 && participant.nominees.every((nominee) => nominee.status === 'SUBMITTED')
    if (submitted || await alreadyQueuedToday(db, 'nom-reminder', 'Participant', participant.id)) continue
    await queueEmail({
      dedupeKey: `nom-reminder:${participant.id}:${schedulerDayKey()}`,
      templateId: 'nom-reminder',
      toEmail: participant.user.email,
      toName: participant.user.name,
      context: {
        'Participant Name': participant.user.name,
        'Nomination Deadline': formatDate(deadline),
      },
      entity: 'Participant',
      entityId: participant.id,
      metadata: { daysRemaining: daysUntil(deadline) },
    }, db)
  }
}

// Recurring 360 respondent reminders: every two days until submission or cutoff
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

    const remaining = task.dueAt ? daysUntil(task.dueAt) : null
    const isFinalReminder = remaining === 1
    if (!isFinalReminder && daysSinceLaunch % 2 !== 0) continue
    const templateId = isFinalReminder ? 'resp-reminder' : 'resp-recurring-reminder'

    if (await alreadyQueuedToday(db, templateId, 'FeedbackTask', task.id)) continue

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
      dedupeKey: `${templateId}:${task.id}:${schedulerDayKey()}`,
      templateId,
      toEmail,
      toName,
      context: {
        'Respondent Name': toName,
        'Participant Name': task.participant.user.name,
        'Estimated Time': '20 minutes',
        '360 Cutoff': formatDate(task.dueAt),
        'Days Remaining': task.dueAt ? String(Math.max(0, daysUntil(task.dueAt))) : '',
        'Magic Link': inviteUrl,
      },
      magicLinkId: magicLink.id,
      entity: 'FeedbackTask',
      entityId: task.id,
    }, db)
  }
}

// Participant status runs daily while at least one response is outstanding.
async function sendDailyStatusAndLowResponseAlerts(db) {
  const participants = await db.participant.findMany({
    where: { stage: 'FEEDBACK_360', archivedAt: null },
    include: {
      user: true,
      cohort: true,
      feedbackTasks: { include: { nominee: true, respondent: true } },
    },
  })
  for (const participant of participants) {
    const tasks = participant.feedbackTasks
    if (!tasks.length || tasks.every((task) => task.status === 'SUBMITTED')) continue
    const cutoff = participant.cohort.threeSixtyCutoff
    if (cutoff && daysUntil(cutoff) < 0) continue
    const context = responseStatusContext(participant)

    if (!await alreadyQueuedToday(db, 'daily-360-status', 'Participant', participant.id)) {
      await queueEmail({
        dedupeKey: `daily-360-status:${participant.id}:${schedulerDayKey()}`,
        templateId: 'daily-360-status',
        toEmail: participant.user.email,
        toName: participant.user.name,
        context,
        entity: 'Participant',
        entityId: participant.id,
      }, db)
    }

    if (cutoff && daysUntil(cutoff) === 3 && relationshipSummary(tasks).below.length
      && !await alreadyQueuedEver(db, 'low-response-alert', 'Participant', participant.id)) {
      await queueEmail({
        dedupeKey: `low-response-alert:${participant.id}`,
        templateId: 'low-response-alert',
        toEmail: participant.user.email,
        toName: participant.user.name,
        context,
        entity: 'Participant',
        entityId: participant.id,
      }, db)
    }
  }
}

// TD Admin notice once the 360 window closes (all submitted or cutoff reached) for a participant
async function sendThreeSixtyClosedNotices(db) {
  const participants = await db.participant.findMany({
    where: { stage: 'FEEDBACK_360', archivedAt: null },
    include: { feedbackTasks: true, cohort: true, user: true },
  })

  const now = new Date()

  for (const participant of participants) {
    const tasks = participant.feedbackTasks
    if (!tasks.length) continue

    const allSubmitted = tasks.every((task) => task.status === 'SUBMITTED')
    const cutoffPassed = hasDeadlinePassed(participant.cohort.threeSixtyCutoff, now)
    if (!allSubmitted && !cutoffPassed) continue

    if (await alreadyQueuedEver(db, 'threesixty-closed', 'Participant', participant.id)) continue

    const submittedCount = tasks.filter((task) => task.status === 'SUBMITTED').length
    const tdAdmins = await db.user.findMany({ where: { roles: { has: 'TD' } } })

    for (const admin of tdAdmins) {
      await queueEmail({
        dedupeKey: `threesixty-closed:${participant.id}:${admin.id}`,
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
  await sendNominationReminders(prisma)
  await sendRespondentReminders(prisma)
  await sendDailyStatusAndLowResponseAlerts(prisma)
  await sendThreeSixtyClosedNotices(prisma)
}

export function startNotificationScheduler() {
  runNotificationScheduler().catch((error) => {
    console.error('Initial notification scheduler run failed:', error)
  })
  cron.schedule('0 */6 * * *', () => {
    runNotificationScheduler().catch((error) => {
      console.error('Notification scheduler run failed:', error)
    })
  })
  console.log('Notification scheduler started (every 6 hours)')
}
