import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedAccessAccounts } from './accessAccounts.js'
import { SURVEY_SECTIONS } from '../../src/data/surveyConfig.js'

const prisma = new PrismaClient()

const competencies = SURVEY_SECTIONS.flatMap((section) =>
  section.competencies.map((competency) => ({
    code: competency.shortCode,
    name: competency.title,
    questions: competency.behaviours.map((behaviour) => behaviour.text),
  })),
)

const participantSeeds = [
  ['Rahul Kumar', 'rahul.kumar@bajaj.com', 'EX-78432', 'Senior Manager', 'Two-Wheeler', 86, 'DC_ASSESSMENTS', 'WAITING'],
  ['Neha Sharma', 'neha.sharma@bajaj.com', 'EX-77214', 'Senior Manager', 'EV & New Businesses', 100, 'COMPLETED', 'GENERATED'],
  ['Arjun Patel', 'arjun.patel@bajaj.com', 'EX-76103', 'Deputy General Manager', 'International Business', 75, 'FEEDBACK_360', 'WAITING'],
  ['Sunita Rao', 'sunita.rao@bajaj.com', 'EX-75991', 'Senior Manager', 'Finance', 100, 'COMPLETED', 'GENERATED'],
]

const nomineeSeeds = {
  'rahul.kumar@bajaj.com': [
    ['Priya Menon', 'priya.menon@bajaj.com', 'GM - Sales Strategy', 'REPORTING_MANAGER', 'SUBMITTED'],
    ['Vikram Sood', 'vikram.sood@bajaj.com', 'VP - Operations', 'SKIP_MANAGER', 'SUBMITTED'],
    ['Ankit Verma', 'ankit.verma@bajaj.com', 'Peer', 'PEER', 'SUBMITTED'],
    ['Pooja Shah', 'pooja.shah@bajaj.com', 'Peer', 'PEER', 'SUBMITTED'],
    ['Sameer Kulkarni', 'sameer.kulkarni@bajaj.com', 'Peer', 'PEER', 'SUBMITTED'],
  ],
  'neha.sharma@bajaj.com': [
    ['Suresh Nair', 'suresh.nair@bajaj.com', 'Reporting Manager', 'REPORTING_MANAGER', 'SUBMITTED'],
    ['Karan Mehta', 'karan.mehta@bajaj.com', 'Peer', 'PEER', 'SUBMITTED'],
    ['Aditi Joshi', 'aditi.joshi@bajaj.com', 'Peer', 'PEER', 'SUBMITTED'],
    ['Harsh Jain', 'harsh.jain@bajaj.com', 'Direct Reportee', 'DIRECT_REPORT', 'SUBMITTED'],
  ],
}

async function seedCompetencies() {
  for (const [index, competency] of competencies.entries()) {
    const savedCompetency = await prisma.competency.upsert({
      where: { code: competency.code },
      update: {
        name: competency.name,
        sortOrder: index + 1,
      },
      create: {
        code: competency.code,
        name: competency.name,
        sortOrder: index + 1,
      },
    })

    const activeQuestionCodes = []

    for (const [questionIndex, text] of competency.questions.entries()) {
      const code = `${competency.code.toLowerCase()}-${questionIndex + 1}`
      activeQuestionCodes.push(code)

      await prisma.question.upsert({
        where: { code },
        update: {
          text,
          sortOrder: questionIndex + 1,
        },
        create: {
          competencyId: savedCompetency.id,
          code,
          text,
          sortOrder: questionIndex + 1,
        },
      })
    }

    await prisma.question.deleteMany({
      where: {
        competencyId: savedCompetency.id,
        code: { notIn: activeQuestionCodes },
      },
    })
  }
}

async function seedCohort() {
  return prisma.cohort.upsert({
    where: { slug: 'ex-lx-25' },
    update: {},
    create: {
      slug: 'ex-lx-25',
      name: "EX to LX Cohort '25",
      programme: 'Development Centre',
      eventStart: new Date('2025-07-25T09:00:00.000Z'),
      eventEnd: new Date('2025-07-26T18:00:00.000Z'),
    },
  })
}

async function seedParticipants(cohort) {
  const participants = []

  for (const seed of participantSeeds) {
    const [name, email, employeeId, designation, businessUnit, progress, stage, reportStatus] = seed
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        employeeId,
        designation,
        businessUnit,
        roles: ['PARTICIPANT'],
      },
      create: {
        name,
        email,
        employeeId,
        designation,
        businessUnit,
        roles: ['PARTICIPANT'],
      },
    })

    const participant = await prisma.participant.upsert({
      where: { userId: user.id },
      update: {
        cohortId: cohort.id,
        progress,
        stage,
        reportStatus,
        lastActivityAt: new Date(),
      },
      create: {
        userId: user.id,
        cohortId: cohort.id,
        progress,
        stage,
        reportStatus,
        lastActivityAt: new Date(),
      },
    })

    participants.push({ ...participant, email })
  }

  return participants
}

async function seedNominees(participants) {
  for (const participant of participants) {
    const nominees = nomineeSeeds[participant.email] || []

    for (const nominee of nominees) {
      const [name, email, designation, relationship, status] = nominee
      const savedNominee = await prisma.nominee.upsert({
        where: {
          participantId_email_relationship: {
            participantId: participant.id,
            email,
            relationship,
          },
        },
        update: {
          name,
          designation,
          status,
          submittedAt: status === 'SUBMITTED' ? new Date() : null,
        },
        create: {
          participantId: participant.id,
          name,
          email,
          designation,
          relationship,
          source: 'seed',
          locked: relationship === 'REPORTING_MANAGER' || relationship === 'SKIP_MANAGER',
          status,
          submittedAt: status === 'SUBMITTED' ? new Date() : null,
        },
      })

      if (status === 'SUBMITTED') {
        await prisma.feedbackTask.upsert({
          where: { nomineeId: savedNominee.id },
          update: {},
          create: {
            participantId: participant.id,
            nomineeId: savedNominee.id,
            relationship,
            status: participant.reportStatus === 'GENERATED' ? 'SUBMITTED' : 'PENDING',
          },
        })
      }
    }
  }
}

async function main() {
  await seedCompetencies()
  const cohort = await seedCohort()
  const participants = await seedParticipants(cohort)
  await seedNominees(participants)
  await seedAccessAccounts(prisma)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Seed data loaded')
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
