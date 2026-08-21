# Dev Diary — Nala Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the Nala Electron app to read/write the Dev Diary through the already-built server API instead of the local `diario.json` file, while keeping `src/renderer/diary/diary.js`'s data shape untouched and adding a visible connection-error banner.

**Architecture:** A new pure `api-client.js` module (no Electron dependency, config passed in as a parameter — same testability pattern already used by `git-scan.js`/`scan-repos.js`) makes the three HTTP calls. `src/main/index.js` gains a `loadServidorConfig()` following the exact same bundled-then-copied-to-userData pattern as the existing `loadProyectos()`, and its three diary functions (`runDiaryScan`, `getDiaryData`, `addDiaryNote`) are rewritten to call the API instead of the local store. `stats.js`/`reports.js`/`store.js` and their tests are deleted — that computation now happens server-side. A small new `scan-state.js` keeps just the per-repo `lastHashes` locally (an optimization, not data of record).

**Tech Stack:** Same as the rest of the Nala app — Node.js (Electron main process), `node:test`, vanilla JS/CSS in the renderer. No new dependencies (uses the global `fetch` already available in Electron's main process, same as the diary server itself relies on Node's global `fetch`).

---

## File Structure

**New files:**
- `config/servidor.json` — bundled default `{apiUrl: '', apiToken: ''}`
- `src/main/diary/api-client.js` — pure: `fetchDiaryData(config)`, `bulkInsert(config, entries)`, `addNote(config, note)`
- `src/main/diary/scan-state.js` — pure: `loadScanState(path)`, `saveScanState(path, state)` — replaces the `lastHashes` half of what `store.js` used to do
- `tests/diary/api-client.test.js`, `tests/diary/scan-state.test.js`

**Deleted files** (folded into Task 4 — deleting them separately from the index.js rewire that stops requiring them would leave the app broken in between commits):
- `src/main/diary/store.js`, `src/main/diary/stats.js`, `src/main/diary/reports.js`
- `tests/diary/store.test.js`, `tests/diary/stats.test.js`, `tests/diary/reports.test.js`

**Modified files:**
- `src/main/index.js` — new requires/constants for `api-client`/`scan-state`/`servidor.json`, old ones removed; `runDiaryScan`/`getDiaryData`/`addDiaryNote` rewritten
- `src/renderer/diary/index.html` — adds a `#connError` banner element
- `src/renderer/diary/diary.css` — styles it
- `src/renderer/diary/diary.js` — shows/hides it based on whether `window.diary.getData()`/`addNote()` succeed

---

### Task 1: `config/servidor.json`

**Files:**
- Create: `config/servidor.json`

- [ ] **Step 1: Create the file**

```json
{
  "apiUrl": "",
  "apiToken": ""
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jos/root/personal/nala
git add config/servidor.json
git commit -m "diary: add empty servidor.json config"
```

No test — plain data file the user fills in by hand, same pattern as `config/cat.json`/`config/proyectos.json`.

---

### Task 2: `scan-state.js` — local `lastHashes` storage

**Files:**
- Create: `src/main/diary/scan-state.js`
- Test: `tests/diary/scan-state.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/jos/root/personal/nala && node --test tests/diary/scan-state.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/jos/root/personal/nala && node --test tests/diary/scan-state.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/diary/scan-state.js tests/diary/scan-state.test.js
git commit -m "diary: add scan-state.js for local lastHashes tracking"
```

---

### Task 3: `api-client.js` — talks to the diary server

**Files:**
- Create: `src/main/diary/api-client.js`
- Test: `tests/diary/api-client.test.js`

