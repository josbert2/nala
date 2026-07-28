'use strict'

const { execFile } = require('child_process')
const { promisify } = require('util')
const pexec = promisify(execFile)

const IGNORE = /^(Desktop|nala|Nala)$/

// --- 1. GNOME Shell (funciona bajo Wayland) --------------------------------
// Requiere instalar gnome-extension/. Ver README.
async function fromGnome () {
  const { stdout } = await pexec('gdbus', [
    'call', '--session',
    '--dest', 'org.gnome.Shell',
    '--object-path', '/dev/josbert/DeskCat',
    '--method', 'dev.josbert.DeskCat.GetWindows'
  ], { timeout: 1500 })

  // gdbus devuelve: ('[{...}]',)
  const m = stdout.match(/\('(.*)',\)\s*$/s)
  if (!m) throw new Error('respuesta inesperada de gdbus')
  const json = m[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  return JSON.parse(json)
}

// --- 2. X11 puro -----------------------------------------------------------
async function fromWmctrl () {
  const { stdout } = await pexec('wmctrl', ['-lG'], { timeout: 1500 })
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // id  desktop  x  y  w  h  host  title...
      const p = line.trim().split(/\s+/)
      if (p.length < 8) return null
      return {
        x: +p[2],
        y: +p[3],
        w: +p[4],
        h: +p[5],
        title: p.slice(7).join(' ')
      }
    })
    .filter(Boolean)
}

let strategy = null

module.exports = {
  name: 'linux',
  async list () {
    if (!strategy) {
      // Se elige una sola vez, la primera que responda.
      for (const [name, fn] of [['gnome', fromGnome], ['wmctrl', fromWmctrl]]) {
        try {
          const r = await fn()
          strategy = fn
          console.log(`[nala] geometria de ventanas via ${name}`)
          return clean(r)
        } catch (err) { /* probar la siguiente */ }
      }
      throw new Error(
        'ni la extension de GNOME ni wmctrl estan disponibles ' +
        '(instala gnome-extension/ o `apt install wmctrl`)'
      )
    }
    return clean(await strategy())
  }
}

function clean (rects) {
  return rects
    .filter((r) => r && r.w > 120 && r.h > 80 && !IGNORE.test(r.title || ''))
    .map((r) => ({ x: r.x, y: r.y, w: r.w, h: r.h, title: r.title || '' }))
}
