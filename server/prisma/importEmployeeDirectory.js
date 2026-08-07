import 'dotenv/config'
import path from 'node:path'
import XLSX from 'xlsx'
import { prisma } from '../src/db.js'

const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('Usage: npm run db:import-directory -- "path/to/employee-dump.xlsx"')

const workbook = XLSX.readFile(path.resolve(sourcePath))
const worksheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

function text(value) {
  return String(value ?? '').trim()
}

function email(value) {
  const normalized = text(value).toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

const entries = rows.map((row) => ({
  employeeId: text(row['Users Sys Id']),
  name: text(row['Full Name as per Aadhar Card']),
  positionLevel: text(row['Position Position Level (Label)']).toUpperCase(),
  email: email(row['Email Address']),
})).filter((entry) => entry.employeeId && entry.name && entry.positionLevel)

const uniqueEntries = [...new Map(entries.map((entry) => [entry.employeeId.toLowerCase(), entry])).values()]
const now = new Date()

await prisma.$transaction(async (tx) => {
  await tx.employeeDirectoryEntry.deleteMany()
  await tx.employeeDirectoryEntry.createMany({
    data: uniqueEntries.map((entry) => ({ ...entry, createdAt: now, updatedAt: now })),
  })
})

console.log(`Imported ${uniqueEntries.length} employee directory records (${uniqueEntries.filter((entry) => entry.email).length} with email, ${uniqueEntries.filter((entry) => !entry.email).length} without email).`)
await prisma.$disconnect()
