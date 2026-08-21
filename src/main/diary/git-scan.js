'use strict'

/**
 * Parsea la salida de `git log --pretty=format:%H%x1f%ad%x1f%s
 * --date=format:%Y-%m-%d,%H:%M` en entradas de diario.
 */
function parseGitLog (rawOutput, proyecto) {
  if (!rawOutput || !rawOutput.trim()) return []
  return rawOutput.trim().split('\n').map((line) => {
    const [hash, fechaHora, mensaje] = line.split('\x1f')
    const [fecha, hora] = fechaHora.split(',')
    return { hash, fecha, hora, proyecto, tipo: 'git', mensaje, nota: null }
  })
}

module.exports = { parseGitLog }
