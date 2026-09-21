import assert from 'node:assert/strict'
import { test } from 'node:test'
import express from 'express'
import { prisma } from '../db.js'
import { assessorRouter } from './assessor.js'
import { errorHandler } from '../middleware/errorHandler.js'

test('assessor list stays lightweight while candidate details retain evidence', async (t) => {
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
  prisma.participant.findMany = async ({ select }) => {
    assert.ok(select)
    assert.equal(select.photoUrl, undefined)
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
  const listResponse = await fetch(base)
  assert.equal(listResponse.status, 200)
  const listText = await listResponse.text()
  assert.ok(listText.length < 2000)
  const list = JSON.parse(listText)
  assert.equal(list.data[0].preWork.status, 'submitted')
  assert.equal(list.data[0].roleInterview.answers, undefined)
  assert.equal(list.data[0].photograph.url, null)
  assert.equal(list.meta.cohorts[0].id, 'cohort')
  const detailResponse = await fetch(`${base}/candidate`)
  assert.equal(detailResponse.status, 200)
  const { data } = await detailResponse.json()
  assert.equal(data.photograph.url, participant.photoUrl)
  assert.deepEqual(data.roleInterview.answers, participant.roleInterview.answers)
  assert.deepEqual(data.preWork.answers, participant.preWork.answers)
  assert.equal(data.masterData.jobLevel, 'L3')
})
