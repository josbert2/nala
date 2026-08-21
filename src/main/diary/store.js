'use strict'
const fs = require('fs')
const path = require('path')

function loadDiary (diaryPath) {
  try {
    const raw = fs.readFileSync(diaryPath, 'utf8')
    const data = JSON.parse(raw)
    return { entries: data.entries || [], lastHashes: data.lastHashes || {} }
  } catch (err) {
    return { entries: [], lastHashes: {} }
  }
}

function saveDiary (diaryPath, diary) {
  fs.mkdirSync(path.dirname(diaryPath), { recursive: true })
  fs.writeFileSync(diaryPath, JSON.stringify(diary, null, 2))
}

function appendEntries (diary, newEntries) {
  const seenHashes = new Set(diary.entries.filter((e) => e.hash).map((e) => e.hash))
  const toAdd = newEntries.filter((e) => !e.hash || !seenHashes.has(e.hash))
  return { ...diary, entries: [...diary.entries, ...toAdd] }
}

function addManualNote (diary, { mensaje, proyecto = null }) {
  const now = new Date()
  const entry = {
    hash: null,
    fecha: now.toISOString().slice(0, 10),
    hora: now.toTimeString().slice(0, 5),
    proyecto,
    tipo: 'manual',
    mensaje,
    nota: null
  }
  return { ...diary, entries: [...diary.entries, entry] }
}

module.exports = { loadDiary, saveDiary, appendEntries, addManualNote }
