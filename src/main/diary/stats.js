'use strict'

function addDays (isoDate, delta) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function computeHeatmap (entries) {
  const counts = {}
  for (const e of entries) {
    counts[e.fecha] = (counts[e.fecha] || 0) + 1
  }
  return counts
}

function computeStreak (days, today = new Date().toISOString().slice(0, 10)) {
  const daySet = new Set(days)
  if (daySet.size === 0) return 0
  let cursor = daySet.has(today) ? today : addDays(today, -1)
  if (!daySet.has(cursor)) return 0
  let streak = 0
  while (daySet.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

function computeStats (entries, today = new Date().toISOString().slice(0, 10)) {
  const heatmap = computeHeatmap(entries)
  const days = Object.keys(heatmap).sort()
  return {
    totalEntries: entries.length,
    activeDays: days.length,
    streak: computeStreak(days, today),
    heatmap
  }
}

module.exports = { computeStats, computeStreak, computeHeatmap }
