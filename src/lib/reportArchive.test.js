import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prepareReportArchive } from './reportArchive.js'

const reports = ['one', 'two'].map((participantId) => ({ participantId, participantName: participantId, reportType: 'dc' }))
const pdf = (report) => ({ fileName: `${report.participantId}.pdf`, data: new Uint8Array([1, 2, 3]).buffer })

test('retries transient failures sequentially without duplicate ZIP entries', async () => {
  const calls = [], progress = []
  const { entries } = await prepareReportArchive(reports, async (report) => {
    calls.push(report.participantId)
    if (calls.length === 1) throw new Error('Page 5 took too long to render.')
    return pdf(report)
  }, (value) => progress.push(value), async () => {})
  assert.deepEqual(calls, ['one', 'one', 'two'])
  assert.deepEqual(entries.map((entry) => entry.name), ['one.pdf', 'two.pdf'])
  assert.equal(progress.at(-1).completed, 2)
  assert.equal(progress[1].attempt, 2)
})

test('keeps successful PDFs and lists failures after three attempts', async () => {
  let failedAttempts = 0
  const { entries, failures } = await prepareReportArchive(reports, async (report) => {
    if (report.participantId === 'two') {
      failedAttempts += 1
      throw new Error('Page 19 took too long to render.')
    }
    return pdf(report)
  }, undefined, async () => {})
  assert.equal(entries.length, 1)
  assert.match(failures[0], /two \(DC\): Page 19/)
  assert.equal(failedAttempts, 3)
})

test('does not accept an empty PDF as a successful report', async () => {
  const { entries, failures } = await prepareReportArchive(reports.slice(0, 1), async () => ({ data: new ArrayBuffer(0), fileName: 'empty.pdf' }), undefined, async () => {})
  assert.equal(entries.length, 0)
  assert.match(failures[0], /rendered PDF was empty/)
})
