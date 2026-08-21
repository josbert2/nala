'use strict'

function addDays (isoDate, delta) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + delta)
  return utc.toISOString().slice(0, 10)
}

function computeHeatmap (entries) {
  const counts = {}
  for (const e of entries) {
    counts[e.fecha] = (counts[e.fecha] || 0) + 1
  }
  return counts
}

// If today has no entry yet, count from yesterday's streak instead of showing 0 —
// an entry can still be logged later today without the streak flickering to zero.
function computeStreak (days, today = new Date().toISOString().slice(0, 10)) {
  const daySet = new Set(days)
  if (daySet.size === 0) return 0
  let cursor = daySet.has(today) ? today : addDays(today, -1)
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

module.exports = { computeHeatmap, computeStreak, computeStats }
