'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeGithubUrl } = require('../../src/main/diary/repo-links')

test('normalizeGithubUrl convierte remote SSH', () => {
  assert.equal(normalizeGithubUrl('git@github.com:josbert/nala.git'), 'https://github.com/josbert/nala')
})

test('normalizeGithubUrl convierte remote HTTPS', () => {
  assert.equal(normalizeGithubUrl('https://github.com/josbert/nala.git'), 'https://github.com/josbert/nala')
})

test('normalizeGithubUrl acepta HTTPS sin .git', () => {
  assert.equal(normalizeGithubUrl('https://github.com/josbert/nala'), 'https://github.com/josbert/nala')
})

test('normalizeGithubUrl devuelve null para remotes que no son de github', () => {
  assert.equal(normalizeGithubUrl('git@gitlab.com:josbert/nala.git'), null)
})

test('normalizeGithubUrl devuelve null sin remote', () => {
  assert.equal(normalizeGithubUrl(null), null)
})
