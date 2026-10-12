export const INTERNAL_EMAIL_DOMAINS = Object.freeze([
  '@bajajauto.co.in',
  '@bajajautocredit.com',
])

export function hasInternalEmail(email) {
  if (typeof email !== 'string') return false

  const normalizedEmail = email.trim().toLowerCase()
  return INTERNAL_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(domain))
}