This module makes real HTTP calls, so its tests spin up a tiny real local HTTP server with Node's built-in `http` module (same "real, not mocked" philosophy as `scan-repos.test.js` using real git repos) — no need for the actual diary-server project.

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/jos/root/personal/nala && node --test tests/diary/api-client.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```javascript
'use strict'

async function apiFetch (config, urlPath, options = {}) {
  if (!config.apiUrl) throw new Error('servidor no configurado (config/servidor.json)')
  const res = await fetch(`${config.apiUrl}${urlPath}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${config.apiToken}`
    }
  })
  if (!res.ok) throw new Error(`server respondio ${res.status}`)
  return res.json()
}

async function fetchDiaryData (config) {
  const [{ entries }, stats, reports] = await Promise.all([
    apiFetch(config, '/api/entries'),
    apiFetch(config, '/api/stats'),
    apiFetch(config, '/api/reports')
  ])
  return { entries, stats, reports }
}

async function bulkInsert (config, entries) {
  return apiFetch(config, '/api/entries/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries })
  })
}

async function addNote (config, note) {
  return apiFetch(config, '/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  })
}

module.exports = { fetchDiaryData, bulkInsert, addNote }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/jos/root/personal/nala && node --test tests/diary/api-client.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/diary/api-client.js tests/diary/api-client.test.js
git commit -m "diary: add api-client.js talking to the diary server over HTTP"
```

---

### Task 4: Rewire `src/main/index.js`, remove the local store

**Files:**
- Modify: `src/main/index.js`
- Delete: `src/main/diary/store.js`, `src/main/diary/stats.js`, `src/main/diary/reports.js`
- Delete: `tests/diary/store.test.js`, `tests/diary/stats.test.js`, `tests/diary/reports.test.js`

**IMPORTANT — read the actual current file first.** The snippets below are what the file looked like when this plan was written; if any "Find:" text doesn't match exactly (even minor formatting), stop and report NEEDS_CONTEXT with what you found instead of forcing a match — don't guess.

- [ ] **Step 1: Update the requires**

Find near the top of the file:

```javascript
const diaryStore = require('./diary/store')
const { scanAllRepos } = require('./diary/scan-repos')
const { computeStats } = require('./diary/stats')
const { commitsByProject, commitsByDay, activeHours, weeklySummary } = require('./diary/reports')
const { createDiaryWindow, toggleDiaryWindow } = require('./diary/window')
```

Replace with:

```javascript
const { scanAllRepos } = require('./diary/scan-repos')
const apiClient = require('./diary/api-client')
const { loadScanState, saveScanState } = require('./diary/scan-state')
const { createDiaryWindow, toggleDiaryWindow } = require('./diary/window')
```

- [ ] **Step 2: Update the path constants**

Find:

```javascript
const BUNDLED_PROYECTOS = path.join(ROOT, 'config', 'proyectos.json')
```

Replace with:

```javascript
const BUNDLED_PROYECTOS = path.join(ROOT, 'config', 'proyectos.json')
const BUNDLED_SERVIDOR = path.join(ROOT, 'config', 'servidor.json')
```

Find:

```javascript
const PROYECTOS_PATH = path.join(USER_DIR, 'proyectos.json')
const DIARY_PATH = path.join(USER_DIR, 'diario.json')
```

Replace with:

```javascript
const PROYECTOS_PATH = path.join(USER_DIR, 'proyectos.json')
const SERVIDOR_PATH = path.join(USER_DIR, 'servidor.json')
const SCAN_STATE_PATH = path.join(USER_DIR, 'scan-state.json')
```

(`DIARY_PATH` — the local `diario.json` — is gone; the server is the only copy of the data now.)

- [ ] **Step 3: Rewrite the diario functions**

Find the entire block (from the `// ------- diario` comment through the end of `addDiaryNote`):

