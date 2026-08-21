'use strict'

const {
  app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, shell, globalShortcut, dialog
} = require('electron')
const path = require('path')
const fs = require('fs')

const { scanAllRepos } = require('./diary/scan-repos')
const apiClient = require('./diary/api-client')
const { loadScanState, saveScanState } = require('./diary/scan-state')
const { createDiaryWindow, toggleDiaryWindow } = require('./diary/window')
const { githubUrlsByProject } = require('./diary/repo-links')
const { listSpriteSources } = require('./diary/sprite-sources')

const ROOT = path.join(__dirname, '..', '..')
const BUNDLED_CONFIG = path.join(ROOT, 'config', 'cat.json')
const SPRITES_DIR = path.join(ROOT, 'assets', 'sprites')
const BUNDLED_PROYECTOS = path.join(ROOT, 'config', 'proyectos.json')
const BUNDLED_SERVIDOR = path.join(ROOT, 'config', 'servidor.json')
const SF_SPRITE_DIR = path.join(ROOT, 'sf-sprite-nala')

// Ya instalada, ROOT vive dentro de app.asar y es de solo lectura. Su config y
// sus ajustes van a la carpeta de datos del usuario; la primera vez copiamos
// ahi el cat.json que viene con la app para que se pueda editar.
const USER_DIR = app.getPath('userData')
const CONFIG_PATH = path.join(USER_DIR, 'cat.json')
const SETTINGS_PATH = path.join(USER_DIR, 'settings.json')
const STATE_PATH = path.join(USER_DIR, 'estado.json')
const PROYECTOS_PATH = path.join(USER_DIR, 'proyectos.json')
const SERVIDOR_PATH = path.join(USER_DIR, 'servidor.json')
const SCAN_STATE_PATH = path.join(USER_DIR, 'scan-state.json')

// Wayland no le permite a una app posicionarse sola en pantalla, y sin eso la
// gata no puede caminar por el escritorio. Forzamos XWayland, que si lo permite.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform', 'x11')
  app.commandLine.appendSwitch('enable-transparent-visuals')
  // Sin esto la transparencia queda negra en varios drivers de Linux.
  app.disableHardwareAcceleration()
}

let win = null
let quitting = false
let tray = null
let geometryTimer = null
let windowProvider = null
let stage = null               // el rectangulo que cubre la ventana ahora mismo

function loadConfig () {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.mkdirSync(USER_DIR, { recursive: true })
      fs.copyFileSync(BUNDLED_CONFIG, CONFIG_PATH)
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch (err) {
    console.error('[nala] no pude leer cat.json:', err.message)
    try {
      return JSON.parse(fs.readFileSync(BUNDLED_CONFIG, 'utf8'))
    } catch (_) {
      return { name: 'Nala', scale: 2, moments: [], notes: [] }
    }
  }
}

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

async function getCards () {
  try {
    return await apiClient.getCards(loadServidorConfig())
  } catch (err) {
    console.error('[nala] diario: no pude obtener las tarjetas:', err.message)
    throw err
  }
}

async function createCard (card) {
  try {
    return await apiClient.createCard(loadServidorConfig(), card)
  } catch (err) {
    console.error('[nala] diario: no pude crear la tarjeta:', err.message)
    throw err
  }
}

async function updateCard (id, changes) {
  try {
    return await apiClient.updateCard(loadServidorConfig(), id, changes)
  } catch (err) {
    console.error('[nala] diario: no pude actualizar la tarjeta:', err.message)
    throw err
  }
}

async function deleteCard (id) {
  try {
    await apiClient.deleteCard(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] diario: no pude borrar la tarjeta:', err.message)
    throw err
  }
}

async function getShares () {
  try {
    return await apiClient.getShares(loadServidorConfig())
  } catch (err) {
    console.error('[nala] diario: no pude obtener lo compartido:', err.message)
    throw err
  }
}

