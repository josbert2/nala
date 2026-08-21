# Dev Diary Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, dockerized Node/Express + MySQL server that stores and serves the Dev Diary's entries over a token-authenticated REST API, so it can become the shared source of truth across Josbert's machines (the Nala app itself is retrofitted to use it in a separate, later plan).

**Architecture:** A brand-new git repo at `~/root/personal/nala-diary-server`. Two docker-compose services (`mysql`, `api`). The API is Express with a thin route layer over a small repository module (`entries-repo.js`) that talks to MySQL via `mysql2`, no ORM. The stats/reports computation logic is copied verbatim from the already-shipped, already-tested `nala/src/main/diary/{stats,reports}.js` — pure functions, zero changes needed to adopt them server-side.

**Tech Stack:** Node.js 20, Express 4, `mysql2` (promise API), MySQL 8, Docker Compose, `node:test` for tests (Node's built-in test runner, same as the Nala app — no new test framework dependency).

---

## File Structure

```
nala-diary-server/
  .gitignore
  .env.example
  docker-compose.yml
  migrations/
    001_create_entries.sql
  api/
    Dockerfile
    package.json
    src/
      db.js                     # mysql2 pool factory
      index.js                  # Express app assembly + entrypoint
      middleware/auth.js        # bearer-token check
      repositories/entries-repo.js  # all SQL lives here
      routes/entries.js
      routes/stats.js
      routes/reports.js
      lib/stats.js              # copied verbatim from nala/src/main/diary/stats.js
      lib/reports.js            # copied verbatim from nala/src/main/diary/reports.js
    tests/
      helpers/db.js             # truncates the entries table between tests
      lib-stats.test.js
      lib-reports.test.js
      auth.test.js
      entries-repo.test.js      # integration, real MySQL
      routes.test.js            # integration, real MySQL, through createApp()
```

Deviation from the spec's sketch, disclosed here: the spec's file list didn't show a `repositories/` layer or put `tests/` inside `api/`. Both are small, sensible refinements — `entries-repo.js` keeps SQL out of the HTTP route handlers (one clear responsibility per file), and `tests/` lives inside `api/` because that's the only directory with a `package.json`/`node_modules` — `node --test` is meant to be run from there.

---

### Task 1: Project scaffold

**Files:**
- Create: `~/root/personal/nala-diary-server/.gitignore`
- Create: `~/root/personal/nala-diary-server/.env.example`
- Create: `~/root/personal/nala-diary-server/api/package.json`

- [ ] **Step 1: Create the project directory and git repo**

```bash
mkdir -p ~/root/personal/nala-diary-server/api/src/{middleware,repositories,routes,lib}
mkdir -p ~/root/personal/nala-diary-server/api/tests/helpers
mkdir -p ~/root/personal/nala-diary-server/migrations
cd ~/root/personal/nala-diary-server
git init
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
.env
*.log
```

- [ ] **Step 3: Write `.env.example`**

```
MYSQL_ROOT_PASSWORD=changeme
MYSQL_DATABASE=nala_diary
API_TOKEN=changeme-generate-a-long-random-token
API_PORT=3000
```

- [ ] **Step 4: Write `api/package.json`**

```json
{
  "name": "nala-diary-server-api",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mysql2": "^3.11.0"
  }
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd ~/root/personal/nala-diary-server/api && npm install`
Expected: creates `node_modules/` and `package-lock.json`, no errors.

- [ ] **Step 6: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add .gitignore .env.example api/package.json api/package-lock.json
git commit -m "scaffold: project skeleton, package.json, gitignore"
```

---

### Task 2: `lib/stats.js` — ported from Nala, verbatim

**Files:**
- Create: `api/src/lib/stats.js`
- Test: `api/tests/lib-stats.test.js`

This is a direct port of `nala/src/main/diary/stats.js` — already implemented and reviewed in the Nala app. No logic changes, just the new location. Still following TDD form (write the test first) so the port is verified in this repo too, not just trusted from the source project.

- [ ] **Step 1: Write the test**

`api/tests/lib-stats.test.js`:

```javascript
'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { computeStats, computeStreak, computeHeatmap } = require('../src/lib/stats')

test('computeHeatmap: counts entries per day', () => {
  const entries = [
    { fecha: '2026-08-20' }, { fecha: '2026-08-20' }, { fecha: '2026-08-19' }
  ]
  assert.deepEqual(computeHeatmap(entries), { '2026-08-20': 2, '2026-08-19': 1 })
})

test('computeStreak: counts consecutive days ending today', () => {
  const days = ['2026-08-18', '2026-08-19', '2026-08-20']
  assert.equal(computeStreak(days, '2026-08-20'), 3)
})

test('computeStreak: today with no entry yet still counts yesterday\'s streak', () => {
  const days = ['2026-08-18', '2026-08-19']
  assert.equal(computeStreak(days, '2026-08-20'), 2)
})

test('computeStreak: a gap breaks the streak', () => {
  const days = ['2026-08-15', '2026-08-19', '2026-08-20']
  assert.equal(computeStreak(days, '2026-08-20'), 2)
})

test('computeStreak: no entries at all is a streak of 0', () => {
  assert.equal(computeStreak([], '2026-08-20'), 0)
})

test('computeStreak: last entry two days ago is a streak of 0', () => {
  assert.equal(computeStreak(['2026-08-17'], '2026-08-20'), 0)
})

test('computeStreak: result is independent of the local timezone (regression for addDays UTC bug)', () => {
  const originalTz = process.env.TZ
  try {
    process.env.TZ = 'Australia/Sydney'
    const days = ['2026-08-18', '2026-08-19', '2026-08-20']
    assert.equal(computeStreak(days, '2026-08-20'), 3)
  } finally {
    if (originalTz === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTz
    }
  }
})

test('computeStats: combines totals, active days and streak', () => {
  const entries = [
    { fecha: '2026-08-19' }, { fecha: '2026-08-19' }, { fecha: '2026-08-20' }
  ]
  const stats = computeStats(entries, '2026-08-20')
  assert.equal(stats.totalEntries, 3)
  assert.equal(stats.activeDays, 2)
  assert.equal(stats.streak, 2)
  assert.deepEqual(stats.heatmap, { '2026-08-19': 2, '2026-08-20': 1 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/lib-stats.test.js`
Expected: FAIL — `Cannot find module '../src/lib/stats'`

- [ ] **Step 3: Write the implementation**

`api/src/lib/stats.js`:

```javascript
'use strict'

function addDays (isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + delta)
  return utc.toISOString().slice(0, 10)
}

function computeHeatmap (entries) {
  const counts = {}
  for (const e of entries) {
    counts[e.fecha] = (counts[e.fecha] || 0) + 1
  }
  return counts
}

// If today has no entry yet, count from yesterday's streak instead of showing 0 —
// an entry can still be logged later today without the streak flickering to zero.
function computeStreak (days, today = new Date().toISOString().slice(0, 10)) {
  const daySet = new Set(days)
  if (daySet.size === 0) return 0
  let cursor = daySet.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (daySet.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

function computeStats (entries, today = new Date().toISOString().slice(0, 10)) {
  const heatmap = computeHeatmap(entries)
  const days = Object.keys(heatmap).sort()
  return {
    totalEntries: entries.length,
    activeDays: days.length,
    streak: computeStreak(days, today),
    heatmap
  }
}

module.exports = { computeHeatmap, computeStreak, computeStats }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/lib-stats.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/src/lib/stats.js api/tests/lib-stats.test.js
git commit -m "lib: port stats.js from nala, verbatim"
```

---

### Task 3: `lib/reports.js` — ported from Nala, verbatim

**Files:**
- Create: `api/src/lib/reports.js`
- Test: `api/tests/lib-reports.test.js`

- [ ] **Step 1: Write the test**

`api/tests/lib-reports.test.js`:

```javascript
'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { commitsByProject, commitsByDay, activeHours, weeklySummary } = require('../src/lib/reports')

const SAMPLE = [
  { fecha: '2026-08-20', hora: '09:30', proyecto: 'nala', tipo: 'git', mensaje: 'a' },
  { fecha: '2026-08-20', hora: '14:10', proyecto: 'nala', tipo: 'git', mensaje: 'b' },
  { fecha: '2026-08-19', hora: '21:00', proyecto: 'erp-mobile', tipo: 'git', mensaje: 'c' },
  { fecha: '2026-08-18', hora: '10:00', proyecto: null, tipo: 'manual', mensaje: 'nota' }
]

test('commitsByProject: counts and sorts descending, ignores entries with no project', () => {
  assert.deepEqual(commitsByProject(SAMPLE), [
    { proyecto: 'nala', count: 2 },
    { proyecto: 'erp-mobile', count: 1 }
  ])
})

test('commitsByDay: returns a bucket per day for the requested range, in order', () => {
  const buckets = commitsByDay(SAMPLE, 3, '2026-08-20')
  assert.deepEqual(buckets, [
    { fecha: '2026-08-18', count: 1 },
    { fecha: '2026-08-19', count: 1 },
    { fecha: '2026-08-20', count: 2 }
  ])
})

test('activeHours: buckets into manana/tarde/noche', () => {
  assert.deepEqual(activeHours(SAMPLE), { manana: 2, tarde: 1, noche: 1 })
})

test('activeHours: entries without hora are ignored', () => {
  assert.deepEqual(activeHours([{ hora: null }]), { manana: 0, tarde: 0, noche: 0 })
})

test('weeklySummary: mentions commit count, project count and busiest slot', () => {
  const text = weeklySummary(SAMPLE, '2026-08-20')
  assert.match(text, /4 commits/)
  assert.match(text, /2 proyectos/)
  assert.match(text, /la mañana/)
})

test('weeklySummary: singular "proyecto" when there is exactly one', () => {
  const oneProject = [{ fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', tipo: 'git', mensaje: 'a' }]
  const text = weeklySummary(oneProject, '2026-08-20')
  assert.match(text, /1 commits en 1 proyecto\./)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/lib-reports.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

`api/src/lib/reports.js`:

```javascript
'use strict'

function addDays (isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + delta)
  return utc.toISOString().slice(0, 10)
}

function commitsByProject (entries) {
  const counts = {}
  for (const e of entries) {
    if (!e.proyecto) continue
    counts[e.proyecto] = (counts[e.proyecto] || 0) + 1
  }
  return Object.entries(counts)
    .map(([proyecto, count]) => ({ proyecto, count }))
    .sort((a, b) => b.count - a.count)
}

function commitsByDay (entries, days = 7, today = new Date().toISOString().slice(0, 10)) {
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const fecha = addDays(today, -i)
    const count = entries.filter((e) => e.fecha === fecha).length
    buckets.push({ fecha, count })
  }
  return buckets
}

function activeHours (entries) {
  const buckets = { manana: 0, tarde: 0, noche: 0 }
  for (const e of entries) {
    if (!e.hora) continue
    const hour = parseInt(e.hora.split(':')[0], 10)
    if (hour >= 6 && hour < 12) buckets.manana++
    else if (hour >= 12 && hour < 20) buckets.tarde++
    else buckets.noche++
  }
  return buckets
}

function weeklySummary (entries, today = new Date().toISOString().slice(0, 10)) {
  const weekAgo = addDays(today, -6)
  const weekEntries = entries.filter((e) => e.fecha >= weekAgo && e.fecha <= today)
  const commitCount = weekEntries.length
  const projectCount = new Set(weekEntries.map((e) => e.proyecto).filter(Boolean)).size
  const hours = activeHours(weekEntries)
  const topSlot = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]
  const slotNames = { manana: 'la mañana', tarde: 'la tarde', noche: 'la noche' }
  const horario = topSlot && topSlot[1] > 0 ? slotNames[topSlot[0]] : 'sin datos suficientes'
  return `Esta semana: ${commitCount} commits en ${projectCount} proyecto${projectCount === 1 ? '' : 's'}. Tu horario fuerte: ${horario}.`
}

module.exports = { commitsByProject, commitsByDay, activeHours, weeklySummary }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/lib-reports.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/src/lib/reports.js api/tests/lib-reports.test.js
git commit -m "lib: port reports.js from nala, verbatim"
```

---

### Task 4: Auth middleware

**Files:**
- Create: `api/src/middleware/auth.js`
- Test: `api/tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

`api/tests/auth.test.js`:

```javascript
'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { isAuthorized } = require('../src/middleware/auth')

test('isAuthorized: true when the Bearer token matches exactly', () => {
  assert.equal(isAuthorized('Bearer secret123', 'secret123'), true)
})

test('isAuthorized: false when the token does not match', () => {
  assert.equal(isAuthorized('Bearer wrong', 'secret123'), false)
})

test('isAuthorized: false when the header is missing', () => {
  assert.equal(isAuthorized(undefined, 'secret123'), false)
})

test('isAuthorized: false when the scheme is not Bearer', () => {
  assert.equal(isAuthorized('Basic secret123', 'secret123'), false)
})

test('isAuthorized: false when the expected token is not configured', () => {
  assert.equal(isAuthorized('Bearer secret123', undefined), false)
})

test('isAuthorized: false when the header has no token part', () => {
  assert.equal(isAuthorized('Bearer', 'secret123'), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/auth.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

`api/src/middleware/auth.js`:

```javascript
'use strict'

function isAuthorized (authHeader, expectedToken) {
  if (!authHeader || !expectedToken) return false
  const [scheme, token] = authHeader.split(' ')
  return scheme === 'Bearer' && !!token && token === expectedToken
}

function requireAuth (req, res, next) {
  if (isAuthorized(req.headers.authorization, process.env.API_TOKEN)) return next()
  res.status(401).json({ error: 'no autorizado' })
}

module.exports = { isAuthorized, requireAuth }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/auth.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/src/middleware/auth.js api/tests/auth.test.js
git commit -m "auth: bearer token middleware"
```

---

### Task 5: Database schema + connection pool

**Files:**
- Create: `migrations/001_create_entries.sql`
- Create: `api/src/db.js`

No test for `db.js` itself here (it's a thin pool factory with no logic beyond reading env vars — it gets exercised for real in Task 6's integration tests, which need a real MySQL connection anyway).

- [ ] **Step 1: Write the schema**

`migrations/001_create_entries.sql`:

```sql
CREATE TABLE IF NOT EXISTS entries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  hash VARCHAR(40) NULL UNIQUE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  proyecto VARCHAR(255) NULL,
  tipo ENUM('git', 'manual') NOT NULL,
  mensaje TEXT NOT NULL,
  nota TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entries_fecha_hora (fecha, hora)
);
```

- [ ] **Step 2: Write the pool factory**

`api/src/db.js`:

```javascript
'use strict'
const mysql = require('mysql2/promise')

let pool = null

/**
 * Un solo pool para todo el proceso. `dateStrings: true` evita que mysql2
 * devuelva las columnas DATE/TIME como objetos Date de JS (que arrastran zona
 * horaria) — las devuelve como strings 'YYYY-MM-DD'/'HH:MM:SS' tal cual estan
 * en la base, que es el shape que ya esperan lib/stats.js y lib/reports.js.
 */
function getPool () {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'nala_diary',
      waitForConnections: true,
      connectionLimit: 5,
      dateStrings: true
    })
  }
  return pool
}

module.exports = { getPool }
```

- [ ] **Step 3: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add migrations/001_create_entries.sql api/src/db.js
git commit -m "db: entries table schema and mysql2 pool factory"
```

---

### Task 6: `entries-repo.js` — all SQL access

**Files:**
- Create: `api/src/repositories/entries-repo.js`
- Create: `api/tests/helpers/db.js`
- Test: `api/tests/entries-repo.test.js`

**This task needs a real, running MySQL** — it's an integration test, same philosophy as `nala/tests/diary/scan-repos.test.js` using real temp git repos instead of mocking `git`. Before running these tests, MySQL must be up:

```bash
cd ~/root/personal/nala-diary-server
cp .env.example .env
# edit .env if you want, defaults are fine for local dev
docker compose up -d mysql
```

(`docker-compose.yml` doesn't exist until Task 8 — for THIS task, start a throwaway MySQL container directly so the tests have something to talk to:)

```bash
docker run -d --name nala-diary-test-mysql \
  -e MYSQL_ROOT_PASSWORD=testpass \
  -e MYSQL_DATABASE=nala_diary_test \
  -p 3307:3306 \
  -v ~/root/personal/nala-diary-server/migrations:/docker-entrypoint-initdb.d \
  mysql:8
```

Wait for it to be ready (first boot takes ~20-30s while it runs the migration):

```bash
until docker exec nala-diary-test-mysql mysqladmin ping -h localhost -uroot -ptestpass --silent; do sleep 2; done
```

Export the env vars the tests (and `db.js`) will read:

```bash
export MYSQL_HOST=localhost
export MYSQL_PORT=3307
export MYSQL_USER=root
export MYSQL_PASSWORD=testpass
export MYSQL_DATABASE=nala_diary_test
```

- [ ] **Step 1: Write the test-isolation helper**

`api/tests/helpers/db.js`:

```javascript
'use strict'

async function resetDb (pool) {
  await pool.query('TRUNCATE TABLE entries')
}

module.exports = { resetDb }
```

- [ ] **Step 2: Write the failing test**

`api/tests/entries-repo.test.js`:

```javascript
'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { getPool } = require('../src/db')
const { resetDb } = require('./helpers/db')
const { listEntries, insertManualEntry, insertBulkEntries } = require('../src/repositories/entries-repo')

const pool = getPool()

test.beforeEach(async () => { await resetDb(pool) })
test.after(async () => { await pool.end() })

test('listEntries: empty table returns an empty array', async () => {
  assert.deepEqual(await listEntries(pool), [])
})

test('insertManualEntry: creates a manual entry with no hash and returns it', async () => {
  const entry = await insertManualEntry(pool, { mensaje: 'Nota de prueba' })
  assert.equal(entry.hash, null)
  assert.equal(entry.tipo, 'manual')
  assert.equal(entry.mensaje, 'Nota de prueba')
  assert.equal(entry.proyecto, null)
  assert.match(entry.fecha, /^\d{4}-\d{2}-\d{2}$/)
  assert.match(entry.hora, /^\d{2}:\d{2}$/)

  const all = await listEntries(pool)
  assert.equal(all.length, 1)
  assert.equal(all[0].mensaje, 'Nota de prueba')
})

test('insertBulkEntries: inserts new git entries and returns how many were actually inserted', async () => {
  const inserted = await insertBulkEntries(pool, [
    { hash: 'aaa111', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'Primer commit' },
    { hash: 'bbb222', fecha: '2026-08-20', hora: '11:00', proyecto: 'nala', mensaje: 'Segundo commit' }
  ])
  assert.equal(inserted, 2)

  const all = await listEntries(pool)
  assert.equal(all.length, 2)
})

test('insertBulkEntries: ignores entries whose hash was already seen, does not throw', async () => {
  await insertBulkEntries(pool, [
    { hash: 'aaa111', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'Primer commit' }
  ])
  const secondPass = await insertBulkEntries(pool, [
    { hash: 'aaa111', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'Primer commit' },
    { hash: 'ccc333', fecha: '2026-08-21', hora: '09:00', proyecto: 'nala', mensaje: 'Tercer commit' }
  ])
  assert.equal(secondPass, 1)

  const all = await listEntries(pool)
  assert.equal(all.length, 2)
})

test('insertBulkEntries: an empty array is a no-op', async () => {
  assert.equal(await insertBulkEntries(pool, []), 0)
})

test('listEntries: orders newest first by fecha then hora', async () => {
  await insertBulkEntries(pool, [
    { hash: 'a', fecha: '2026-08-19', hora: '10:00', proyecto: 'nala', mensaje: 'viejo' },
    { hash: 'b', fecha: '2026-08-20', hora: '09:00', proyecto: 'nala', mensaje: 'medio' },
    { hash: 'c', fecha: '2026-08-20', hora: '15:00', proyecto: 'nala', mensaje: 'nuevo' }
  ])
  const all = await listEntries(pool)
  assert.deepEqual(all.map((e) => e.mensaje), ['nuevo', 'medio', 'viejo'])
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/entries-repo.test.js`
Expected: FAIL — `Cannot find module '../src/repositories/entries-repo'`

- [ ] **Step 4: Write the implementation**

`api/src/repositories/entries-repo.js`:

```javascript
'use strict'

function normalizeRow (row) {
  return {
    hash: row.hash,
    fecha: row.fecha,
    hora: row.hora.slice(0, 5),
    proyecto: row.proyecto,
    tipo: row.tipo,
    mensaje: row.mensaje,
    nota: row.nota
  }
}

async function listEntries (pool) {
  const [rows] = await pool.query(
    'SELECT hash, fecha, hora, proyecto, tipo, mensaje, nota FROM entries ORDER BY fecha DESC, hora DESC'
  )
  return rows.map(normalizeRow)
}

/** `iso` es un new Date().toISOString() completo, ej '2026-08-21T14:23:45.678Z'. */
function splitIso (iso) {
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) }
}

async function insertManualEntry (pool, { mensaje, proyecto = null }) {
  const { fecha, hora } = splitIso(new Date().toISOString())
  await pool.query(
    'INSERT INTO entries (hash, fecha, hora, proyecto, tipo, mensaje, nota) VALUES (NULL, ?, ?, ?, ?, ?, NULL)',
    [fecha, hora, proyecto, 'manual', mensaje]
  )
  return { hash: null, fecha, hora, proyecto, tipo: 'manual', mensaje, nota: null }
}

async function insertBulkEntries (pool, entries) {
  if (!entries.length) return 0
  const values = entries.map((e) => [e.hash, e.fecha, e.hora, e.proyecto || null, 'git', e.mensaje, null])
  const [result] = await pool.query(
    'INSERT IGNORE INTO entries (hash, fecha, hora, proyecto, tipo, mensaje, nota) VALUES ?',
    [values]
  )
  return result.affectedRows
}

module.exports = { listEntries, insertManualEntry, insertBulkEntries }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/entries-repo.test.js`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/src/repositories/entries-repo.js api/tests/helpers/db.js api/tests/entries-repo.test.js
git commit -m "repo: entries-repo with list/insert/bulk-insert against MySQL"
```

---

### Task 7: Routes + Express app assembly

**Files:**
- Create: `api/src/routes/entries.js`
- Create: `api/src/routes/stats.js`
- Create: `api/src/routes/reports.js`
- Create: `api/src/index.js`
- Test: `api/tests/routes.test.js`

Keep the test MySQL from Task 6 running and the same env vars exported — this task's tests go through the real HTTP layer (`createApp()` + `app.listen(0)` for a random port, then real `fetch()` calls), backed by the same real database.

- [ ] **Step 1: Write the failing test**

`api/tests/routes.test.js`:

```javascript
'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { getPool } = require('../src/db')
const { resetDb } = require('./helpers/db')
const { createApp } = require('../src/index')

process.env.API_TOKEN = 'test-token'
const pool = getPool()
const app = createApp()
let server, baseUrl

test.before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://localhost:${server.address().port}`
})
test.beforeEach(async () => { await resetDb(pool) })
test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
})

function authed (path, opts = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: 'Bearer test-token' }
  })
}

test('GET /api/health: works with no auth', async () => {
  const res = await fetch(`${baseUrl}/api/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('GET /api/entries: 401 without a token', async () => {
  const res = await fetch(`${baseUrl}/api/entries`)
  assert.equal(res.status, 401)
})

test('GET /api/entries: 401 with the wrong token', async () => {
  const res = await fetch(`${baseUrl}/api/entries`, { headers: { Authorization: 'Bearer wrong' } })
  assert.equal(res.status, 401)
})

test('GET /api/entries: empty list when there is no data', async () => {
  const res = await authed('/api/entries')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { entries: [] })
})

test('POST /api/entries: creates a manual note', async () => {
  const res = await authed('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje: 'Nota via API' })
  })
  assert.equal(res.status, 201)
  const { entry } = await res.json()
  assert.equal(entry.mensaje, 'Nota via API')
  assert.equal(entry.tipo, 'manual')

  const list = await (await authed('/api/entries')).json()
  assert.equal(list.entries.length, 1)
})

test('POST /api/entries: 400 when mensaje is missing or blank', async () => {
  const res = await authed('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje: '   ' })
  })
  assert.equal(res.status, 400)
})

test('POST /api/entries/bulk: inserts, dedupes by hash, reports the real count', async () => {
  const body = {
    entries: [
      { hash: 'h1', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'uno' },
      { hash: 'h2', fecha: '2026-08-20', hora: '11:00', proyecto: 'nala', mensaje: 'dos' }
    ]
  }
  const first = await authed('/api/entries/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  assert.deepEqual(await first.json(), { inserted: 2 })

  const second = await authed('/api/entries/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  assert.deepEqual(await second.json(), { inserted: 0 })
})

test('GET /api/stats: reflects the entries currently stored', async () => {
  await authed('/api/entries/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: [
      { hash: 'h1', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'uno' }
    ] })
  })
  const stats = await (await authed('/api/stats')).json()
  assert.equal(stats.totalEntries, 1)
  assert.equal(stats.activeDays, 1)
})

test('GET /api/reports: reflects the entries currently stored', async () => {
  await authed('/api/entries/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries: [
      { hash: 'h1', fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', mensaje: 'uno' }
    ] })
  })
  const reports = await (await authed('/api/reports')).json()
  assert.deepEqual(reports.byProject, [{ proyecto: 'nala', count: 1 }])
  assert.ok(reports.weeklySummary.includes('1 commits'))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/routes.test.js`
Expected: FAIL — `Cannot find module '../src/index'`

- [ ] **Step 3: Write the route files**

`api/src/routes/entries.js`:

```javascript
'use strict'
const express = require('express')
const { listEntries, insertManualEntry, insertBulkEntries } = require('../repositories/entries-repo')

function entriesRouter (pool) {
  const router = express.Router()

  router.get('/', async (req, res, next) => {
    try {
      res.json({ entries: await listEntries(pool) })
    } catch (err) {
      next(err)
    }
  })

  router.post('/', async (req, res, next) => {
    try {
      const { mensaje, proyecto } = req.body || {}
      if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
        return res.status(400).json({ error: 'mensaje es requerido' })
      }
      const entry = await insertManualEntry(pool, { mensaje: mensaje.trim(), proyecto: proyecto || null })
      res.status(201).json({ entry })
    } catch (err) {
      next(err)
    }
  })

  router.post('/bulk', async (req, res, next) => {
    try {
      const entries = (req.body && req.body.entries) || []
      if (!Array.isArray(entries)) {
        return res.status(400).json({ error: 'entries debe ser un array' })
      }
      const inserted = await insertBulkEntries(pool, entries)
      res.json({ inserted })
    } catch (err) {
      next(err)
    }
  })

  return router
}

module.exports = { entriesRouter }
```

`api/src/routes/stats.js`:

```javascript
'use strict'
const express = require('express')
const { listEntries } = require('../repositories/entries-repo')
const { computeStats } = require('../lib/stats')

function statsRouter (pool) {
  const router = express.Router()
  router.get('/', async (req, res, next) => {
    try {
      res.json(computeStats(await listEntries(pool)))
    } catch (err) {
      next(err)
    }
  })
  return router
}

module.exports = { statsRouter }
```

`api/src/routes/reports.js`:

```javascript
'use strict'
const express = require('express')
const { listEntries } = require('../repositories/entries-repo')
const { commitsByProject, commitsByDay, activeHours, weeklySummary } = require('../lib/reports')

function reportsRouter (pool) {
  const router = express.Router()
  router.get('/', async (req, res, next) => {
    try {
      const entries = await listEntries(pool)
      res.json({
        weeklySummary: weeklySummary(entries),
        byProject: commitsByProject(entries),
        byDay: commitsByDay(entries),
        byHour: activeHours(entries)
      })
    } catch (err) {
      next(err)
    }
  })
  return router
}

module.exports = { reportsRouter }
```

- [ ] **Step 4: Write `api/src/index.js`**

```javascript
'use strict'
const express = require('express')
const { getPool } = require('./db')
const { requireAuth } = require('./middleware/auth')
const { entriesRouter } = require('./routes/entries')
const { statsRouter } = require('./routes/stats')
const { reportsRouter } = require('./routes/reports')

function createApp () {
  const pool = getPool()
  const app = express()
  app.use(express.json())

  app.get('/api/health', (req, res) => res.json({ ok: true }))

  app.use('/api', requireAuth)
  app.use('/api/entries', entriesRouter(pool))
  app.use('/api/stats', statsRouter(pool))
  app.use('/api/reports', reportsRouter(pool))

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[diary-server] error:', err.message)
    res.status(500).json({ error: 'error interno' })
  })

  return app
}

if (require.main === module) {
  const app = createApp()
  const port = process.env.PORT || 3000
  app.listen(port, () => console.log(`[diary-server] escuchando en :${port}`))
}

module.exports = { createApp }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/routes.test.js`
Expected: PASS (10 tests)

- [ ] **Step 6: Run the full test suite**

Run: `cd ~/root/personal/nala-diary-server/api && node --test tests/`
Expected: PASS (all tests across all files: 8 + 6 + 6 + 6 + 10 = 36)

- [ ] **Step 7: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/src/routes api/src/index.js api/tests/routes.test.js
git commit -m "api: entries/stats/reports routes and Express app assembly"
```

- [ ] **Step 8: Tear down the throwaway test MySQL container**

```bash
docker stop nala-diary-test-mysql && docker rm nala-diary-test-mysql
unset MYSQL_HOST MYSQL_PORT MYSQL_USER MYSQL_PASSWORD MYSQL_DATABASE
```

---

### Task 8: Dockerfile + docker-compose.yml

**Files:**
- Create: `api/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Write `api/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 3000
CMD ["node", "src/index.js"]
```

- [ ] **Step 2: Write `docker-compose.yml`**

```yaml
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./api
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      MYSQL_HOST: mysql
      MYSQL_PORT: 3306
      MYSQL_USER: root
      MYSQL_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      API_TOKEN: ${API_TOKEN}
      PORT: 3000
    ports:
      - "${API_PORT:-3000}:3000"

volumes:
  mysql_data:
```

Note: MySQL's own port is NOT published to the host here (no `ports:` under `mysql`) — only the `api` service needs to be reachable from outside, and MySQL only needs to be reachable from `api` over the internal compose network. This is tighter than Task 6's throwaway container, which did publish 3307 on purpose so the host-run tests could reach it directly.

- [ ] **Step 3: Manual verification — full stack boots**

```bash
cd ~/root/personal/nala-diary-server
cp .env.example .env
# .env already has usable defaults for local testing; edit if you want real values
docker compose up -d --build
```

Wait ~20s for MySQL's first boot + migration, then:

```bash
docker compose ps
```

Expected: both `mysql` and `api` show as running/healthy.

```bash
curl -s http://localhost:3000/api/health
```

Expected: `{"ok":true}`

```bash
curl -s http://localhost:3000/api/entries -H "Authorization: Bearer $(grep API_TOKEN .env | cut -d= -f2)"
```

Expected: `{"entries":[]}`

```bash
curl -s -X POST http://localhost:3000/api/entries \
  -H "Authorization: Bearer $(grep API_TOKEN .env | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Primer commit real via docker compose"}'
```

Expected: `201` with the created entry back in the response body.

```bash
curl -s http://localhost:3000/api/stats -H "Authorization: Bearer $(grep API_TOKEN .env | cut -d= -f2)"
```

Expected: `{"totalEntries":1,"activeDays":1,"streak":1,"heatmap":{"<today's date>":1}}`

- [ ] **Step 4: Tear down**

```bash
docker compose down
```

(Leave it down after this manual check — Josbert brings it up again himself when actually deploying or continuing work. Don't leave background containers running from this task.)

- [ ] **Step 5: Commit**

```bash
cd ~/root/personal/nala-diary-server
git add api/Dockerfile docker-compose.yml
git commit -m "docker: Dockerfile for the api service and docker-compose stack"
```

---

## Self-Review Notes

- **Spec coverage:** repo location ✓ (Task 1), Node+Express+mysql2 no ORM ✓ (Task 1, 5, 6), schema with nullable-unique hash ✓ (Task 5), all 5 endpoints (`GET/POST /entries`, `POST /entries/bulk`, `GET /stats`, `GET /reports`, `GET /health`) ✓ (Task 7), bearer token auth on everything except health ✓ (Task 4, 7), stats/reports logic reused verbatim from Nala ✓ (Task 2, 3), migrations auto-run via `docker-entrypoint-initdb.d` ✓ (Task 5, verified in Task 8), docker-compose with mysql+api services ✓ (Task 8), tests following the Nala project's real-integration-over-mocking philosophy for anything touching an external system (git there, MySQL here) ✓ (Task 6, 7).
- **Type consistency checked:** the entry shape `{hash, fecha, hora, proyecto, tipo, mensaje, nota}` is identical across `entries-repo.js`, the route handlers, and what `lib/stats.js`/`lib/reports.js` expect (`fecha`/`hora` as strings, matching `dateStrings: true` on the pool) — this is the exact same shape the Nala app already uses locally, so a future sub-project 2 (retrofitting Nala to call this API) doesn't need any data transformation at the boundary.
- **Out of scope, per spec:** VPS deployment/DNS/HTTPS, username/password login, retrofitting the Nala app itself (separate future plan), incremental migration tooling beyond the one `.sql` file.
