import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt:${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false
  const [algorithm, salt, key] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !key) return false

  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey)
}