async function createShare (texto) {
  try {
    return await apiClient.createShare(loadServidorConfig(), { texto })
  } catch (err) {
    console.error('[nala] diario: no pude compartir el texto:', err.message)
    throw err
  }
}

async function createShareFile (filePath, texto) {
  try {
    return await apiClient.createShareFile(loadServidorConfig(), { filePath, texto })
  } catch (err) {
    console.error('[nala] diario: no pude compartir el archivo:', err.message)
    throw err
  }
}

async function deleteShare (id) {
  try {
    await apiClient.deleteShare(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] diario: no pude borrar lo compartido:', err.message)
    throw err
  }
}

async function getShareFile (id) {
  try {
    return await apiClient.getShareFile(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] diario: no pude traer el archivo compartido:', err.message)
    throw err
  }
}

async function pickShareFile () {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

async function saveShareFile (id, suggestedName) {
  const { base64 } = await getShareFile(id)
  const result = await dialog.showSaveDialog({ defaultPath: suggestedName })
  if (result.canceled || !result.filePath) return false
  fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'))
  return true
}

async function getTasks (proyectoId) {
  try {
    return await apiClient.getTasks(loadServidorConfig(), proyectoId)
  } catch (err) {
    console.error('[nala] proyectos: no pude obtener las tareas:', err.message)
    throw err
  }
}

async function getProjects () {
  try {
    return await apiClient.getProjects(loadServidorConfig())
  } catch (err) {
    console.error('[nala] proyectos: no pude obtener los proyectos:', err.message)
    throw err
  }
}

async function createProject (nombre) {
  try {
    return await apiClient.createProject(loadServidorConfig(), nombre)
  } catch (err) {
    console.error('[nala] proyectos: no pude crear el proyecto:', err.message)
    throw err
  }
}

async function deleteProject (id) {
  try {
    await apiClient.deleteProject(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] proyectos: no pude borrar el proyecto:', err.message)
    throw err
  }
}

async function getTask (id) {
  try {
    return await apiClient.getTask(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] proyectos: no pude obtener la tarea:', err.message)
    throw err
  }
}

async function createTask (task) {
  try {
    return await apiClient.createTask(loadServidorConfig(), task)
  } catch (err) {
    console.error('[nala] proyectos: no pude crear la tarea:', err.message)
    throw err
  }
}

async function updateTask (id, changes) {
  try {
    return await apiClient.updateTask(loadServidorConfig(), id, changes)
  } catch (err) {
    console.error('[nala] proyectos: no pude actualizar la tarea:', err.message)
    throw err
  }
}

async function deleteTask (id) {
  try {
    await apiClient.deleteTask(loadServidorConfig(), id)
  } catch (err) {
    console.error('[nala] proyectos: no pude borrar la tarea:', err.message)
    throw err
  }
}

async function getComments (taskId) {
  try {
    return await apiClient.getComments(loadServidorConfig(), taskId)
  } catch (err) {
    console.error('[nala] proyectos: no pude obtener los comentarios:', err.message)
    throw err
  }
}

async function addComment (taskId, texto) {
  try {
    return await apiClient.addComment(loadServidorConfig(), taskId, texto)
  } catch (err) {
    console.error('[nala] proyectos: no pude agregar el comentario:', err.message)
    throw err
  }
}

async function deleteComment (taskId, commentId) {
  try {
    await apiClient.deleteComment(loadServidorConfig(), taskId, commentId)
  } catch (err) {
    console.error('[nala] proyectos: no pude borrar el comentario:', err.message)
    throw err
  }
}

// ------------------------------------------------------- versiones de su pinta
//
// Cada version vive en assets/sprites/<id>/ con su hoja, sus objetos y su
// icono. La lista la escribe tools/make_sprites.py en looks.json: aca no hay
// nada hardcodeado, agregar una version es volver a correr el script.

const LOOKS_PATH = path.join(SPRITES_DIR, 'looks.json')
const FALLBACK_LOOKS = { default: 'v1', looks: [{ id: 'v1', label: 'Version 1' }] }

function loadLooks () {
  try {
    const idx = JSON.parse(fs.readFileSync(LOOKS_PATH, 'utf8'))
    if (Array.isArray(idx.looks) && idx.looks.length) return idx
    throw new Error('looks.json no trae ninguna version')
  } catch (err) {
    console.warn('[nala] no pude leer looks.json:', err.message)
    console.warn('[nala] regeneralo con: python3 tools/make_sprites.py')
    return FALLBACK_LOOKS
  }
}

const LOOKS = loadLooks()

// ---------------------------------------------------------------- habitats
//
// Su decorado. La lista la escribe a mano config/habitats.json: aca no se
// inventa nada, solo se elige cual esta puesto y se guarda la eleccion.

const HABITATS_PATH = path.join(ROOT, 'config', 'habitats.json')
const FALLBACK_HABITATS = { default: 'casa', habitats: [{ id: 'casa', label: 'Su casa', pieces: [] }] }

function loadHabitats () {
  try {
    const idx = JSON.parse(fs.readFileSync(HABITATS_PATH, 'utf8'))
    if (Array.isArray(idx.habitats) && idx.habitats.length) return idx
    throw new Error('habitats.json no trae ninguno')
  } catch (err) {
    console.warn('[nala] no pude leer habitats.json:', err.message)
    return FALLBACK_HABITATS
  }
}

const HABITATS = loadHabitats()

function currentHabitatId () {
  const ids = HABITATS.habitats.map((h) => h.id)
  if (settings.habitat && ids.includes(settings.habitat)) return settings.habitat
  return ids.includes(HABITATS.default) ? HABITATS.default : ids[0]
}

function currentHabitat () {
  const id = currentHabitatId()
  return HABITATS.habitats.find((h) => h.id === id)
}

function setHabitat (id) {
  if (!HABITATS.habitats.some((h) => h.id === id)) return
  if (id === currentHabitatId()) return
  settings.habitat = id
  saveSettings()
  rebuildTray()
  if (win && !win.isDestroyed()) win.reload()
}

function cycleHabitat () {
  const ids = HABITATS.habitats.map((h) => h.id)
  setHabitat(ids[(ids.indexOf(currentHabitatId()) + 1) % ids.length])
}

/** La version elegida. Si nunca eligio ninguna, la que viene por defecto. */
function currentLook () {
  const ids = LOOKS.looks.map((l) => l.id)
  if (settings.look && ids.includes(settings.look)) return settings.look
  return ids.includes(LOOKS.default) ? LOOKS.default : ids[0]
}

// ------------------------------------------------------------------- ajustes

const DEFAULT_SETTINGS = {
  displayMode: 'all',   // 'all' | 'primary'
  look: null,           // null = la que venga por defecto en looks.json
  habitat: null         // null = el que venga por defecto en habitats.json
}

// ------------------------------------------------------------------- memoria
//
// Lo que se acuerda de una sesion a la otra: como estaba, si ya te saludo hoy,
// y desde cuando estan juntos. Sin esto cada reinicio la borraba entera y no
// habia ninguna continuidad.

let estado = loadState()

function loadState () {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
  } catch (err) {
    return {}
  }
}

