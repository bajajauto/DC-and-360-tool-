import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { prisma } from '../db.js'
import { authRouter } from './auth.js'
import { invitesRouter } from './invites.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { signToken, verifyToken } from '../utils/jwt.js'

test('BUHR participant links and existing sessions resolve their own active cohort', async (t) => {
  const user = { id: 'user-sakshi', name: 'SAKSHI BHATI', employeeId: '122407', email: 'test@bajajauto.co.in', roles: ['BUHR', 'PARTICIPANT'] }
  let membership = { id: 'participant-sakshi', cohort: { name: 'Test cohort' } }
  let lookups = 0
  const originals = [prisma.participant.findFirst, prisma.magicLink.findUnique, prisma.magicLink.update]
  t.after(() => {
    prisma.participant.findFirst = originals[0]
    prisma.magicLink.findUnique = originals[1]
    prisma.magicLink.update = originals[2]
  })
  prisma.participant.findFirst = async ({ where }) => {
    lookups++
    assert.deepEqual(where, { userId: user.id, archivedAt: null })
    return membership
  }
  prisma.magicLink.findUnique = async () => ({ id: 'invite', role: 'BUHR', user })
  prisma.magicLink.update = async () => ({})
  const app = express()
  app.use(express.json())
  app.use('/auth', authRouter)
  app.use('/invites', invitesRouter)
  app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}`
  const claims = { sub: user.id, email: user.email, roles: ['buhr', 'participant'], typ: 'user' }
  const context = (overrides = {}) => fetch(`${base}/auth/participant-context`, {
    headers: { Authorization: `Bearer ${signToken({ ...claims, ...overrides })}` },
  })

  await t.test('new BUHR links include participant ID in response and token', async () => {
    const response = await fetch(`${base}/invites/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: 'test-invite-token-with-24-characters' }) })
    assert.equal(response.status, 200)
    const { data } = await response.json()
    assert.equal(data.role, 'buhr')
    assert.equal(data.participantId, membership.id)
    assert.equal(data.cohort, membership.cohort.name)
    assert.equal(verifyToken(data.token).participantId, membership.id)
  })
  await t.test('old tokens without a participant ID recover the cohort', async () => {
    const response = await context()
    assert.equal(response.status, 200)
    assert.deepEqual((await response.json()).data, { participantId: membership.id, cohort: membership.cohort.name })
  })
  await t.test('stale participant IDs are resolved by authenticated user ownership', async () => {
    const response = await context({ participantId: 'someone-else' })
    assert.equal((await response.json()).data.participantId, membership.id)
  })
  await t.test('respondent task links and nonparticipants cannot recover participant access', async () => {
    const before = lookups
    assert.equal((await context({ roles: ['respondent'], typ: 'respondent' })).status, 403)
    assert.equal((await context({ typ: 'respondent' })).status, 403)
    assert.equal((await context({ roles: ['buhr'] })).status, 403)
    assert.equal(lookups, before)
    assert.equal((await fetch(`${base}/auth/participant-context`)).status, 401)
  })
  await t.test('missing or archived membership clears stale cohort details', async () => {
    membership = null
    const response = await context()
    assert.deepEqual((await response.json()).data, { participantId: null, cohort: null })
  })
})
