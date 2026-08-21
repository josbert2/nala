'use strict'
const fs = require('fs')
const path = require('path')

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
  if (res.status === 204) return null
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

async function getCards (config) {
  const { cards } = await apiFetch(config, '/api/cards')
  return cards
}

async function createCard (config, card) {
  const { card: created } = await apiFetch(config, '/api/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(card)
  })
  return created
}

async function updateCard (config, id, changes) {
  const { card: updated } = await apiFetch(config, `/api/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })
  return updated
}

async function deleteCard (config, id) {
  await apiFetch(config, `/api/cards/${id}`, { method: 'DELETE' })
}

async function getShares (config) {
  const { shares } = await apiFetch(config, '/api/shares')
  return shares
}

async function createShare (config, { texto }) {
  const { share } = await apiFetch(config, '/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto })
  })
  return share
}

/** `filePath` es una ruta local real (del dialogo nativo o de un drag and drop). */
async function createShareFile (config, { filePath, texto }) {
  if (!config.apiUrl) throw new Error('servidor no configurado (config/servidor.json)')
  const buffer = fs.readFileSync(filePath)
  const form = new FormData()
  if (texto) form.append('texto', texto)
  form.append('file', new Blob([buffer]), path.basename(filePath))

  const res = await fetch(`${config.apiUrl}/api/shares`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiToken}` },
    body: form
  })
  if (!res.ok) throw new Error(`server respondio ${res.status}`)
  return (await res.json()).share
}

async function deleteShare (config, id) {
  await apiFetch(config, `/api/shares/${id}`, { method: 'DELETE' })
}

/** Trae el archivo de un share y lo devuelve como base64 para mostrarlo en el renderer. */
async function getShareFile (config, id) {
  if (!config.apiUrl) throw new Error('servidor no configurado (config/servidor.json)')
  const res = await fetch(`${config.apiUrl}/api/shares/${id}/file`, {
    headers: { Authorization: `Bearer ${config.apiToken}` }
  })
  if (!res.ok) throw new Error(`server respondio ${res.status}`)
  const mime = res.headers.get('content-type') || 'application/octet-stream'
  const buffer = Buffer.from(await res.arrayBuffer())
  return { mime, base64: buffer.toString('base64') }
}

async function getTasks (config, proyectoId) {
  const { tasks } = await apiFetch(config, `/api/tasks?proyectoId=${proyectoId}`)
  return tasks
}

async function getProjects (config) {
  const { projects } = await apiFetch(config, '/api/projects')
  return projects
}

async function createProject (config, nombre) {
  const { project } = await apiFetch(config, '/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre })
  })
  return project
}

async function deleteProject (config, id) {
  await apiFetch(config, `/api/projects/${id}`, { method: 'DELETE' })
}

async function getTask (config, id) {
  const { task } = await apiFetch(config, `/api/tasks/${id}`)
  return task
}

async function createTask (config, task) {
  const { task: created } = await apiFetch(config, '/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  })
  return created
}

async function updateTask (config, id, changes) {
  const { task: updated } = await apiFetch(config, `/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })
  return updated
}

async function deleteTask (config, id) {
  await apiFetch(config, `/api/tasks/${id}`, { method: 'DELETE' })
}

async function getComments (config, taskId) {
  const { comments } = await apiFetch(config, `/api/tasks/${taskId}/comments`)
  return comments
}

async function addComment (config, taskId, texto) {
  const { comment } = await apiFetch(config, `/api/tasks/${taskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto })
  })
  return comment
}

async function deleteComment (config, taskId, commentId) {
  await apiFetch(config, `/api/tasks/${taskId}/comments/${commentId}`, { method: 'DELETE' })
}

module.exports = {
  fetchDiaryData,
  bulkInsert,
  addNote,
  getCards,
  createCard,
  updateCard,
  deleteCard,
  getShares,
  createShare,
  createShareFile,
  deleteShare,
  getShareFile,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getComments,
  addComment,
  deleteComment,
  getProjects,
  createProject,
  deleteProject
}
