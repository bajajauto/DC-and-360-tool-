import { hasInternalEmail } from '../../../src/lib/emailAccess.js'

export function hasBajajAutoEmail(email) {
  return hasInternalEmail(email)
}

export function assertBajajAutoEmail(email) {
  if (!hasBajajAutoEmail(email)) {
    const error = new Error('Access is restricted to Bajaj Auto email addresses')
    error.statusCode = 403
    throw error
  }
}
