import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReportTokens } from './generate360Report.js'

function task(id, ratings, relationship = 'PEER', status = 'SUBMITTED') {
  return { id, relationship, status, responses: [{ ratings }] }
}

function tokens(feedbackTasks) {
  return buildReportTokens({ user: { name: 'Test participant' }, nominees: [], feedbackTasks })
}

test('overall rounds the raw mean once, independently of displayed behaviour rows', () => {
  const result = tokens([
    task('1', { 'gi-1': 1, 'gi-2': 1, 'gi-3': 2 }),
    task('2', { 'gi-1': 1, 'gi-2': 1, 'gi-3': 2 }),
    task('3', { 'gi-1': 1, 'gi-2': 2, 'gi-3': 3 }),
  ])
  assert.deepEqual([result.s01_peer, result.s02_peer, result.s03_peer], ['1.0', '1.3', '2.3'])
  assert.equal(result.gi_ov_peer, '1.6') // 14 / 9, not (1.0 + 1.3 + 2.3) / 3
  assert.equal(result.gi_ov_others, '1.6')
  assert.equal(result.ov_gi_others, '1.6')
})

test('overall weights every raw rating equally when behaviour response counts differ', () => {
  const result = tokens([
    task('1', { 'gi-1': 4, 'gi-2': 1, 'gi-3': 1 }),
    task('2', { 'gi-1': 4, 'gi-2': 1, 'gi-3': 1 }),
    task('3', { 'gi-1': 4 }),
    task('self', { 'gi-1': 4, 'gi-2': 4, 'gi-3': 4 }, 'SELF'),
    task('draft', { 'gi-1': 1 }, 'PEER', 'SAVED'),
  ])
  assert.equal(result.gi_ov_peer, '2.3') // 16 / 7; mean of behaviour means would be 2.0
  assert.equal(result.gi_ov_others, '2.3')
  assert.equal(result.ov_gi_others, '2.3')
  assert.equal(result.gi_ov_self, '4.0')
})

test('empty and confidential respondent groups remain suppressed', () => {
  const empty = tokens([])
  assert.equal(empty.gi_ov_others, '')
  const result = tokens([task('1', { 'gi-1': 4, 'gi-2': 4, 'gi-3': 4 })])
  assert.equal(result.gi_ov_peer, '')
  assert.equal(result.gi_ov_others, '')
  assert.equal(result.gi_ov_dr, 'NA')
})
