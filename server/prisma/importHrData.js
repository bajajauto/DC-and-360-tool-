import 'dotenv/config'
import path from 'node:path'
import XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/utils/passwords.js'
import { seedAccessAccounts } from './accessAccounts.js'

const prisma = new PrismaClient()

const DEFAULT_FILE = String.raw`C:\Users\achaturvedi2\Documents\Docs for DC Tool\Docs for DC Tool\Copy of HR Data for DC 360 Tool.xlsx`
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
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

function toUser(row, passwordHash) {
  const employeeId = text(row['Users Sys Id'])
  const name = text(row['Full Name as per Aadhar Card'])
  const email = normalizeEmail(row['Email Address'])
  const designation = text(row['Local Designation'])
  const businessUnit = text(row['BU Head']) || 'Human Resources'
  const level = text(row['Job Level (Label)'])

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

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData,
    })

    await prisma.participant.upsert({
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
