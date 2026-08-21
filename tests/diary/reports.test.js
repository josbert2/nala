'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { commitsByProject, commitsByDay, activeHours, weeklySummary } = require('../../src/main/diary/reports')

const SAMPLE = [
  { fecha: '2026-08-20', hora: '09:30', proyecto: 'nala', tipo: 'git', mensaje: 'a' },
  { fecha: '2026-08-20', hora: '14:10', proyecto: 'nala', tipo: 'git', mensaje: 'b' },
  { fecha: '2026-08-19', hora: '21:00', proyecto: 'erp-mobile', tipo: 'git', mensaje: 'c' },
  { fecha: '2026-08-18', hora: '10:00', proyecto: null, tipo: 'manual', mensaje: 'nota' }
]

test('commitsByProject: counts and sorts descending, ignores entries with no project', () => {
  assert.deepEqual(commitsByProject(SAMPLE), [
    { proyecto: 'nala', count: 2 },
    { proyecto: 'erp-mobile', count: 1 }
  ])
})

test('commitsByDay: returns a bucket per day for the requested range, in order', () => {
  const buckets = commitsByDay(SAMPLE, 3, '2026-08-20')
  assert.deepEqual(buckets, [
    { fecha: '2026-08-18', count: 1 },
    { fecha: '2026-08-19', count: 1 },
    { fecha: '2026-08-20', count: 2 }
  ])
})

test('activeHours: buckets into manana/tarde/noche', () => {
  // SAMPLE hours: 09:30, 14:10, 21:00, 10:00 -> manana(09:30,10:00)=2, tarde(14:10)=1, noche(21:00)=1
  assert.deepEqual(activeHours(SAMPLE), { manana: 2, tarde: 1, noche: 1 })
})

test('activeHours: entries without hora are ignored', () => {
  assert.deepEqual(activeHours([{ hora: null }]), { manana: 0, tarde: 0, noche: 0 })
})

test('weeklySummary: mentions commit count, project count and busiest slot', () => {
  const text = weeklySummary(SAMPLE, '2026-08-20')
  assert.match(text, /4 commits/)
  assert.match(text, /2 proyectos/)
  // busiest slot is manana (2 entries: 09:30 and 10:00) vs tarde/noche (1 each)
  assert.match(text, /la mañana/)
})

test('weeklySummary: singular "proyecto" when there is exactly one', () => {
  const oneProject = [{ fecha: '2026-08-20', hora: '10:00', proyecto: 'nala', tipo: 'git', mensaje: 'a' }]
  const text = weeklySummary(oneProject, '2026-08-20')
  assert.match(text, /1 commits en 1 proyecto\./)
})
