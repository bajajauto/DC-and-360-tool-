import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { accessAccountSeeds, seedAccessAccounts } from './accessAccounts.js'

// Runs on every boot from startup.sh, so it must be a no-op once the database has
// users. seedAccessAccounts() upserts and rewrites passwordHash, which would undo an
// admin's password change if this ran unconditionally.
const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.count()
  if (existing > 0) {
    console.log(`[bootstrap] ${existing} user(s) already present — skipping access account seed`)
    return
  }

  console.log('[bootstrap] Empty database — creating access accounts')
  await seedAccessAccounts(prisma)

  // Passwords are deliberately not logged; the log stream is readable by anyone with
  // portal access. Flag the accounts still sitting on their built-in default instead.
  for (const account of accessAccountSeeds) {
    const usingDefault = !process.env[account.passwordEnv]
    const source = usingDefault ? `DEFAULT — set ${account.passwordEnv} and change it` : `from ${account.passwordEnv}`
    console.log(`[bootstrap]   ${account.label}: ${account.email} (password ${source})`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error('[bootstrap] Failed to seed access accounts')
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
