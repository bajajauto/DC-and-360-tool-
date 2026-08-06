import crypto from 'node:crypto'

const DEFAULT_TTL_DAYS = 14

export function generateMagicToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashMagicToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getMagicLinkExpiry(days = DEFAULT_TTL_DAYS) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + days)
  return expiresAt
}

export function buildInviteUrl(token) {
  const appUrl = process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173'
  return `${appUrl.replace(/\/$/, '')}/invite/${token}`
}

export async function createParticipantMagicLink(db, { userId, email, participantId }) {
  const token = generateMagicToken()
  const magicLink = await db.magicLink.create({
    data: {
      userId,
      email: normalizeEmail(email),
      role: 'PARTICIPANT',
      tokenHash: hashMagicToken(token),
      expiresAt: getMagicLinkExpiry(),
      payload: { participantId },
    },
  })

  return { magicLink, inviteUrl: buildInviteUrl(token) }
}

export async function createBuhrMagicLink(db, { userId, email }) {
  const token = generateMagicToken()
  const magicLink = await db.magicLink.create({
    data: {
      userId,
      email: normalizeEmail(email),
      role: 'BUHR',
      tokenHash: hashMagicToken(token),
      expiresAt: getMagicLinkExpiry(),
      payload: {},
    },
  })

  return { magicLink, inviteUrl: buildInviteUrl(token) }
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase()
}
