const ALLOWED_EMAIL_DOMAIN = '@bajajauto.co.in'

export function hasBajajAutoEmail(email) {
  return typeof email === 'string'
    && email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)
}

export function assertBajajAutoEmail(email) {
  if (!hasBajajAutoEmail(email)) {
    const error = new Error('Access is restricted to Bajaj Auto email addresses')
    error.statusCode = 403
    throw error
  }
}