function saveState () {
  try {
    fs.mkdirSync(USER_DIR, { recursive: true })
    fs.writeFileSync(STATE_PATH, JSON.stringify(estado, null, 2))
  } catch (err) {
    console.warn('[nala] no pude guardar su estado:', err.message)
  }
}

function loadSettings () {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) }
  } catch (err) {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings () {
  try {
    fs.mkdirSync(USER_DIR, { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  } catch (err) {
    console.error('[nala] no pude guardar settings.json:', err.message)
  }
}

let settings = loadSettings()

// ---------------------------------------------------------------- escenario
//
// En modo 'all' la ventana cubre la union de todas las pantallas, asi la gata
// cruza de un monitor al otro caminando y no se entera del borde. En 'primary'
// se queda en la principal, como antes.

function stageBounds () {
  const primary = screen.getPrimaryDisplay()
  const displays = settings.displayMode === 'primary'
    ? [primary]
    : screen.getAllDisplays()

  const x = Math.min(...displays.map((d) => d.bounds.x))
  const y = Math.min(...displays.map((d) => d.bounds.y))
  const x2 = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width))
  const y2 = Math.max(...displays.map((d) => d.bounds.y + d.bounds.height))

  // La ventana se mide en DIP y cada pantalla convierte con su propio factor:
  // si los escalados no coinciden, las posiciones quedan corridas.
  const scales = [...new Set(displays.map((d) => d.scaleFactor))]
  if (scales.length > 1) {
    console.warn(`[nala] pantallas con escalados distintos (${scales.join(', ')}): ` +
                 'las posiciones pueden quedar corridas.')
  }

  return {
    x,
    y,
    width: x2 - x,
    height: y2 - y,
    scaleFactor: primary.scaleFactor,
    // Cada monitor en coordenadas de la ventana: el renderer arma un tramo de
    // piso al pie de cada uno.
    displays: displays.map((d) => ({
      x: d.bounds.x - x,
      y: d.bounds.y - y,
      width: d.bounds.width,
      height: d.bounds.height,
      // El piso va al pie de la zona util, no del monitor: asi camina POR
      // ENCIMA de la barra de tareas y no le queda medio cuerpo tapado.
      floorY: d.workArea.y - y + d.workArea.height,
      primary: d.id === primary.id
    }))
  }
}

/**
 * Windows recorta la ventana al area de trabajo del monitor principal cuando
 * el tamaño se pide en el constructor: pedir 5760x1080 devolvia 1920x1032.
 * Aplicado despues de crearla, y con la ventana redimensionable un instante,
 * si acepta el escritorio entero.
 */
function setStageBounds (w, s) {
  const was = w.isResizable()
  w.setResizable(true)
  w.setBounds({ x: s.x, y: s.y, width: s.width, height: s.height })
  w.setResizable(was)
}

/** Recalcula el escenario y lo aplica. Se usa al cambiar de modo o de monitores. */
function applyStage () {
  if (!win || win.isDestroyed()) return
  stage = stageBounds()
  setStageBounds(win, stage)
  win.reload()          // el renderer rearma el mundo cuando llega el boot
}

function createWindow () {
  stage = stageBounds()
  const { x, y, width, height } = stage

  win = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    alwaysOnTop: true,
    // `toolbar` evita que varios WM le pongan decoracion o la metan en el alt-tab
    type: process.platform === 'linux' ? 'toolbar' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })

  // Recien creada quedo recortada al monitor principal: le damos el tamaño de
  // verdad ahora, que es cuando Windows lo acepta.
  setStageBounds(win, stage)

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Arranca en modo "el mouse me atraviesa". Solo se vuelve solida cuando el
  // cursor esta encima de la gata (lo decide el renderer).
  win.setIgnoreMouseEvents(true, { forward: true })

  win.loadFile(path.join(ROOT, 'src', 'renderer', 'index.html'))

  if (DEBUG) {
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log(`[renderer] ${message} (${sourceId}:${line})`)
    })
  }

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('boot', {
      config: loadConfig(),
      display: stage,
      look: currentLook(),
      looks: LOOKS.looks,
      estado,
      habitat: currentHabitat(),
      habitats: HABITATS.habitats.map((h) => ({ id: h.id, label: h.label })),
      platform: process.platform,
      debug: DEBUG
    })
  })

  win.on('closed', () => { win = null })
}

