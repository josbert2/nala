'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nala', {
  cycleHabitat: () => ipcRenderer.send('cycle-habitat'),
  onBoot: (cb) => ipcRenderer.on('boot', (_e, data) => cb(data)),
  onWindows: (cb) => ipcRenderer.on('windows', (_e, rects) => cb(rects)),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
  onPointer: (cb) => ipcRenderer.on('pointer', (_e, p) => cb(p)),
  setHotRects: (rects, force) => ipcRenderer.send('hot-rects', { rects, force }),
  getConfig: () => ipcRenderer.invoke('get-config'),
  cycleLook: () => ipcRenderer.send('cycle-look')
})
