'use strict'
const fs = require('fs')
const path = require('path')

function loadScanState (statePath) {
  try {
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    return { lastHashes: data.lastHashes || {} }
  } catch (err) {
    return { lastHashes: {} }
  }
}

function saveScanState (statePath, state) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true })
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2))
}

module.exports = { loadScanState, saveScanState }