// ------------------------------------------------------------------- puntero
//
// En Linux, setIgnoreMouseEvents(true, {forward:true}) NO reenvia los eventos
// de mouse al renderer: `forward` solo anda en Windows y macOS. Sin eso la
// ventana no puede saber si el cursor esta encima de ella, y queda siempre
// atravesable. Asi que la posicion del cursor la consultamos desde aca y la
// mandamos nosotros.

const POINTER_MS = 16          // ~60 Hz
const DEBUG = !!process.env.NALA_DEBUG

let hotRects = []              // zonas que agarran el mouse, en coords de pantalla
let forceInteractive = false   // el renderer manda: arrastrando o menu abierto
let interactive = false
let pointerTimer = null

function startPointerPolling () {
  pointerTimer = setInterval(() => {
    if (!win || win.isDestroyed() || !win.isVisible()) return

    const p = screen.getCursorScreenPoint()
    win.webContents.send('pointer', p)

    const inside = forceInteractive || hotRects.some(
      (r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
    )
    if (inside !== interactive) {
      interactive = inside
      // Solida sobre ella: los clicks no pasan a lo que haya atras.
      win.setIgnoreMouseEvents(!inside, { forward: true })
      if (DEBUG) {
        console.log(`[nala] ventana ${inside ? 'SOLIDA' : 'atravesable'} ` +
                    `(cursor ${p.x},${p.y} / ${hotRects.length} zonas)`)
      }
    }
  }, POINTER_MS)
}

// ---------------------------------------------------------- geometria de ventanas

function startGeometryPolling () {
  windowProvider = require('./windows')()
  const tick = async () => {
    if (!win || win.isDestroyed()) return
    try {
      const rects = await windowProvider.list()
      win.webContents.send('windows', rects)
    } catch (err) {
      // Provider caido: la gata sigue viviendo en el piso, sin repisas.
    }
  }
  tick()
  geometryTimer = setInterval(tick, 700)
}

// ------------------------------------------------------------------------ tray

/**
 * La carita del tray, la de la version que este puesta. Si esa no esta cae al
 * icono suelto de assets/, que es el que arma el instalador.
 */
function trayImage () {
  const tries = [
    path.join(SPRITES_DIR, currentLook(), 'tray.png'),
    path.join(ROOT, 'assets', 'tray.png')
  ]
  for (const p of tries) {
    if (!fs.existsSync(p)) continue
    const img = nativeImage.createFromPath(p)
    if (!img.isEmpty()) return img
  }
  console.warn('[nala] no encontre ningun tray.png: el icono va a quedar vacio.')
  console.warn('[nala] regeneralo con: python3 tools/make_sprites.py')
  return nativeImage.createEmpty()
}

function buildTray () {
  tray = new Tray(trayImage())
  const cfg = loadConfig()
  const dias = estado.desde
    ? Math.max(0, Math.round((Date.now() - new Date(estado.desde + 'T00:00:00')) / 86400000))
    : 0
  tray.setToolTip(dias > 0 ? `${cfg.name || 'Nala'} · ${dias} días juntos` : (cfg.name || 'Nala'))
  refreshTrayMenu()
}

/** Cambia por donde puede andar y rearma la ventana en el acto. */
function setDisplayMode (mode) {
  if (settings.displayMode === mode) return
  settings.displayMode = mode
  saveSettings()
  applyStage()
  refreshTrayMenu()
}

/**
 * Le cambia la pinta. La hoja de sprites la carga el renderer al arrancar, asi
 * que hay que recargarlo: se la ve aparecer de nuevo con la version puesta.
 */
function setLook (id) {
  if (!LOOKS.looks.some((l) => l.id === id)) return
  if (currentLook() === id) return
  settings.look = id
  saveSettings()
  if (tray) tray.setImage(trayImage())
  if (win && !win.isDestroyed()) win.reload()
  refreshTrayMenu()
}

/** La que sigue en la lista. Es lo que usa el click derecho sobre ella. */
function cycleLook () {
  const ids = LOOKS.looks.map((l) => l.id)
  setLook(ids[(ids.indexOf(currentLook()) + 1) % ids.length])
}

function refreshTrayMenu () {
  if (!tray) return
  const cfg = loadConfig()
  const send = (channel, payload) => () => win && win.webContents.send(channel, payload)
  const multi = screen.getAllDisplays().length > 1

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: cfg.name || 'Nala', enabled: false },
    { label: 'Dev Diary', click: () => toggleDiaryWindow() },
    { type: 'separator' },
    { label: 'Servirle la comida', click: send('command', { type: 'feed' }) },
    { label: 'Sacar la pelota', click: send('command', { type: 'play' }) },
    { label: 'Soltar una mariposa', click: send('command', { type: 'butterfly' }) },
    { label: 'Que pase un pajarito', click: send('command', { type: 'bird' }) },
    { label: 'Que te traiga algo', click: send('command', { type: 'gift' }) },
    { label: 'Darle un premio', click: send('command', { type: 'treat' }) },
    { type: 'separator' },
    { label: 'A rascar el poste', click: send('command', { type: 'scratch' }) },
    { label: 'Arriba del arbol', click: send('command', { type: 'tree' }) },
    { label: 'A su cueva', click: send('command', { type: 'cave' }) },
    { label: 'A su arenero', click: send('command', { type: 'litter' }) },
    { label: 'A su caja', click: send('command', { type: 'box' }) },
    { label: 'A jugar con un juguete', click: send('command', { type: 'toy' }) },
    { type: 'separator' },
    { label: 'Que venga', click: send('command', { type: 'come' }) },
    { label: 'Mandarla a su cama', click: send('command', { type: 'bed' }) },
    { label: 'Que duerma', click: send('command', { type: 'sleep' }) },
    { label: 'Dejarla en paz', click: send('command', { type: 'free' }) },
    { type: 'separator' },
    {
      label: 'Por donde anda',
      // Con un solo monitor la opcion no dice nada: no la mostramos.
      visible: multi,
      submenu: [
        {
          label: 'Solo la pantalla principal',
          type: 'radio',
          checked: settings.displayMode === 'primary',
          click: () => setDisplayMode('primary')
        },
        {
          label: 'Todas las pantallas',
          type: 'radio',
          checked: settings.displayMode === 'all',
          click: () => setDisplayMode('all')
        }
      ]
    },
    { type: 'separator', visible: multi },
    {
      label: 'Su hábitat',
      visible: HABITATS.habitats.length > 1,
      submenu: HABITATS.habitats.map((h) => ({
        label: h.label,
        type: 'radio',
        checked: currentHabitatId() === h.id,
        click: () => setHabitat(h.id)
      }))
    },
    {
      label: 'Su pinta',
      // Con una sola version no hay nada que elegir.
      visible: LOOKS.looks.length > 1,
      submenu: LOOKS.looks.map((l) => ({
        label: l.label,
        type: 'radio',
        checked: currentLook() === l.id,
        click: () => setLook(l.id)
      }))
    },
    { type: 'separator', visible: LOOKS.looks.length > 1 },
    { label: 'Esconder / mostrar', click: () => { if (win.isVisible()) win.hide(); else win.show() } },
    { label: 'Recargar', click: () => win && win.reload() },
    { label: 'Abrir su carpeta', click: () => shell.openPath(USER_DIR) },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ]))
}

