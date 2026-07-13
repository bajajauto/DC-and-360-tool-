import crypto from 'node:crypto'

// Self-contained HS256 JWT (no external dependency). Mirrors the scrypt
// approach in passwords.js: use Node's built-in crypto directly.

const DEV_SECRET = 'dev-insecure-secret-change-me'
const PLACEHOLDER_SECRET = 'replace-with-a-long-random-secret'
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

let warnedAboutSecret = false

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (secret && secret !== PLACEHOLDER_SECRET) return secret

  if (!warnedAboutSecret) {
    console.warn(
      '[auth] JWT_SECRET is not set (or still the placeholder). Falling back to an insecure dev secret. ' +
        'Set a long random JWT_SECRET in .env before deploying.',
    )
    warnedAboutSecret = true
  }
  return DEV_SECRET
}

function encode(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function signToken(payload, { expiresInSeconds = DEFAULT_TTL_SECONDS } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const body = encode({ ...payload, iat: now, exp: now + expiresInSeconds })
  const data = `${header}.${body}`
  return `${data}.${sign(data)}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') throw new Error('Missing token')

  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed token')

  const [header, body, signature] = parts
  const expected = sign(`${header}.${body}`)
  const signatureBuf = Buffer.from(signature)
  const expectedBuf = Buffer.from(expected)

  if (signatureBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired')
  }

  return payload
}
