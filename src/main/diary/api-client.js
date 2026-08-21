'use strict'

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

module.exports = { fetchDiaryData, bulkInsert, addNote, getCards, createCard, updateCard, deleteCard }