// ---------------------------------------------------------------------- atajos
//
// En GNOME el icono de bandeja depende de la extension AppIndicator, que no
// siempre esta. Los atajos son el camino que siempre funciona.

const SHORTCUTS = [
  ['Control+Alt+P', 'la pelota', { type: 'play' }],
  ['Control+Alt+O', 'un premio', { type: 'treat' }],
  ['Control+Alt+C', 'la comida', { type: 'feed' }],
  ['Control+Alt+L', 'que venga', { type: 'come' }],
  ['Control+Alt+K', 'a su cama', { type: 'bed' }],
  ['Control+Alt+R', 'a rascar', { type: 'scratch' }],
  ['Control+Alt+T', 'al arbol', { type: 'tree' }],
  ['Control+Alt+A', 'al arenero', { type: 'litter' }],
  ['Control+Alt+B', 'a su caja', { type: 'box' }],
  ['Control+Alt+M', 'una mariposa', { type: 'butterfly' }],
  ['Control+Alt+J', 'un pajarito', { type: 'bird' }],
  ['Control+Alt+G', 'que te traiga algo', { type: 'gift' }]
]

/**
 * Autotest de depuracion: le inyecta un click derecho encima y saca una foto
 * de la ventana entera (el menu es DOM, asi que no sale en el canvas).
 */
