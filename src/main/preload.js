'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nala', {
  onBoot: (cb) => ipcRenderer.on('boot', (_e, data) => cb(data)),
  onWindows: (cb) => ipcRenderer.on('windows', (_e, rects) => cb(rects)),
  onCommand: (cb) => ipcRenderer.on('command', (_e, cmd) => cb(cmd)),
  setInteractive: (v) => ipcRenderer.send('set-interactive', v),
  getConfig: () => ipcRenderer.invoke('get-config')
})
