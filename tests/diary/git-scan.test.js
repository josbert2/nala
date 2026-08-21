'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { parseGitLog } = require('../../src/main/diary/git-scan')

const US = '\x1f'

test('parseGitLog: parses one line into an entry', () => {
  const raw = ['abc123', '2026-08-20,17:02', 'Look v4 con animaciones reales'].join(US)
  const entries = parseGitLog(raw, 'nala')
  assert.deepEqual(entries, [{
    hash: 'abc123',
    fecha: '2026-08-20',
    hora: '17:02',
    proyecto: 'nala',
    tipo: 'git',
    mensaje: 'Look v4 con animaciones reales',
    nota: null
  }])
})

test('parseGitLog: parses multiple lines', () => {
  const raw = [
    ['abc123', '2026-08-20,17:02', 'Primero'].join(US),
    ['def456', '2026-08-19,09:03', 'Segundo'].join(US)
  ].join('\n')
  const entries = parseGitLog(raw, 'nala')
  assert.equal(entries.length, 2)
  assert.equal(entries[0].mensaje, 'Primero')
  assert.equal(entries[1].mensaje, 'Segundo')
})

test('parseGitLog: empty output returns empty array', () => {
  assert.deepEqual(parseGitLog('', 'nala'), [])
  assert.deepEqual(parseGitLog('   \n  ', 'nala'), [])
})

test('parseGitLog: commit message containing a colon/pipe is kept as-is', () => {
  const raw = ['abc123', '2026-08-20,17:02', 'fix: layout issue | round two'].join(US)
  const entries = parseGitLog(raw, 'nala')
  assert.equal(entries[0].mensaje, 'fix: layout issue | round two')
})