function debugSelfTest () {
  const out = process.env.NALA_SHOT || path.join(ROOT, 'debug-shot.png')

  setTimeout(() => {
    const r = hotRects[0]
    if (!r) { console.warn('[nala] sin zona: no puedo probar el click derecho'); return }
    const b = win.getBounds()
    const x = Math.round(r.x + r.w / 2 - b.x)
    const y = Math.round(r.y + r.h / 2 - b.y)
    for (const type of ['mouseDown', 'mouseUp']) {
      win.webContents.sendInputEvent({ type, x, y, button: 'right', clickCount: 1 })
    }
    console.log(`[nala] click derecho inyectado en ${x},${y}`)
  }, 4000)

  const shoot = async (file, why) => {
    const img = await win.capturePage()
    fs.writeFileSync(file, img.toPNG())
    console.log(`[nala] captura (${why}) ->`, file)
  }

  setTimeout(() => shoot(out, 'menu abierto'), 5600)
  setTimeout(() => shoot(out.replace(/\.png$/, '-durmiendo.png'), 'durmiendo'), 11000)
}

function registerShortcuts () {
  const ok = []
  for (const [accel, what, cmd] of SHORTCUTS) {
    const done = globalShortcut.register(accel, () => {
      if (win && !win.isDestroyed()) win.webContents.send('command', cmd)
    })
    if (done) ok.push(`${accel} = ${what}`)
  }
  if (ok.length) console.log('[nala] atajos:', ok.join('  |  '))
  else console.warn('[nala] no pude registrar ningun atajo global')
}

