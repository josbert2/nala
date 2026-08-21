'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { scanRepo, scanAllRepos, gitUserFor } = require('../../src/main/diary/scan-repos')

function makeTempRepo () {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-repo-'))
  const run = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  run(['init', '-q'])
  run(['config', 'user.name', 'Test User'])
  run(['config', 'user.email', 'test@example.com'])
  fs.writeFileSync(path.join(dir, 'a.txt'), 'uno')
  run(['add', 'a.txt'])
  run(['commit', '-q', '-m', 'Primer commit'])
  return dir
}

test('gitUserFor: reads the local git user.name', () => {
  const dir = makeTempRepo()
  assert.equal(gitUserFor(dir), 'Test User')
})

test('gitUserFor: returns null when there is no user configured and no global fallback resolves', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-norepo-'))
  // no es un repo git en absoluto
  assert.equal(gitUserFor(dir), null)
})

test('scanRepo: first scan (no lastHash) returns the existing commit(s) and the current HEAD hash', () => {
  const dir = makeTempRepo()
  const result = scanRepo(dir, null)
  assert.equal(result.error, null)
  assert.equal(result.entries.length, 1)
  assert.equal(result.entries[0].mensaje, 'Primer commit')
  assert.equal(result.entries[0].proyecto, path.basename(dir))
  assert.match(result.hash, /^[0-9a-f]{40}$/)
})

test('scanRepo: second scan with lastHash only returns commits made after it', () => {
  const dir = makeTempRepo()
  const first = scanRepo(dir, null)

  fs.writeFileSync(path.join(dir, 'b.txt'), 'dos')
  execFileSync('git', ['add', 'b.txt'], { cwd: dir })
  execFileSync('git', ['commit', '-q', '-m', 'Segundo commit'], { cwd: dir })

  const second = scanRepo(dir, first.hash)
  assert.equal(second.entries.length, 1)
  assert.equal(second.entries[0].mensaje, 'Segundo commit')
})

test('scanAllRepos: skips a path that is not a git repo without throwing', () => {
  const notARepo = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-plain-'))
  const result = scanAllRepos([notARepo], {})
  assert.equal(result.entries.length, 0)
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].repoPath, notARepo)
})

test('scanAllRepos: combines entries across repos and tracks per-repo last hash', () => {
  const dirA = makeTempRepo()
  const dirB = makeTempRepo()
  const result = scanAllRepos([dirA, dirB], {})
  assert.equal(result.entries.length, 2)
  assert.ok(result.lastHashes[dirA])
  assert.ok(result.lastHashes[dirB])
})
