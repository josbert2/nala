'use strict'
const { BrowserWindow, screen } = require('electron')

const WIDTH = 320

let diaryWin = null

function createDiaryWindow ({ preloadPath, htmlPath }) {
  const display = screen.getPrimaryDisplay()
  const { x, y, width, height } = display.workArea

  diaryWin = new BrowserWindow({
    x: x + width - WIDTH,
    y,
    width: WIDTH,
    height,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  diaryWin.loadFile(htmlPath)
  diaryWin.on('closed', () => { diaryWin = null })
  return diaryWin
}

function toggleDiaryWindow () {
  if (!diaryWin || diaryWin.isDestroyed()) return
  if (diaryWin.isVisible()) diaryWin.hide()
  else diaryWin.show()
}

function getDiaryWindow () {
  return diaryWin
}

module.exports = { createDiaryWindow, toggleDiaryWindow, getDiaryWindow }
