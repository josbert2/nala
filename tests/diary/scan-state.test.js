'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadScanState, saveScanState } = require('../../src/main/diary/scan-state')

function tempPath () {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'scan-state-')), 'scan-state.json')
}

test('loadScanState: missing file returns empty lastHashes', () => {
  assert.deepEqual(loadScanState(tempPath()), { lastHashes: {} })
})

test('saveScanState + loadScanState: round-trips', () => {
  const p = tempPath()
  const state = { lastHashes: { '/home/jos/root/personal/nala': 'abc123' } }
  saveScanState(p, state)
  assert.deepEqual(loadScanState(p), state)
})

test('loadScanState: corrupt file returns empty lastHashes instead of throwing', () => {
  const p = tempPath()
  fs.writeFileSync(p, 'not json at all {{{')
  assert.deepEqual(loadScanState(p), { lastHashes: {} })
})
