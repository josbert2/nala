'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { fetchDiaryData, bulkInsert, addNote } = require('../../src/main/diary/api-client')

function startFakeServer (handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler)
    server.listen(0, () => resolve(server))
  })
}

function closeServer (server) {
  return new Promise((resolve) => server.close(resolve))
}

test('fetchDiaryData: combines entries/stats/reports from three endpoints, sends the bearer token', async () => {
  const seenAuth = []
  const server = await startFakeServer((req, res) => {
    seenAuth.push(req.headers.authorization)
    res.setHeader('Content-Type', 'application/json')
    if (req.url === '/api/entries') return res.end(JSON.stringify({ entries: [{ mensaje: 'x' }] }))
    if (req.url === '/api/stats') return res.end(JSON.stringify({ totalEntries: 1 }))
    if (req.url === '/api/reports') return res.end(JSON.stringify({ weeklySummary: 'hola' }))
    res.statusCode = 404
    res.end('{}')
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 'tok123' }

  const data = await fetchDiaryData(config)
  assert.deepEqual(data.entries, [{ mensaje: 'x' }])
  assert.equal(data.stats.totalEntries, 1)
  assert.equal(data.reports.weeklySummary, 'hola')
  assert.ok(seenAuth.every((h) => h === 'Bearer tok123'))

  await closeServer(server)
})

test('fetchDiaryData: throws a clear error when apiUrl is not configured', async () => {
  await assert.rejects(() => fetchDiaryData({ apiUrl: '', apiToken: '' }), /servidor no configurado/)
})

test('fetchDiaryData: throws when the server responds with an error status', async () => {
  const server = await startFakeServer((req, res) => { res.statusCode = 500; res.end('boom') })
  const { port } = server.address()
  await assert.rejects(
    () => fetchDiaryData({ apiUrl: `http://localhost:${port}`, apiToken: 't' }),
    /server respondio 500/
  )
  await closeServer(server)
})

test('bulkInsert: POSTs entries as JSON to /api/entries/bulk', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, method: req.method, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ inserted: 1 }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const result = await bulkInsert(config, [{ hash: 'a' }])
  assert.deepEqual(result, { inserted: 1 })
  assert.equal(received.url, '/api/entries/bulk')
  assert.equal(received.method, 'POST')
  assert.deepEqual(received.body, { entries: [{ hash: 'a' }] })
  await closeServer(server)
})

test('addNote: POSTs the note as JSON to /api/entries', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ entry: { mensaje: 'hola' } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  await addNote(config, { mensaje: 'hola' })
  assert.equal(received.url, '/api/entries')
  assert.deepEqual(received.body, { mensaje: 'hola' })
  await closeServer(server)
})