```javascript
// ------------------------------------------------------------------- diario

function loadProyectos () {
  try {
    if (!fs.existsSync(PROYECTOS_PATH)) {
      fs.mkdirSync(USER_DIR, { recursive: true })
      fs.copyFileSync(BUNDLED_PROYECTOS, PROYECTOS_PATH)
    }
    const data = JSON.parse(fs.readFileSync(PROYECTOS_PATH, 'utf8'))
    return data.repos || []
  } catch (err) {
    console.error('[nala] no pude leer proyectos.json:', err.message)
    return []
  }
}

function runDiaryScan () {
  const repos = loadProyectos()
  if (!repos.length) return
  let diary = diaryStore.loadDiary(DIARY_PATH)
  const { entries, lastHashes, errors } = scanAllRepos(repos, diary.lastHashes)
  diary = diaryStore.appendEntries({ ...diary, lastHashes }, entries)
  diaryStore.saveDiary(DIARY_PATH, diary)
  for (const e of errors) console.error(`[nala] diario: ${e.repoPath} -> ${e.error}`)
}

function getDiaryData () {
  const diary = diaryStore.loadDiary(DIARY_PATH)
  return {
    entries: diary.entries,
    stats: computeStats(diary.entries),
    reports: {
      weeklySummary: weeklySummary(diary.entries),
      byProject: commitsByProject(diary.entries),
      byDay: commitsByDay(diary.entries),
      byHour: activeHours(diary.entries)
    }
  }
}

function addDiaryNote (note) {
  let diary = diaryStore.loadDiary(DIARY_PATH)
  diary = diaryStore.addManualNote(diary, note)
  diaryStore.saveDiary(DIARY_PATH, diary)
}
```

Replace with:

```javascript
// ------------------------------------------------------------------- diario

function loadProyectos () {
  try {
    if (!fs.existsSync(PROYECTOS_PATH)) {
      fs.mkdirSync(USER_DIR, { recursive: true })
      fs.copyFileSync(BUNDLED_PROYECTOS, PROYECTOS_PATH)
    }
    const data = JSON.parse(fs.readFileSync(PROYECTOS_PATH, 'utf8'))
    return data.repos || []
  } catch (err) {
    console.error('[nala] no pude leer proyectos.json:', err.message)
    return []
  }
}

function loadServidorConfig () {
  try {
    if (!fs.existsSync(SERVIDOR_PATH)) {
      fs.mkdirSync(USER_DIR, { recursive: true })
      fs.copyFileSync(BUNDLED_SERVIDOR, SERVIDOR_PATH)
    }
    return JSON.parse(fs.readFileSync(SERVIDOR_PATH, 'utf8'))
  } catch (err) {
    console.error('[nala] no pude leer servidor.json:', err.message)
    return { apiUrl: '', apiToken: '' }
  }
}

async function runDiaryScan () {
  const repos = loadProyectos()
  if (!repos.length) return

  const scanState = loadScanState(SCAN_STATE_PATH)
  const { entries, lastHashes, errors } = scanAllRepos(repos, scanState.lastHashes)
  for (const e of errors) console.error(`[nala] diario: ${e.repoPath} -> ${e.error}`)

  if (!entries.length) {
    saveScanState(SCAN_STATE_PATH, { lastHashes })
    return
  }

  try {
    await apiClient.bulkInsert(loadServidorConfig(), entries)
    // lastHashes solo avanza si el server confirmo que los guardo — si el
    // POST falla, la proxima corrida (15 min despues) vuelve a mandar estos
    // mismos commits en vez de perderlos para siempre.
    saveScanState(SCAN_STATE_PATH, { lastHashes })
  } catch (err) {
    console.error('[nala] diario: no pude mandar los commits al server, reintento en el proximo scan:', err.message)
  }
}

async function getDiaryData () {
  try {
    return await apiClient.fetchDiaryData(loadServidorConfig())
  } catch (err) {
    console.error('[nala] diario: no pude obtener datos del server:', err.message)
    throw err
  }
}

async function addDiaryNote (note) {
  try {
    await apiClient.addNote(loadServidorConfig(), note)
  } catch (err) {
    console.error('[nala] diario: no pude guardar la nota en el server:', err.message)
    throw err
  }
}
```

- [ ] **Step 4: Delete the obsolete files**

```bash
cd /home/jos/root/personal/nala
git rm src/main/diary/store.js src/main/diary/stats.js src/main/diary/reports.js
git rm tests/diary/store.test.js tests/diary/stats.test.js tests/diary/reports.test.js
```

- [ ] **Step 5: Run the diary test suite**

