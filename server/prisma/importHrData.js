import 'dotenv/config'
import path from 'node:path'
import XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/passwords.js'
import { seedAccessAccounts } from './accessAccounts.js'
import { queueEmail } from '../src/notifications/service.js'

const prisma = new PrismaClient()

const DEFAULT_FILE = String.raw`C:\Users\achaturvedi2\Documents\Docs for DC Tool\Docs for DC Tool\master data template.xlsx`
const DEFAULT_PASSWORD = process.env.MOCK_USER_PASSWORD || 'Welcome@123'

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim()
}

function normalizeEmail(value) {
  return text(value).toLowerCase()
}

function parseRows(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }).slice(1)
}

function toUser(row, passwordHash) {
  const employeeId = text(row[2])
  const name = text(row[1])
  const email = normalizeEmail(row[15])
  const designation = text(row[4])
  const businessUnit = text(row[13])
  const level = text(row[5])

  return {
    employeeId,
    name,
    email,
    designation: level ? `${designation} - ${level}` : designation,
    businessUnit,
    passwordHash,
    roles: ['PARTICIPANT'],
  }
}

async function main() {
  const filePath = process.env.HR_DATA_FILE || DEFAULT_FILE
  const rows = parseRows(filePath)
    .map((row) => toUser(row, null))
    .filter((row) => row.employeeId && row.name && row.email)

  const passwordHash = await hashPassword(DEFAULT_PASSWORD)
  const cohort = await prisma.cohort.upsert({
    where: { slug: 'hr-dc-360-mock' },
    update: {
      name: 'HR DC 360 Mock Cohort',
      programme: 'Development Centre',
    },
    create: {
      slug: 'hr-dc-360-mock',
      name: 'HR DC 360 Mock Cohort',
      programme: 'Development Centre',
      eventStart: new Date('2026-08-01T09:00:00.000Z'),
      eventEnd: new Date('2026-08-02T18:00:00.000Z'),
    },
  })

  let imported = 0
  for (const row of rows) {
    const userData = {
      ...row,
      passwordHash,
    }

    const existingUser = await prisma.user.findUnique({ where: { email: userData.email } })

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    })

    const participant = await prisma.participant.upsert({
      where: { userId: user.id },
      update: {
        cohortId: cohort.id,
        stage: 'APPLICATION_PROFILE',
        progress: 10,
        lastActivityAt: new Date(),
      },
      create: {
        userId: user.id,
        cohortId: cohort.id,
        stage: 'APPLICATION_PROFILE',
        progress: 10,
        lastActivityAt: new Date(),
      },
    })

    if (!existingUser) {
      await queueEmail({
        templateId: 'welcome',
        toEmail: user.email,
        toName: user.name,
        context: {
          'Participant Name': user.name,
          Cohort: cohort.name,
          'Password Link': process.env.APP_URL || '',
          'Nomination Deadline': 'the deadline set for your cohort',
        },
        entity: 'Participant',
        entityId: participant.id,
      })
    }

    imported += 1
  }

  const accessCredentials = await seedAccessAccounts(prisma)

  console.log(`Imported ${imported} HR users into ${cohort.name}`)
  console.log(`Mock credential for all imported users: employeeId or email + ${DEFAULT_PASSWORD}`)
  for (const credential of accessCredentials) {
    console.log(`${credential.label}: ${credential.employeeId} or ${credential.email} + ${credential.password}`)
  }
  console.log(`Source: ${path.normalize(filePath)}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
