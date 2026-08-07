import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const KEY_LENGTH = 64

export function generatePassword() {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*?',
  ]
  const alphabet = groups.join('')
  const characters = groups.map((group) => group[crypto.randomInt(group.length)])

  while (characters.length < 10) {
    characters.push(alphabet[crypto.randomInt(alphabet.length)])
  }
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(index + 1)
    const current = characters[index]
    characters[index] = characters[swapIndex]
    characters[swapIndex] = current
  }

  return characters.join('')
}

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
