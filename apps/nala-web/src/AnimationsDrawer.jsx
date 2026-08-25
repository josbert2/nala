import { useEffect, useRef, useState } from 'react'
import './drawer.css'

const PREVIEW = 96

// Las 19 carpetas de sf-sprite-nala, con el estado del motor que dispara cada
// una y una etiqueta linda. El orden es el del drawer.
const FOLDERS = [
  { folder: 'normal', state: 'idle', label: 'Normal' },
  { folder: 'caminar', state: 'walk', label: 'Caminar' },
  { folder: 'respirar-sentada', state: 'sit', label: 'Sentada' },
  { folder: 'respirar-sentada-full', state: 'stretch', label: 'Sentada full' },
  { folder: 'respirar-sentada-pestañeando', state: 'yawn', label: 'Sentada (parpadeo)' },
  { folder: 'dormida', state: 'sleep', label: 'Dormida' },
  { folder: 'dormida-2', state: 'amasar', label: 'Dormida 2' },
  { folder: 'pan-colita', state: 'loaf', label: 'Pan' },
  { folder: 'pan-colita-2', state: 'crouch', label: 'Pan 2' },
  { folder: 'lamer-pata', state: 'groom', label: 'Lamer pata' },
  { folder: 'lamer-pata-2', state: 'olfatear', label: 'Lamer pata 2' },
  { folder: 'asicalar', state: 'frotar', label: 'Asicalar' },
  { folder: 'rascandose', state: 'rascarse', label: 'Rascándose' },
  { folder: 'aruñando-a-dos-patas', state: 'scratch', label: 'Arañar (2 patas)' },
  { folder: 'aruñando-el-piso', state: 'dig', label: 'Arañar piso' },
  { folder: 'enojada', state: 'angry', label: 'Enojada' },
  { folder: 'handler-click', state: 'alert', label: 'Alzada' },
  { folder: 'beso-respirando', state: 'blep', label: 'Beso' },
  { folder: 'trabajando', state: 'eat', label: 'Trabajando' }
]

// Saca el fondo opaco oscuro (negro puro o marrón) conservando contorno y
// pupila. Se corre una vez por frame al pre-renderizar, no en cada rAF.
function keyOut (imgData) {
  const d = imgData.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] <= 45 && d[i + 1] <= 45 && d[i + 2] <= 45 && d[i] >= d[i + 2]) d[i + 3] = 0
  }
  return imgData
}

async function loadFolder (item) {
  const enc = encodeURIComponent(item.folder)
  const meta = await fetch(`/sf-sprite-nala/${enc}/metadata.json`).then((r) => r.json())
  const frames = meta.frame_count || 8
  const fps = meta.fps || 8
  const img = await new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im); im.onerror = rej
    im.src = `/sf-sprite-nala/${enc}/spritesheet.png`
  })
  const fw = Math.floor(img.width / frames)
  const fh = img.height
  // Pre-render de cada frame a PREVIEW px, con el fondo limpiado.
  const canvases = []
  for (let i = 0; i < frames; i++) {
    const c = document.createElement('canvas')
    c.width = PREVIEW; c.height = PREVIEW
    const g = c.getContext('2d')
    g.imageSmoothingEnabled = false
    g.drawImage(img, i * fw, 0, fw, fh, 0, 0, PREVIEW, PREVIEW)
    g.putImageData(keyOut(g.getImageData(0, 0, PREVIEW, PREVIEW)), 0, 0)
    canvases.push(c)
  }
  return { ...item, frames: canvases, fps }
}

export default function AnimationsDrawer () {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(null)
  const dataRef = useRef({})       // folder -> {frames:[canvas], fps}
  const viewRef = useRef({})       // folder -> visible canvas

  useEffect(() => {
    let alive = true
    Promise.all(FOLDERS.map((it) => loadFolder(it).catch(() => null))).then((res) => {
      if (!alive) return
      for (const r of res) if (r) dataRef.current[r.folder] = r
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const onCtx = (e) => { e.preventDefault(); setOpen((v) => !v) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('contextmenu', onCtx)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('contextmenu', onCtx)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    let raf = 0
    const start = performance.now()
    const tick = (now) => {
      const t = (now - start) / 1000
      for (const it of FOLDERS) {
        const data = dataRef.current[it.folder]
        const cv = viewRef.current[it.folder]
        if (!data || !cv || !data.frames.length) continue
        const frame = data.frames[Math.floor(t * data.fps) % data.frames.length]
        if (!frame) continue          // frame aún no listo: lo saltamos, no rompemos el loop
        const g = cv.getContext('2d')
        g.clearRect(0, 0, PREVIEW, PREVIEW)
        g.drawImage(frame, 0, 0)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open])

  const play = (it) => {
    setActive(it.folder)
    if (window.nala && window.nala.sendCommand) {
      window.nala.sendCommand({ type: 'anim', name: it.state, hold: 6000 })
    }
  }

  return (
    <>
      {open && <div className="nd-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`nd-drawer${open ? ' nd-open' : ''}`} aria-hidden={!open}>
        <header className="nd-head">
          <div>
            <div className="nd-title">Sus animaciones</div>
            <div className="nd-sub">sf-sprite-nala · {FOLDERS.length} · tocá una</div>
          </div>
          <button className="nd-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
        </header>
        <div className="nd-grid">
          {FOLDERS.map((it) => (
            <button
              key={it.folder}
              className={`nd-card${active === it.folder ? ' nd-active' : ''}`}
              onClick={() => play(it)}
              title={it.folder}
            >
              <canvas
                width={PREVIEW}
                height={PREVIEW}
                ref={(el) => { if (el) viewRef.current[it.folder] = el }}
              />
              <span className="nd-label">{it.label}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
