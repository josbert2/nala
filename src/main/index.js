'use strict'

const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..', '..')
const CONFIG_PATH = path.join(ROOT, 'config', 'cat.json')

// Wayland no le permite a una app posicionarse sola en pantalla, y sin eso la
// gata no puede caminar por el escritorio. Forzamos XWayland, que si lo permite.
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform', 'x11')
  app.commandLine.appendSwitch('enable-transparent-visuals')
  // Sin esto la transparencia queda negra en varios drivers de Linux.
  app.disableHardwareAcceleration()
}

let win = null
let tray = null
let geometryTimer = null
let windowProvider = null

function loadConfig () {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  } catch (err) {
    console.error('[nala] no pude leer config/cat.json:', err.message)
    return { name: 'Nala', scale: 2, moments: [], notes: [] }
  }
}

function createWindow () {
  const display = screen.getPrimaryDisplay()
  const { x, y, width, height } = display.bounds

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

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // Arranca en modo "el mouse me atraviesa". Solo se vuelve solida cuando el
  // cursor esta encima de la gata (lo decide el renderer).
  win.setIgnoreMouseEvents(true, { forward: true })

  win.loadFile(path.join(ROOT, 'src', 'renderer', 'index.html'))

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('boot', {
      config: loadConfig(),
      display: { x, y, width, height, scaleFactor: display.scaleFactor },
      platform: process.platform
    })
  })

  win.on('closed', () => { win = null })
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

function buildTray () {
  const iconPath = path.join(ROOT, 'assets', 'tray.png')
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  const cfg = loadConfig()
  tray.setToolTip(cfg.name || 'Nala')

  const send = (channel, payload) => () => win && win.webContents.send(channel, payload)

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: cfg.name || 'Nala', enabled: false },
    { type: 'separator' },
    { label: 'Servirle la comida', click: send('command', { type: 'feed' }) },
    { label: 'Sacar la pelota', click: send('command', { type: 'play' }) },
    { label: 'Darle un premio', click: send('command', { type: 'treat' }) },
    { type: 'separator' },
    { label: 'Que venga', click: send('command', { type: 'come' }) },
    { label: 'Que duerma', click: send('command', { type: 'sleep' }) },
    { label: 'Dejarla en paz', click: send('command', { type: 'free' }) },
    { type: 'separator' },
    { label: 'Esconder / mostrar', click: () => { if (win.isVisible()) win.hide(); else win.show() } },
    { label: 'Recargar', click: () => win && win.reload() },
    { label: 'Abrir carpeta', click: () => shell.openPath(ROOT) },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() }
  ]))
}

// ------------------------------------------------------------------------- ipc

ipcMain.on('set-interactive', (_e, interactive) => {
  if (!win || win.isDestroyed()) return
  win.setIgnoreMouseEvents(!interactive, { forward: true })
})

ipcMain.handle('get-config', () => loadConfig())

// ------------------------------------------------------------------------ ciclo

const singleInstance = app.requestSingleInstanceLock()
if (!singleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => win && win.show())

  app.whenReady().then(() => {
    createWindow()
    buildTray()
    startGeometryPolling()

    screen.on('display-metrics-changed', () => win && win.reload())
  })

  app.on('window-all-closed', (e) => e.preventDefault())  // vive en el tray
  app.on('before-quit', () => clearInterval(geometryTimer))
}
