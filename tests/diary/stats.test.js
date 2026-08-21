'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { computeStats, computeStreak, computeHeatmap } = require('../../src/main/diary/stats')

test('computeHeatmap: counts entries per day', () => {
  const entries = [
    { fecha: '2026-08-20' }, { fecha: '2026-08-20' }, { fecha: '2026-08-19' }
  ]
  assert.deepEqual(computeHeatmap(entries), { '2026-08-20': 2, '2026-08-19': 1 })
})

test('computeStreak: counts consecutive days ending today', () => {
  const days = ['2026-08-18', '2026-08-19', '2026-08-20']
  assert.equal(computeStreak(days, '2026-08-20'), 3)
})

test('computeStreak: today with no entry yet still counts yesterday\'s streak', () => {
  const days = ['2026-08-18', '2026-08-19']
  assert.equal(computeStreak(days, '2026-08-20'), 2)
})

test('computeStreak: a gap breaks the streak', () => {
  const days = ['2026-08-15', '2026-08-19', '2026-08-20']
  assert.equal(computeStreak(days, '2026-08-20'), 2)
})

test('computeStreak: no entries at all is a streak of 0', () => {
  assert.equal(computeStreak([], '2026-08-20'), 0)
})

test('computeStreak: last entry two days ago is a streak of 0', () => {
  assert.equal(computeStreak(['2026-08-17'], '2026-08-20'), 0)
})

test('computeStats: combines totals, active days and streak', () => {
  const entries = [
    { fecha: '2026-08-19' }, { fecha: '2026-08-19' }, { fecha: '2026-08-20' }
  ]
  const stats = computeStats(entries, '2026-08-20')
  assert.equal(stats.totalEntries, 3)
  assert.equal(stats.activeDays, 2)
  assert.equal(stats.streak, 2)
  assert.deepEqual(stats.heatmap, { '2026-08-19': 2, '2026-08-20': 1 })
})