Run: `cd /home/jos/root/personal/nala && node --test tests/diary/`
Expected: PASS — only `git-scan.test.js`, `scan-repos.test.js`, `scan-state.test.js`, `api-client.test.js` remain (the deleted files' tests are gone, not failing).

- [ ] **Step 6: Manual verification — app still starts**

`getDiaryData`/`addDiaryNote` are now `async` — confirm the `ipcMain.handle` registrations already wrap them correctly (they should, since `ipcMain.handle` always awaits whatever its callback returns, sync or async, without any code change needed there). Confirm by reading the existing handler registrations:

```bash
grep -n "diary:get-data\|diary:add-note\|toggle-diary" /home/jos/root/personal/nala/src/main/index.js
```

Expected output still shows exactly:
```
ipcMain.on('toggle-diary', () => toggleDiaryWindow())
ipcMain.handle('diary:get-data', () => getDiaryData())
ipcMain.handle('diary:add-note', (_e, note) => addDiaryNote(note))
```
(no changes needed there — `ipcMain.handle`'s callback returning a Promise already works correctly whether or not the function is `async`).

Then launch the app:

```bash
pkill -9 -f "node_modules/electron/dist/electron" 2>&1
cd /home/jos/root/personal/nala && (nohup npm start > /tmp/nala-app.log 2>&1 &)
sleep 6
pgrep -af "electron \."
tail -30 /tmp/nala-app.log
```

Expected: app running, no crash. Since `config/servidor.json` has an empty `apiUrl` by default, you should see `[nala] diario: no pude obtener datos del server: servidor no configurado (config/servidor.json)` logged once the diary window loads and calls `getData()` — that's expected at this point (Task 5 adds the visible banner for this exact case; right now it just logs). Kill the app when done: `pkill -9 -f "node_modules/electron/dist/electron"`.

- [ ] **Step 7: Commit**

```bash
cd /home/jos/root/personal/nala
git add src/main/index.js
git commit -m "diary: rewire main process to use the server API instead of the local file"
```

---

### Task 5: Connection-error banner in the panel

**Files:**
- Modify: `src/renderer/diary/index.html`
- Modify: `src/renderer/diary/diary.css`
- Modify: `src/renderer/diary/diary.js`

- [ ] **Step 1: Add the banner element**

Find in `src/renderer/diary/index.html`:

```html
  <div class="header">
    <span>🐾 NALA · DEV DIARY</span>
    <button class="theme-toggle" id="themeToggle">☀/☾</button>
  </div>
```

Replace with:

```html
  <div class="header">
    <span>🐾 NALA · DEV DIARY</span>
    <button class="theme-toggle" id="themeToggle">☀/☾</button>
  </div>
  <div class="conn-error hidden" id="connError">No se pudo conectar al server del diario.</div>
```

- [ ] **Step 2: Style it**

Add to the end of `src/renderer/diary/diary.css`:

```css
.conn-error {
  background: #7a2e2e;
  color: #fbe4e4;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
```

- [ ] **Step 3: Wire it up in `diary.js`**

Find:

```javascript
async function loadAndRender () {
  const data = await window.diary.getData()
  renderStats(data.stats)
  renderHeatmap(data.stats.heatmap)
  renderEntries(data.entries)
  renderReports(data.reports)
}
```

Replace with:

```javascript
function showConnError (show) {
  document.getElementById('connError').classList.toggle('hidden', !show)
}

async function loadAndRender () {
  try {
    const data = await window.diary.getData()
    showConnError(false)
    renderStats(data.stats)
    renderHeatmap(data.stats.heatmap)
    renderEntries(data.entries)
    renderReports(data.reports)
  } catch (err) {
    console.error('[diary] no pude cargar los datos:', err)
    showConnError(true)
  }
}
```

Find:

```javascript
document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('noteInput')
  const mensaje = input.value.trim()
  if (!mensaje) return
  await window.diary.addNote({ mensaje })
  input.value = ''
  loadAndRender()
})
```

Replace with:

```javascript
document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('noteInput')
  const mensaje = input.value.trim()
  if (!mensaje) return
  try {
    await window.diary.addNote({ mensaje })
    input.value = ''
  } catch (err) {
    console.error('[diary] no pude guardar la nota:', err)
    showConnError(true)
    return
  }
  loadAndRender()
})
```

- [ ] **Step 4: Manual verification**

```bash
pkill -9 -f "node_modules/electron/dist/electron" 2>&1
cd /home/jos/root/personal/nala && (nohup npm start > /tmp/nala-app.log 2>&1 &)
sleep 6
```

Right-click Nala to open the diary panel. Expected: since `config/servidor.json` still has an empty `apiUrl` (Task 6 is the first time it gets pointed at a real server), the red banner "No se pudo conectar al server del diario." shows at the top of the panel instead of a blank/broken-looking panel. Kill the app when done.

- [ ] **Step 5: Commit**

```bash
cd /home/jos/root/personal/nala
git add src/renderer/diary/index.html src/renderer/diary/diary.css src/renderer/diary/diary.js
git commit -m "diary: show a banner when the panel can't reach the server"
```

---

### Task 6: End-to-end check against the real server

**Files:**
- Modify (locally, not committed): `~/.config/Nala/servidor.json`

- [ ] **Step 1: Bring up the real diary server**

```bash
cd ~/root/personal/nala-diary-server
cp .env.example .env
docker compose up -d --build
sleep 20
curl -s http://localhost:3000/api/health
```

Expected: `{"ok":true}`

- [ ] **Step 2: Point Nala at it**

```bash
TOKEN=$(grep API_TOKEN ~/root/personal/nala-diary-server/.env | cut -d= -f2)
cat > ~/.config/Nala/servidor.json <<EOF
{
  "apiUrl": "http://localhost:3000",
  "apiToken": "$TOKEN"
}
EOF
```

Also point it at a real repo to scan, if `~/.config/Nala/proyectos.json` still has an empty list:

```bash
echo '{"repos": ["/home/jos/root/personal/nala"]}' > ~/.config/Nala/proyectos.json
```

- [ ] **Step 3: Launch and verify**

```bash
pkill -9 -f "node_modules/electron/dist/electron" 2>&1
cd /home/jos/root/personal/nala && (nohup npm start > /tmp/nala-app.log 2>&1 &)
sleep 8
```

Right-click Nala to open the diary panel. Expected: NO red banner this time — the Diario tab shows real commits from the `nala` repo's history, and the Reportes tab shows real numbers. Add a manual note via the panel's `+ nota` field; expected: it appears in the list immediately with no banner.

Confirm from the server side too:

```bash
curl -s http://localhost:3000/api/entries -H "Authorization: Bearer $TOKEN" | head -c 300
```

Expected: real entries, including the manual note just added through the panel.

- [ ] **Step 4: Tear down**

```bash
pkill -9 -f "node_modules/electron/dist/electron"
cd ~/root/personal/nala-diary-server && docker compose down
```

No commit — this task is end-to-end verification only.

---

## Self-Review Notes

- **Spec coverage:** `config/servidor.json` ✓ (Task 1), `store.js`/`stats.js`/`reports.js` removed ✓ (Task 4), `api-client.js` with the three functions ✓ (Task 3), `scan-repos.js`/`git-scan.js` untouched ✓ (never modified in this plan), `lastHashes` stays local in its own file ✓ (Task 2, wired in Task 4), `getDiaryData()` returns the identical shape `diary.js` already expects so the renderer's render functions need zero changes ✓ (only the error-handling wrapper around the existing calls changes, in Task 5), visible connection-error banner ✓ (Task 5), `bulkInsert` failure doesn't advance `lastHashes` (so failed scans retry next time instead of losing commits) ✓ (Task 4, called out explicitly since it's a necessary elaboration the spec didn't spell out in this much detail).
- **Type consistency checked:** `api-client.js`'s three functions all take `config` (`{apiUrl, apiToken}`) as their first parameter, matching how `index.js`'s `loadServidorConfig()` return value is passed straight through at every call site. `fetchDiaryData`'s return shape (`{entries, stats, reports}`) matches exactly what `getDiaryData()` in `index.js` returns to the IPC handler, which matches exactly what `diary.js` already destructures (`data.stats`, `data.entries`, `data.reports`) — no renderer changes needed beyond the try/catch wrapper.
- **Out of scope**, per spec: automatic retry/backoff beyond "try again on the next 15-minute scan," local offline caching, and migrating any pre-existing `~/.config/Nala/diario.json` history into the server (manual step, not automated here).
