'use strict'

function addDays (isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + delta)
  return utc.toISOString().slice(0, 10)
}

function commitsByProject (entries) {
  const counts = {}
  for (const e of entries) {
    if (!e.proyecto) continue
    counts[e.proyecto] = (counts[e.proyecto] || 0) + 1
  }
  return Object.entries(counts)
    .map(([proyecto, count]) => ({ proyecto, count }))
    .sort((a, b) => b.count - a.count)
}

function commitsByDay (entries, days = 7, today = new Date().toISOString().slice(0, 10)) {
  const buckets = []
  for (let i = days - 1; i >= 0; i--) {
    const fecha = addDays(today, -i)
    const count = entries.filter((e) => e.fecha === fecha).length
    buckets.push({ fecha, count })
  }
  return buckets
}

function activeHours (entries) {
  const buckets = { manana: 0, tarde: 0, noche: 0 }
  for (const e of entries) {
    if (!e.hora) continue
    const hour = parseInt(e.hora.split(':')[0], 10)
    if (hour >= 6 && hour < 12) buckets.manana++
    else if (hour >= 12 && hour < 20) buckets.tarde++
    else buckets.noche++
  }
  return buckets
}

function weeklySummary (entries, today = new Date().toISOString().slice(0, 10)) {
  const weekAgo = addDays(today, -6)
  const weekEntries = entries.filter((e) => e.fecha >= weekAgo && e.fecha <= today)
  const commitCount = weekEntries.length
  const projectCount = new Set(weekEntries.map((e) => e.proyecto).filter(Boolean)).size
  const hours = activeHours(weekEntries)
  const topSlot = Object.entries(hours).sort((a, b) => b[1] - a[1])[0]
  const slotNames = { manana: 'la mañana', tarde: 'la tarde', noche: 'la noche' }
  const horario = topSlot && topSlot[1] > 0 ? slotNames[topSlot[0]] : 'sin datos suficientes'
  return `Esta semana: ${commitCount} commits en ${projectCount} proyecto${projectCount === 1 ? '' : 's'}. Tu horario fuerte: ${horario}.`
}

module.exports = { commitsByProject, commitsByDay, activeHours, weeklySummary }
