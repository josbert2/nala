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
  blep: 'beso-respirando'
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

    // limpiar la fila entera (transparente) antes de pegar
    const blank = new Jimp(CELL * COLS, CELL, 0x00000000)
    sheet.composite(blank, 0, row * CELL)

    for (let i = 0; i < frames && i < COLS; i++) {
      const frame = src.clone().crop(i * fw, 0, fw, fh)
      // Algunas hojas vienen con fondo negro opaco (1,1,1). Lo volvemos
      // transparente. Umbral <=10 en los 3 canales: saca el fondo pero
      // conserva el contorno (70,58,48) y la pupila (13,17,25).
      frame.scan(0, 0, frame.bitmap.width, frame.bitmap.height, (x, y, idx) => {
        const d = frame.bitmap.data
        if (d[idx] <= 10 && d[idx + 1] <= 10 && d[idx + 2] <= 10) d[idx + 3] = 0
      })
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
