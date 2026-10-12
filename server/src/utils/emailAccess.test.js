import test from 'node:test'
import assert from 'node:assert/strict'
import { hasBajajAutoEmail } from './emailAccess.js'

test('recognizes both Bajaj Auto corporate email domains', () => {
  assert.equal(hasBajajAutoEmail('employee@bajajauto.co.in'), true)
  assert.equal(hasBajajAutoEmail('employee@bajajautocredit.com'), true)
  assert.equal(hasBajajAutoEmail(' EMPLOYEE@BAJAJAUTOCREDIT.COM '), true)
})

test('rejects non-corporate and lookalike email domains', () => {
  assert.equal(hasBajajAutoEmail('employee@example.com'), false)
  assert.equal(hasBajajAutoEmail('employee@bajajautocredit.com.example.com'), false)
  assert.equal(hasBajajAutoEmail(null), false)
})