// ------------------------------------------------------------------------- ipc

// El renderer nos dice donde estan sus zonas sensibles (ella y la pelota),
// en coordenadas de pantalla, y si hay que forzar la ventana solida.
ipcMain.on('hot-rects', (_e, payload) => {
  hotRects = Array.isArray(payload.rects) ? payload.rects : []
  forceInteractive = !!payload.force
  if (DEBUG && hotRects[0]) {
    const r = hotRects[0]
    console.log(`[nala] zona de Nala: ${r.x},${r.y} ${r.w}x${r.h} force=${forceInteractive}`)
  }
})

ipcMain.handle('get-config', () => loadConfig())

ipcMain.on('toggle-diary', () => toggleDiaryWindow())
ipcMain.handle('diary:get-data', () => getDiaryData())
ipcMain.handle('diary:add-note', (_e, note) => addDiaryNote(note))
ipcMain.handle('diary:get-repo-links', () => githubUrlsByProject(loadProyectos()))
ipcMain.handle('diary:get-sprite-sources', () => listSpriteSources(SF_SPRITE_DIR))
ipcMain.handle('diary:get-cards', () => getCards())
ipcMain.handle('diary:create-card', (_e, card) => createCard(card))
ipcMain.handle('diary:update-card', (_e, id, changes) => updateCard(id, changes))
ipcMain.handle('diary:delete-card', (_e, id) => deleteCard(id))
ipcMain.handle('diary:get-shares', () => getShares())
ipcMain.handle('diary:create-share', (_e, texto) => createShare(texto))
ipcMain.handle('diary:create-share-file', (_e, filePath, texto) => createShareFile(filePath, texto))
ipcMain.handle('diary:delete-share', (_e, id) => deleteShare(id))
ipcMain.handle('diary:get-share-file', (_e, id) => getShareFile(id))
ipcMain.handle('diary:pick-share-file', () => pickShareFile())
ipcMain.handle('diary:save-share-file', (_e, id, suggestedName) => saveShareFile(id, suggestedName))
ipcMain.handle('diary:get-tasks', (_e, proyectoId) => getTasks(proyectoId))
ipcMain.handle('diary:get-projects', () => getProjects())
ipcMain.handle('diary:create-project', (_e, nombre) => createProject(nombre))
ipcMain.handle('diary:delete-project', (_e, id) => deleteProject(id))
ipcMain.handle('diary:get-task', (_e, id) => getTask(id))
ipcMain.handle('diary:create-task', (_e, task) => createTask(task))
ipcMain.handle('diary:update-task', (_e, id, changes) => updateTask(id, changes))
ipcMain.handle('diary:delete-task', (_e, id) => deleteTask(id))
ipcMain.handle('diary:get-comments', (_e, taskId) => getComments(taskId))
ipcMain.handle('diary:add-comment', (_e, taskId, texto) => addComment(taskId, texto))
ipcMain.handle('diary:delete-comment', (_e, taskId, commentId) => deleteComment(taskId, commentId))
ipcMain.on('diary:open-external', (_e, url) => {
  if (typeof url === 'string' && url.startsWith('https://github.com/')) shell.openExternal(url)
})

