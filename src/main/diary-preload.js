'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('diary', {
  getData: () => ipcRenderer.invoke('diary:get-data'),
  addNote: (note) => ipcRenderer.invoke('diary:add-note', note),
  getRepoLinks: () => ipcRenderer.invoke('diary:get-repo-links'),
  openExternal: (url) => ipcRenderer.send('diary:open-external', url)
})
