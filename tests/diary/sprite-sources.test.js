'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { listSpriteSources } = require('../../src/main/diary/sprite-sources')

function tmpDir () {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sprite-sources-'))
}

test('listSpriteSources: carpeta inexistente devuelve vacio', () => {
  assert.deepEqual(listSpriteSources('/no/existe/esta/carpeta'), [])
})

test('listSpriteSources: solo incluye subcarpetas con metadata.json', () => {
  const dir = tmpDir()
  fs.mkdirSync(path.join(dir, 'con-metadata'))
  fs.writeFileSync(path.join(dir, 'con-metadata', 'metadata.json'), JSON.stringify({ frame_count: 8 }))
  fs.mkdirSync(path.join(dir, 'sin-metadata'))

  const result = listSpriteSources(dir)
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'con-metadata')
  assert.equal(result[0].metadata.frame_count, 8)
})

test('listSpriteSources: salta metadata.json corrupto sin tirar error', () => {
  const dir = tmpDir()
  fs.mkdirSync(path.join(dir, 'corrupta'))
  fs.writeFileSync(path.join(dir, 'corrupta', 'metadata.json'), '{ esto no es json')

  assert.deepEqual(listSpriteSources(dir), [])
})

test('listSpriteSources: ordena alfabeticamente por nombre', () => {
  const dir = tmpDir()
  for (const name of ['zeta', 'alfa', 'beta']) {
    fs.mkdirSync(path.join(dir, name))
    fs.writeFileSync(path.join(dir, name, 'metadata.json'), '{}')
  }
  assert.deepEqual(listSpriteSources(dir).map((s) => s.name), ['alfa', 'beta', 'zeta'])
})
