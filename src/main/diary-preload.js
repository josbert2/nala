'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('diary', {
  getData: () => ipcRenderer.invoke('diary:get-data'),
  addNote: (note) => ipcRenderer.invoke('diary:add-note', note),
  getRepoLinks: () => ipcRenderer.invoke('diary:get-repo-links'),
  getSpriteSources: () => ipcRenderer.invoke('diary:get-sprite-sources'),
  openExternal: (url) => ipcRenderer.send('diary:open-external', url),
  getCards: () => ipcRenderer.invoke('diary:get-cards'),
  createCard: (card) => ipcRenderer.invoke('diary:create-card', card),
  updateCard: (id, changes) => ipcRenderer.invoke('diary:update-card', id, changes),
  deleteCard: (id) => ipcRenderer.invoke('diary:delete-card', id)
})
