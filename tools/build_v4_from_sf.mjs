#!/usr/bin/env node
// Arma el spritesheet de v4 (assets/sprites/v4/cat.png + cat.json) a partir de
// los originales de sf-sprite-nala/, mapeando por NOMBRE de carpeta.
// NO toca los originales: solo los lee. Replica la logica de watch_sf_sprite.py
// (cada frame se reescala a 128x128 y se pega en la fila que corresponde).
import Jimp from 'jimp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SF = path.join(ROOT, 'sf-sprite-nala')
const SHEET_PNG = path.join(ROOT, 'assets/sprites/v4/cat.png')
const SHEET_JSON = path.join(ROOT, 'assets/sprites/v4/cat.json')
const CELL = 128
const COLS = 8

// estado de animacion del motor  <-  carpeta de sf-sprite-nala (por nombre)
const MAP = {
  idle: 'normal',
  walk: 'caminar',
  sit: 'respirar-sentada',
  sleep: 'dormida',
  loaf: 'pan-colita',
  groom: 'lamer-pata',
  scratch: 'aruñando-a-dos-patas',
  rascarse: 'rascandose',
  dig: 'aruñando-el-piso',
  angry: 'enojada',
  alert: 'handler-click',
  blep: 'beso-respirando',
  // las alternativas/extras, al mejor estado libre que calza
  frotar: 'asicalar',
  olfatear: 'lamer-pata-2',
  amasar: 'dormida-2',
  crouch: 'pan-colita-2',
  stretch: 'respirar-sentada-full',
  yawn: 'respirar-sentada-pestañeando',
  eat: 'trabajando'
}

// Borra el fondo conectado a los bordes: un pixel es "fondo" si ya es
// transparente o si es oscuro (los 3 canales <= 45). El contorno de la gata
// (~70) frena el flood, asi el interior (pupilas, sombras) no se toca.
const floodClearBackground = (img) => {
  const { data, width, height } = img.bitmap
  const dark = (idx) => data[idx] <= 45 && data[idx + 1] <= 45 && data[idx + 2] <= 45
  const stack = []
  const push = (x, y) => { if (x >= 0 && x < width && y >= 0 && y < height) stack.push(y * width + x) }
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1) }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y) }
  const seen = new Uint8Array(width * height)
  while (stack.length) {
    const p = stack.pop()
    if (seen[p]) continue
    seen[p] = 1
    const idx = p * 4
    if (data[idx + 3] !== 0 && !dark(idx)) continue   // pared: pixel de la gata
    data[idx + 3] = 0
    const x = p % width, y = (p - x) / width
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
}

const run = async () => {
  const meta = JSON.parse(fs.readFileSync(SHEET_JSON, 'utf8'))
  const sheet = await Jimp.read(SHEET_PNG)
  const usados = new Set()
  const report = []

  for (const [anim, folder] of Object.entries(MAP)) {
    const dir = path.join(SF, folder)
    const mpath = path.join(dir, 'metadata.json')
    const spath = path.join(dir, 'spritesheet.png')
    if (!fs.existsSync(mpath) || !fs.existsSync(spath)) {
      report.push(`SKIP ${anim} <- ${folder} (falta archivo)`); continue
    }
    if (!meta.animations[anim]) { report.push(`SKIP ${anim} (no existe en cat.json)`); continue }

    const fmeta = JSON.parse(fs.readFileSync(mpath, 'utf8'))
    const frames = fmeta.frame_count || 8
    const fps = fmeta.fps || 8
    const src = await Jimp.read(spath)
    const fw = Math.floor(src.bitmap.width / frames)
    const fh = src.bitmap.height
    const row = meta.animations[anim].row

    // borrar la fila entera de verdad (poner RGBA en 0). Ojo: composite de una
    // imagen transparente NO borra (alpha 0 = no cambia el destino), por eso
    // antes se colaba el negro viejo por debajo del sprite nuevo.
    sheet.scan(0, row * CELL, CELL * COLS, CELL, (x, y, idx) => {
      sheet.bitmap.data[idx] = 0
      sheet.bitmap.data[idx + 1] = 0
      sheet.bitmap.data[idx + 2] = 0
      sheet.bitmap.data[idx + 3] = 0
    })

    for (let i = 0; i < frames && i < COLS; i++) {
      const frame = src.clone().crop(i * fw, 0, fw, fh)
      // Algunas hojas traen fondo opaco oscuro (negro puro 1,1,1 o marron
      // oscuro 30,17,16). Lo sacamos con flood-fill desde los bordes: solo
      // borra el fondo CONECTADO al borde, asi el contorno (70,58,48) hace de
      // pared y las pupilas del interior (13,17,25) quedan intactas.
      floodClearBackground(frame)
      frame.resize(CELL, CELL, Jimp.RESIZE_BICUBIC)
      sheet.composite(frame, i * CELL, row * CELL)
    }

    // sincronizar metadata de la fila y apagar el repintado de ojos (los
    // sprites reales ya traen los ojos dibujados, no hay que pintarles pupila)
    meta.animations[anim].frames = Math.min(frames, COLS)
    meta.animations[anim].fps = fps
    meta.animations[anim].eyes = Array.from({ length: Math.min(frames, COLS) }, () => [])

    usados.add(folder)
    report.push(`OK   ${anim.padEnd(9)} <- ${folder} (${frames}f @ ${fps}fps)`)
  }

  await sheet.writeAsync(SHEET_PNG)
  fs.writeFileSync(SHEET_JSON, JSON.stringify(meta, null, 2))

  const sinUsar = fs.readdirSync(SF, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !usados.has(d.name))
    .map((d) => d.name)

  console.log(report.join('\n'))
  console.log('\nSIN MAPEAR (no se tocaron, esperan destino):', sinUsar.join(', ') || '(ninguna)')
}

run().catch((e) => { console.error('ERROR', e); process.exit(1) })
