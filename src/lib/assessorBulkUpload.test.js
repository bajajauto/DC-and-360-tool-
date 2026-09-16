import test from 'node:test'
import assert from 'node:assert/strict'
import { matchAssessorFiles, processAssessorEntry, removeAssessorEntry } from './assessorBulkUpload.js'

const participant = { participantId: 'p1', employeeId: 'BAL48853', name: 'Employee', cohort: 'August' }
const file = (name, size = 100) => ({ name, size })

test('removing a duplicate makes the remaining workbook eligible and preserves completed results', () => {
  const entries = matchAssessorFiles([file('Aug26_BAL48853.xlsx'), file('DC_BAL48853.xlsx')], [participant])
  const completed = { id: 9, file: file('DC_OTHER.xlsx'), status: 'done', detail: 'Saved' }
  const remaining = removeAssessorEntry([...entries, completed], entries[0].id, [participant])
  assert.equal(remaining.length, 2)
  assert.equal(remaining[0].id, entries[1].id)
  assert.equal(remaining[0].status, 'ready')
  assert.equal(remaining[0].detail, '')
  assert.deepEqual(remaining[1], completed)
  assert.deepEqual(removeAssessorEntry([entries[0]], entries[0].id, [participant]), [])
})

test('matches both naming conventions case-insensitively by exact employee ID', () => {
  for (const name of ['Aug26_BAL48853.xlsx', 'DC_BAL48853.xlsx', 'aug26_bal48853.XLSX']) {
    const [entry] = matchAssessorFiles([file(name)], [participant])
    assert.equal(entry.status, 'ready')
    assert.equal(entry.participant.participantId, 'p1')
  }
  assert.equal(matchAssessorFiles([file('DC_BAL4885.xlsx')], [participant])[0].status, 'blocked')
})

test('blocks duplicate files, ambiguous participants, invalid names, empty and oversized files', () => {
  assert.ok(matchAssessorFiles([file('Aug26_BAL48853.xlsx'), file('DC_BAL48853.xlsx')], [participant]).every((entry) => entry.status === 'blocked'))
  assert.equal(matchAssessorFiles([file('DC_BAL48853.xlsx')], [participant, { ...participant, participantId: 'p2' }])[0].status, 'blocked')
  for (const invalid of [file('notes.txt'), file('~$DC_BAL48853.xlsx'), file('DC_BAL48853.xlsx', 0), file('DC_BAL48853.xlsx', 7_000_001)]) {
    assert.equal(matchAssessorFiles([invalid], [participant])[0].status, 'blocked')
  }
})

test('publishes saved workbook before report failure and retries only report generation', async () => {
  const [entry] = matchAssessorFiles([file('DC_BAL48853.xlsx')], [participant])
  const events = []
  let uploads = 0
  const handlers = {
    readFile: async () => 'data:application/test;base64,YQ==',
    upload: async () => { uploads++; return { data: { workbook: { fileName: entry.file.name } } } },
    onUploaded: (id) => events.push(`saved:${id}`),
    onStatus: (status) => events.push(status),
    generate: async () => { throw new Error('Report unavailable') },
  }
  await processAssessorEntry(entry, handlers)
  assert.deepEqual(events, ['uploading', 'saved:p1', 'generating', 'report-error'])
  await processAssessorEntry({ ...entry, status: 'report-error' }, { ...handlers, generate: async () => {} })
  assert.equal(uploads, 1)
  assert.equal(events.at(-1), 'done')
})

test('upload failure does not generate a report or mark workbook saved', async () => {
  const [entry] = matchAssessorFiles([file('DC_BAL48853.xlsx')], [participant])
  const statuses = []
  await processAssessorEntry(entry, {
    readFile: async () => '',
    upload: async () => { throw new Error('Upload unavailable') },
    generate: () => assert.fail('Report must not run'),
    onUploaded: () => assert.fail('Workbook must not be marked saved'),
    onStatus: (status) => statuses.push(status),
  })
  assert.deepEqual(statuses, ['uploading', 'upload-error'])
})