// El menu de click derecho sobre ella tambien puede cambiarle la pinta.
ipcMain.on('cycle-look', () => cycleLook())
ipcMain.on('estado', (_e, parcial) => {
  estado = { ...estado, ...parcial, at: Date.now() }
  saveState()
})

ipcMain.on('cycle-habitat', () => cycleHabitat())
ipcMain.on('set-habitat', (_e, id) => setHabitat(id))

// ------------------------------------------------------------------------ ciclo

const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => win && win.show())

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)  // sin File/Edit/View/Window/Help, no lo usamos
    createWindow()
    const diaryWin = createDiaryWindow({
      preloadPath: path.join(__dirname, 'diary-preload.js'),
      htmlPath: path.join(ROOT, 'src', 'renderer', 'diary', 'index.html')
    })
    // El panel tapa a la gata mientras esta abierto: no tiene sentido verla
    // flotando encima de su propio dashboard. Se esconde una y aparece la otra.
    diaryWin.on('show', () => win.hide())
    diaryWin.on('hide', () => win.show())
    diaryWin.on('close', (e) => {
      if (quitting) return
      e.preventDefault()
      diaryWin.hide()
    })
    buildTray()
    startGeometryPolling()
    startPointerPolling()
    registerShortcuts()

    runDiaryScan()
    setInterval(runDiaryScan, 15 * 60 * 1000)

    // El dia que empezaron. Se graba una sola vez, la primera.
    if (!estado.desde) {
      estado.desde = new Date().toISOString().slice(0, 10)
      saveState()
      console.log('[nala] primer dia juntos:', estado.desde)
    }
    if (DEBUG) debugSelfTest()

    // Si enchufas, sacas o reconfiguras un monitor, el escenario cambia de
    // tamaño: hay que rehacer la ventana, no solo recargarla.
    for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) {
      screen.on(ev, () => { applyStage(); refreshTrayMenu() })
    }
  })

  app.on('window-all-closed', (e) => e.preventDefault())  // vive en el tray
  app.on('before-quit', () => {
    quitting = true
    saveState()
    clearInterval(geometryTimer)
    clearInterval(pointerTimer)
    globalShortcut.unregisterAll()
  })
}
