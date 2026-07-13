import { verifyToken } from '../utils/jwt.js'
import { httpError } from '../utils/httpError.js'

// Attaches req.auth = { userId, roles, typ, taskId, participantId } for a valid
// Bearer token, or rejects with 401. Synchronous throws are caught by Express 4
// and forwarded to the error handler.
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  if (!match) throw httpError(401, 'Authentication required')

  let payload
  try {
    payload = verifyToken(match[1])
  } catch {
    throw httpError(401, 'Your session has expired or is invalid. Please sign in again.')
  }

  req.auth = {
    userId: payload.sub || null,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    typ: payload.typ || 'user',
    taskId: payload.taskId || null,
    participantId: payload.participantId || null,
  }
  next()
}

// Route guard: allow only tokens carrying one of the given (lowercase) roles.
export function requireRole(...allowed) {
  return (req, _res, next) => {
    const roles = req.auth?.roles || []
    if (!roles.some((role) => allowed.includes(role))) {
      throw httpError(403, 'You do not have access to this resource')
    }
    next()
  }
}

export function hasRole(req, role) {
  return (req.auth?.roles || []).includes(role)
}
