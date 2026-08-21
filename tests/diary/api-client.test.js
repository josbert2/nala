'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  fetchDiaryData, bulkInsert, addNote, getCards, createCard, updateCard, deleteCard,
  getShares, createShare, createShareFile, deleteShare, getShareFile,
  getTasks, getTask, createTask, updateTask, deleteTask
} = require('../../src/main/diary/api-client')

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

test('getCards: GETs /api/cards and returns the cards array', async () => {
  const server = await startFakeServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ cards: [{ id: 1, texto: 'x', columna: 'todo', posicion: 0 }] }))
  })
  const { port } = server.address()
  const cards = await getCards({ apiUrl: `http://localhost:${port}`, apiToken: 't' })
  assert.deepEqual(cards, [{ id: 1, texto: 'x', columna: 'todo', posicion: 0 }])
  await closeServer(server)
})

test('createCard: POSTs to /api/cards and returns the created card', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, method: req.method, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ card: { id: 1, texto: 'x', columna: 'todo', posicion: 0 } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const card = await createCard(config, { texto: 'x', columna: 'todo' })
  assert.equal(card.id, 1)
  assert.equal(received.url, '/api/cards')
  assert.equal(received.method, 'POST')
  await closeServer(server)
})

test('updateCard: PATCHes /api/cards/:id and returns the updated card', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, method: req.method, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ card: { id: 7, texto: 'x', columna: 'doing', posicion: 2 } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const card = await updateCard(config, 7, { columna: 'doing', posicion: 2 })
  assert.equal(card.columna, 'doing')
  assert.equal(received.url, '/api/cards/7')
  assert.equal(received.method, 'PATCH')
  assert.deepEqual(received.body, { columna: 'doing', posicion: 2 })
  await closeServer(server)
})

test('deleteCard: DELETEs /api/cards/:id and does not try to parse an empty 204 body', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    received = { url: req.url, method: req.method }
    res.statusCode = 204
    res.end()
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  await deleteCard(config, 7)
  assert.equal(received.url, '/api/cards/7')
  assert.equal(received.method, 'DELETE')
  await closeServer(server)
})

test('getShares: GETs /api/shares and returns the shares array', async () => {
  const server = await startFakeServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ shares: [{ id: 1, tipo: 'texto', texto: 'x' }] }))
  })
  const { port } = server.address()
  const shares = await getShares({ apiUrl: `http://localhost:${port}`, apiToken: 't' })
  assert.deepEqual(shares, [{ id: 1, tipo: 'texto', texto: 'x' }])
  await closeServer(server)
})

test('createShare: POSTs JSON (sin archivo) a /api/shares', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, contentType: req.headers['content-type'], body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ share: { id: 1, tipo: 'texto', texto: 'hola' } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const share = await createShare(config, { texto: 'hola' })
  assert.equal(share.tipo, 'texto')
  assert.equal(received.url, '/api/shares')
  assert.ok(received.contentType.startsWith('application/json'))
  assert.deepEqual(received.body, { texto: 'hola' })
  await closeServer(server)
})

test('createShareFile: sube el archivo como multipart/form-data', async () => {
  const filePath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'share-')), 'foto.png')
  fs.writeFileSync(filePath, Buffer.from('contenido de prueba'))

  let received = null
  const server = await startFakeServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      received = { url: req.url, contentType: req.headers['content-type'], body: Buffer.concat(chunks).toString() }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ share: { id: 2, tipo: 'imagen', filename: 'foto.png' } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const share = await createShareFile(config, { filePath, texto: 'una foto' })

  assert.equal(share.filename, 'foto.png')
  assert.equal(received.url, '/api/shares')
  assert.ok(received.contentType.startsWith('multipart/form-data'))
  assert.ok(received.body.includes('foto.png'))
  assert.ok(received.body.includes('contenido de prueba'))
  assert.ok(received.body.includes('una foto'))
  await closeServer(server)
})

test('deleteShare: DELETEs /api/shares/:id', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    received = { url: req.url, method: req.method }
    res.statusCode = 204
    res.end()
  })
  const { port } = server.address()
  await deleteShare({ apiUrl: `http://localhost:${server.address().port}`, apiToken: 't' }, 9)
  assert.equal(received.url, '/api/shares/9')
  assert.equal(received.method, 'DELETE')
  await closeServer(server)
})

test('getShareFile: GETs el archivo binario y lo devuelve en base64 con su mime', async () => {
  const server = await startFakeServer((req, res) => {
    res.setHeader('Content-Type', 'image/png')
    res.end(Buffer.from('bytes-de-la-imagen'))
  })
  const { port } = server.address()
  const result = await getShareFile({ apiUrl: `http://localhost:${port}`, apiToken: 't' }, 3)
  assert.equal(result.mime, 'image/png')
  assert.equal(Buffer.from(result.base64, 'base64').toString(), 'bytes-de-la-imagen')
  await closeServer(server)
})

test('getTasks: GETs /api/tasks and returns the tasks array', async () => {
  const server = await startFakeServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ tasks: [{ id: 1, titulo: 'x', estado: 'todo' }] }))
  })
  const { port } = server.address()
  const tasks = await getTasks({ apiUrl: `http://localhost:${port}`, apiToken: 't' })
  assert.deepEqual(tasks, [{ id: 1, titulo: 'x', estado: 'todo' }])
  await closeServer(server)
})

test('getTask: GETs /api/tasks/:id and returns the task', async () => {
  const server = await startFakeServer((req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ task: { id: 5, titulo: 'x' } }))
  })
  const { port } = server.address()
  const task = await getTask({ apiUrl: `http://localhost:${port}`, apiToken: 't' }, 5)
  assert.equal(task.id, 5)
  await closeServer(server)
})

test('createTask: POSTs to /api/tasks and returns the created task', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, method: req.method, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ task: { id: 1, titulo: 'x' } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const task = await createTask(config, { titulo: 'x', prioridad: 'alta' })
  assert.equal(task.id, 1)
  assert.equal(received.url, '/api/tasks')
  assert.equal(received.method, 'POST')
  assert.deepEqual(received.body, { titulo: 'x', prioridad: 'alta' })
  await closeServer(server)
})

test('updateTask: PATCHes /api/tasks/:id and returns the updated task', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      received = { url: req.url, method: req.method, body: JSON.parse(body) }
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ task: { id: 3, estado: 'done' } }))
    })
  })
  const { port } = server.address()
  const config = { apiUrl: `http://localhost:${port}`, apiToken: 't' }
  const task = await updateTask(config, 3, { estado: 'done' })
  assert.equal(task.estado, 'done')
  assert.equal(received.url, '/api/tasks/3')
  assert.equal(received.method, 'PATCH')
  await closeServer(server)
})

test('deleteTask: DELETEs /api/tasks/:id', async () => {
  let received = null
  const server = await startFakeServer((req, res) => {
    received = { url: req.url, method: req.method }
    res.statusCode = 204
    res.end()
  })
  const { port } = server.address()
  await deleteTask({ apiUrl: `http://localhost:${server.address().port}`, apiToken: 't' }, 8)
  assert.equal(received.url, '/api/tasks/8')
  assert.equal(received.method, 'DELETE')
  await closeServer(server)
})
