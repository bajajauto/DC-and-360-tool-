import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { prisma } from '../db.js'
import { cohortsRouter } from './cohorts.js'
import { errorHandler } from '../middleware/errorHandler.js'

test('participant nicknames are unique within a cohort', async (t) => {
  const rows = [
    { id: 'one', cohortId: 'a', nickname: 'FOX', archivedAt: null },
    { id: 'two', cohortId: 'a', nickname: null, archivedAt: null },
    { id: 'three', cohortId: 'b', nickname: null, archivedAt: null },
  ]
  let race = false
  const originals = [prisma.participant.findFirst, prisma.participant.update]
  t.after(() => {
    ;[prisma.participant.findFirst, prisma.participant.update] = originals
  })
  prisma.participant.findFirst = async ({ where }) => rows.find((row) =>
    Object.entries(where).every(([key, value]) => row[key] === value)) || null
  prisma.participant.update = async ({ where, data }) => {
    if (race) throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
    const row = rows.find((candidate) => candidate.id === where.id)
    Object.assign(row, data)
    return { id: row.id, nickname: row.nickname }
  }
  const app = express()
  app.use(express.json())
  app.use('/cohorts', cohortsRouter)
  app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const update = (cohort, id, nickname) => fetch(`http://127.0.0.1:${server.address().port}/cohorts/${cohort}/participants/${id}/nickname`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname }),
  })
  await t.test('allows the same nickname in another cohort', async () => {
    const response = await update('b', 'three', 'FOX')
    assert.equal(response.status, 200)
    assert.equal((await response.json()).data.nickname, 'FOX')
  })
  await t.test('rejects a duplicate in the same cohort', async () => {
    const response = await update('a', 'two', 'FOX')
    assert.equal(response.status, 409)
    assert.match((await response.json()).error.message, /in this cohort/)
    assert.equal(rows[1].nickname, null)
  })
  await t.test('allows saving the current nickname again', async () => {
    assert.equal((await update('a', 'one', 'FOX')).status, 200)
  })
  await t.test('rejects a participant outside the requested cohort', async () => {
    assert.equal((await update('b', 'two', 'OWL')).status, 404)
  })
  await t.test('handles a concurrent duplicate as a conflict', async () => {
    race = true
    const response = await update('a', 'two', 'OWL')
    assert.equal(response.status, 409)
    assert.match((await response.json()).error.message, /in this cohort/)
  })
})
