'use strict'
const { BrowserWindow, screen } = require('electron')

const WIDTH = 1480
const HEIGHT = 920

let diaryWin = null

function createDiaryWindow ({ preloadPath, htmlPath }) {
  const { workArea } = screen.getPrimaryDisplay()
  const w = Math.min(WIDTH, workArea.width - 40)
  const h = Math.min(HEIGHT, workArea.height - 40)

  diaryWin = new BrowserWindow({
    x: workArea.x + Math.round((workArea.width - w) / 2),
    y: workArea.y + Math.round((workArea.height - h) / 2),
    width: w,
    height: h,
    show: false,
    frame: false,
    resizable: true,
    minWidth: 700,
    minHeight: 500,
    title: 'Nala Dev Diary',
    backgroundColor: '#ece5d8',
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
  else { diaryWin.show(); diaryWin.focus() }
}

function getDiaryWindow () {
  return diaryWin
}

module.exports = { createDiaryWindow, toggleDiaryWindow, getDiaryWindow }
