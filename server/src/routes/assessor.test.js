import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { prisma } from '../db.js'
import { assessorRouter } from './assessor.js'
import { errorHandler } from '../middleware/errorHandler.js'

test('assessor list requires a cohort and includes photos while details retain evidence', async (t) => {
  const participant = {
    id: 'candidate', nickname: 'FOX', stage: 'APPLICATION_PROFILE', progress: 50,
    reportStatus: 'GENERATED', user: { employeeId: '123', designation: 'Manager', businessUnit: 'HR' },
    cohort: { id: 'cohort', name: 'Test cohort' },
    photoUrl: `data:image/jpeg;base64,${'a'.repeat(1000000)}`,
    masterData: { jobLevel: 'L3' },
    preWork: { status: 'submitted', answers: { one: 'Reflection answer' } },
    roleInterview: { status: 'submitted', answers: { one: 'Interview answer' } },
    feedbackTasks: [{ status: 'SUBMITTED' }], reports: [],
  }
  const originals = [prisma.participant.findMany, prisma.participant.findFirst, prisma.cohort.findMany]
  t.after(() => {
    ;[prisma.participant.findMany, prisma.participant.findFirst, prisma.cohort.findMany] = originals
  })
  let listQueries = 0
  prisma.participant.findMany = async ({ select, where }) => {
    listQueries += 1
    assert.equal(where.cohortId, 'cohort')
    assert.equal(where.archivedAt, null)
    assert.deepEqual(where.nickname, { not: null })
    assert.ok(select)
    assert.equal(select.photoUrl, true)
    assert.equal(select.masterData, undefined)
    return [Object.fromEntries(Object.keys(select).map((key) => [key, participant[key]]))]
  }
  prisma.participant.findFirst = async () => participant
  prisma.cohort.findMany = async () => [{ id: 'cohort', name: 'Test cohort' }]
  const app = express()
  app.use('/assessor', assessorRouter)
  app.use(errorHandler)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}/assessor/candidates`
  const initialResponse = await fetch(base)
  assert.equal(initialResponse.status, 200)
  const initial = await initialResponse.json()
  assert.deepEqual(initial.data, [])
  assert.equal(initial.meta.cohorts[0].id, 'cohort')
  assert.equal(listQueries, 0)
  assert.equal((await fetch(`${base}?cohortId=all`)).status, 400)
  assert.equal(listQueries, 0)
  const listResponse = await fetch(`${base}?cohortId=cohort`)
  assert.equal(listResponse.status, 200)
  const listText = await listResponse.text()
  assert.ok(listText.length < participant.photoUrl.length + 2000)
  const list = JSON.parse(listText)
  assert.equal(list.data[0].preWork.status, 'submitted')
  assert.equal(list.data[0].roleInterview.answers, undefined)
  assert.equal(list.data[0].photograph.url, participant.photoUrl)
  assert.equal(list.data[0].preWork.answers, undefined)
  assert.equal(list.meta.cohorts[0].id, 'cohort')
  const detailResponse = await fetch(`${base}/candidate`)
  assert.equal(detailResponse.status, 200)
  const { data } = await detailResponse.json()
  assert.equal(data.photograph.url, participant.photoUrl)
  assert.deepEqual(data.roleInterview.answers, participant.roleInterview.answers)
  assert.deepEqual(data.preWork.answers, participant.preWork.answers)
  assert.equal(data.masterData.jobLevel, 'L3')
})
