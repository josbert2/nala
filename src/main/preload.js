'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nala', {
  saveEstado: (e) => ipcRenderer.send('estado', e),
  onBoot: (cb) => ipcRenderer.on('boot', (_e, data) => cb(data)),
  onWindows: (cb) => ipcRenderer.on('windows', (_e, rects) => cb(rects)),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
  onPointer: (cb) => ipcRenderer.on('pointer', (_e, p) => cb(p)),
  onFlowUpdated: (cb) => ipcRenderer.on('flow-updated', (_e, flow) => cb(flow)),
  setHotRects: (rects, force) => ipcRenderer.send('hot-rects', { rects, force }),
  getConfig: () => ipcRenderer.invoke('get-config'),
  toggleDiary: () => ipcRenderer.send('toggle-diary')
})
