'use strict'
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { parseGitLog } = require('./git-scan')

function run (repoPath, args) {
  return execFileSync('git', args, { cwd: repoPath, encoding: 'utf8' })
}

function gitUserFor (repoPath) {
  try {
    const name = run(repoPath, ['config', 'user.name']).trim()
    if (name) return name
  } catch (err) {
    // sigue al fallback de abajo
  }
  try {
    const email = run(repoPath, ['config', 'user.email']).trim()
    return email || null
  } catch (err) {
    return null
  }
}

/** Escanea un solo repo. `lastHash` es el ultimo commit ya guardado, o null la primera vez. */
function scanRepo (repoPath, lastHash) {
  const author = gitUserFor(repoPath)
  if (!author) return { hash: lastHash, entries: [], error: 'sin git config user.name' }

  const range = lastHash ? `${lastHash}..HEAD` : 'HEAD'
  const args = ['log', range, `--author=${author}`, '--pretty=format:%H%x1f%ad%x1f%s', '--date=format:%Y-%m-%d,%H:%M']
  if (!lastHash) args.push('--max-count=50')

  try {
    const raw = run(repoPath, args)
    const proyecto = path.basename(repoPath)
    const entries = parseGitLog(raw, proyecto)
    const newestHash = run(repoPath, ['rev-parse', 'HEAD']).trim()
    return { hash: newestHash, entries, error: null }
  } catch (err) {
    return { hash: lastHash, entries: [], error: err.message }
  }
}

/** Escanea una lista de repos. `lastHashes` es { repoPath: hash }. */
function scanAllRepos (repoPaths, lastHashes) {
  const allEntries = []
  const errors = []
  const updatedHashes = { ...lastHashes }

  for (const repoPath of repoPaths) {
    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      errors.push({ repoPath, error: 'no es un repo git' })
      continue
    }
    const result = scanRepo(repoPath, lastHashes[repoPath] || null)
    if (result.error) errors.push({ repoPath, error: result.error })
    updatedHashes[repoPath] = result.hash
    allEntries.push(...result.entries)
  }

  return { entries: allEntries, lastHashes: updatedHashes, errors }
}

module.exports = { scanRepo, scanAllRepos, gitUserFor }
