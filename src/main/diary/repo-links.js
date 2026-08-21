'use strict'
const path = require('path')
const { execFileSync } = require('child_process')

function normalizeGithubUrl (remote) {
  if (!remote) return null
  let m = remote.match(/^git@github\.com:(.+?)(\.git)?$/)
  if (m) return `https://github.com/${m[1]}`
  m = remote.match(/^https:\/\/github\.com\/(.+?)(\.git)?$/)
  if (m) return `https://github.com/${m[1]}`
  return null
}

function repoGithubUrl (repoPath) {
  try {
    const remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      cwd: repoPath, encoding: 'utf8'
    }).trim()
    return normalizeGithubUrl(remote)
  } catch (err) {
    return null
  }
}

/** { proyecto: 'https://github.com/owner/repo' } para los repos con remote de GitHub. */
function githubUrlsByProject (repoPaths) {
  const map = {}
  for (const repoPath of repoPaths) {
    const url = repoGithubUrl(repoPath)
    if (url) map[path.basename(repoPath)] = url
  }
  return map
}

module.exports = { normalizeGithubUrl, githubUrlsByProject }
