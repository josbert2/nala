'use strict'
const fs = require('fs')
const path = require('path')

/** Carpetas de sf-sprite-nala/ que tienen un export de PixelLab (metadata.json + spritesheet.png). */
function listSpriteSources (dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const metaPath = path.join(dir, name, 'metadata.json')
    if (!fs.existsSync(metaPath)) continue
    try {
      const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      out.push({ name, metadata })
    } catch (err) {
      // carpeta con metadata.json corrupto o incompleto: se salta
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

module.exports = { listSpriteSources }
