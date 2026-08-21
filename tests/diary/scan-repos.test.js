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

test('gitUserFor: returns null when the repo has no local user.name and the (scoped) global config has none either', () => {
  // repo git real, sin `user.name` local
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-repo-noconfig-'))
  execFileSync('git', ['init', '-q'], { cwd: dir })

  // HOME apuntando a un directorio sin .gitconfig, para que git tampoco encuentre un global
  const emptyFakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-fakehome-empty-'))

  const originalHome = process.env.HOME
  const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM
  process.env.HOME = emptyFakeHome
  process.env.GIT_CONFIG_NOSYSTEM = '1' // ignora /etc/gitconfig para que el test no dependa de la maquina
  try {
    assert.equal(gitUserFor(dir), null)
  } finally {
    process.env.HOME = originalHome
    if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM
    else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem
  }
})

test('gitUserFor: falls back to the global git config when the repo has no local user.name', () => {
  // repo git real, sin `user.name` local
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-repo-globalfallback-'))
  execFileSync('git', ['init', '-q'], { cwd: dir })

  // HOME apuntando a un directorio con un .gitconfig propio (no el del developer real)
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-fakehome-'))
  fs.writeFileSync(path.join(fakeHome, '.gitconfig'), '[user]\n\tname = Global Fallback User\n')

  const originalHome = process.env.HOME
  const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM
  process.env.HOME = fakeHome
  process.env.GIT_CONFIG_NOSYSTEM = '1'
  try {
    assert.equal(gitUserFor(dir), 'Global Fallback User')
  } finally {
    process.env.HOME = originalHome
    if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM
    else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem
  }
})

test('gitUserFor: prefers the local user.name over the global fallback when both are set', () => {
  const dir = makeTempRepo() // ya tiene user.name local = 'Test User'

  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-fakehome-prefer-'))
  fs.writeFileSync(path.join(fakeHome, '.gitconfig'), '[user]\n\tname = Global Fallback User\n')

  const originalHome = process.env.HOME
  process.env.HOME = fakeHome
  try {
    assert.equal(gitUserFor(dir), 'Test User')
  } finally {
    process.env.HOME = originalHome
  }
})

test('gitUserFor: falls back to user.email when the repo has no local or global user.name but does have a global user.email', () => {
  // repo git real, sin `user.name` ni `user.email` local
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-repo-emailfallback-'))
  execFileSync('git', ['init', '-q'], { cwd: dir })

  // HOME apuntando a un .gitconfig que solo trae user.email, sin user.name
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-fakehome-email-'))
  fs.writeFileSync(path.join(fakeHome, '.gitconfig'), '[user]\n\temail = fallback@example.com\n')

  const originalHome = process.env.HOME
  const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM
  process.env.HOME = fakeHome
  process.env.GIT_CONFIG_NOSYSTEM = '1'
  try {
    assert.equal(gitUserFor(dir), 'fallback@example.com')
  } finally {
    process.env.HOME = originalHome
    if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM
    else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem
  }
})

test('scanRepo: scans and returns commits when only user.email is configured (no user.name anywhere)', () => {
  // repo git real, sin `user.name` ni `user.email` local
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-repo-scan-emailonly-'))
  const run = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  run(['init', '-q'])

  // HOME apuntando a un .gitconfig que solo trae user.email, sin user.name
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'diary-fakehome-scan-email-'))
  fs.writeFileSync(path.join(fakeHome, '.gitconfig'), '[user]\n\temail = fallback@example.com\n')

  const originalHome = process.env.HOME
  const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM
  process.env.HOME = fakeHome
  process.env.GIT_CONFIG_NOSYSTEM = '1'
  try {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'uno')
    run(['add', 'a.txt'])
    run(['commit', '-q', '-m', 'Commit con solo email'])

    const result = scanRepo(dir, null)
    assert.equal(result.error, null)
    assert.equal(result.entries.length, 1)
    assert.equal(result.entries[0].mensaje, 'Commit con solo email')
    assert.match(result.hash, /^[0-9a-f]{40}$/)
  } finally {
    process.env.HOME = originalHome
    if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM
    else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem
  }
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
