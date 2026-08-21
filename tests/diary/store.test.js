'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadDiary, saveDiary, appendEntries, addManualNote } = require('../../src/main/diary/store')

function tempPath () {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'diary-')), 'diario.json')
}

test('loadDiary: missing file returns empty diary', () => {
  const p = tempPath()
  assert.deepEqual(loadDiary(p), { entries: [], lastHashes: {} })
})

test('saveDiary + loadDiary: round-trips', () => {
  const p = tempPath()
  const diary = { entries: [{ hash: 'a', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', tipo: 'git', mensaje: 'x', nota: null }], lastHashes: { '/repo': 'a' } }
  saveDiary(p, diary)
  assert.deepEqual(loadDiary(p), diary)
})

test('appendEntries: adds new entries, skips ones with an already-seen hash', () => {
  const diary = { entries: [{ hash: 'a', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', tipo: 'git', mensaje: 'x', nota: null }], lastHashes: {} }
  const incoming = [
    { hash: 'a', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', tipo: 'git', mensaje: 'x', nota: null },
    { hash: 'b', fecha: '2026-08-21', hora: '11:00', proyecto: 'nala', tipo: 'git', mensaje: 'y', nota: null }
  ]
  const updated = appendEntries(diary, incoming)
  assert.equal(updated.entries.length, 2)
  assert.equal(updated.entries[1].hash, 'b')
})

test('addManualNote: appends a manual entry with today\'s date and no hash', () => {
  const diary = { entries: [], lastHashes: {} }
  const updated = addManualNote(diary, { mensaje: 'Nota de prueba' })
  assert.equal(updated.entries.length, 1)
  const entry = updated.entries[0]
  assert.equal(entry.tipo, 'manual')
  assert.equal(entry.mensaje, 'Nota de prueba')
  assert.equal(entry.hash, null)
  assert.equal(entry.proyecto, null)
  assert.match(entry.fecha, /^\d{4}-\d{2}-\d{2}$/)
  assert.match(entry.hora, /^\d{2}:\d{2}$/)
})
