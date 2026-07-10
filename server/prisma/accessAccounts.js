import { hashPassword } from '../src/utils/passwords.js'

export const accessAccountSeeds = [
  {
    label: 'TD Admin',
    name: 'TD Admin',
    email: 'td.admin@bajajauto.co.in',
    employeeId: 'TD-ADMIN',
    passwordEnv: 'TD_ADMIN_PASSWORD',
    defaultPassword: 'Admin@123',
    designation: 'Talent Development Admin',
    businessUnit: 'Talent Development',
    roles: ['TD'],
  },
  {
    label: 'Assessor',
    name: 'DC Assessor',
    email: 'assessor@bajajauto.co.in',
    employeeId: 'ASSESSOR-1',
    passwordEnv: 'ASSESSOR_PASSWORD',
    defaultPassword: 'Assessor@123',
    designation: 'Development Centre Assessor',
    businessUnit: 'Assessment Panel',
    roles: ['ASSESSOR'],
  },
  {
    label: 'BUHR',
    name: 'BUHR Partner',
    email: 'buhr.ev@bajajauto.co.in',
    employeeId: 'BUHR-EV',
    passwordEnv: 'BUHR_PASSWORD',
    defaultPassword: 'Buhr@123',
    designation: 'BUHR Partner',
    businessUnit: 'EV & New Businesses',
    roles: ['BUHR'],
  },
]

export async function seedAccessAccounts(prisma) {
  const credentials = []

  for (const account of accessAccountSeeds) {
    const password = process.env[account.passwordEnv] || account.defaultPassword
    const passwordHash = await hashPassword(password)

    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        employeeId: account.employeeId,
        designation: account.designation,
        businessUnit: account.businessUnit,
        passwordHash,
        roles: account.roles,
      },
      create: {
        name: account.name,
        email: account.email,
        employeeId: account.employeeId,
        designation: account.designation,
        businessUnit: account.businessUnit,
        passwordHash,
        roles: account.roles,
      },
    })

    credentials.push({
      label: account.label,
      employeeId: account.employeeId,
      email: account.email,
      password,
    })
  }

  return credentials
}
