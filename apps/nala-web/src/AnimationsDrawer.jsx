import { useEffect, useRef, useState } from 'react'
import './drawer.css'

const CELL = 128
const PREVIEW = 96

// Nombres lindos para las animaciones (cae al id si no está).
const LABELS = {
  idle: 'Tranqui', walk: 'Caminando', sit: 'Sentada', sleep: 'Durmiendo',
  loaf: 'Pan', groom: 'Lamiéndose', scratch: 'Rascando', rascarse: 'Rascándose',
  dig: 'Escarbando', angry: 'Enojada', alert: 'Atenta', blep: 'Blep',
  frotar: 'Restregándose', olfatear: 'Olfateando', amasar: 'Amasando',
  crouch: 'Agazapada', stretch: 'Estirándose', yawn: 'Bostezando', eat: 'Trabajando',
  run: 'Corriendo', fall: 'Cayendo', climb: 'Trepando', stalk: 'Acechando',
  rear: 'Manoteando', sacudirse: 'Sacudiéndose', startle: 'Sobresalto',
  pounce: 'Salto', play: 'Jugando', slide: 'Derrapando'
}

export default function AnimationsDrawer () {
  const [open, setOpen] = useState(false)
  const [anims, setAnims] = useState([])   // [{name, row, frames, fps}]
  const [active, setActive] = useState(null)
  const sheetRef = useRef(null)            // Image de cat.png
  const canvasesRef = useRef({})           // name -> canvas

  // Cargar las animaciones del look actual una sola vez.
  useEffect(() => {
    const look = localStorage.getItem('nala-look') || 'v4'
    const base = `/assets/sprites/${look}`
    fetch(`${base}/cat.json`).then((r) => r.json()).then((meta) => {
      const list = Object.entries(meta.animations || {}).map(([name, a]) => ({
        name, row: a.row, frames: a.frames || 1, fps: a.fps || 8
      }))
      setAnims(list)
      const img = new Image()
      img.onload = () => { sheetRef.current = img }
      img.src = `${base}/cat.png`
    }).catch(() => {})
  }, [])

  // Click derecho en cualquier lado abre/cierra el drawer.
  useEffect(() => {
    const onCtx = (e) => { e.preventDefault(); setOpen((v) => !v) }
    window.addEventListener('contextmenu', onCtx)
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('contextmenu', onCtx)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Previews animados: un solo rAF dibuja el frame actual de cada animación.
  useEffect(() => {
    if (!open) return
    let raf = 0
    const start = performance.now()
    const tick = (now) => {
      const img = sheetRef.current
      if (img) {
        const t = (now - start) / 1000
        for (const a of anims) {
          const cv = canvasesRef.current[a.name]
          if (!cv) continue
          const g = cv.getContext('2d')
          const f = Math.floor(t * a.fps) % a.frames
          g.clearRect(0, 0, PREVIEW, PREVIEW)
          g.imageSmoothingEnabled = false
          g.drawImage(img, f * CELL, a.row * CELL, CELL, CELL, 0, 0, PREVIEW, PREVIEW)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open, anims])

  const play = (name) => {
    setActive(name)
    if (window.nala && window.nala.sendCommand) {
      window.nala.sendCommand({ type: 'anim', name, hold: 6000 })
    }
  }

  return (
    <>
      {open && <div className="nd-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`nd-drawer${open ? ' nd-open' : ''}`} aria-hidden={!open}>
        <header className="nd-head">
          <div>
            <div className="nd-title">Sus animaciones</div>
            <div className="nd-sub">{anims.length} · tocá una para que la haga</div>
          </div>
          <button className="nd-close" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
        </header>
        <div className="nd-grid">
          {anims.map((a) => (
            <button
              key={a.name}
              className={`nd-card${active === a.name ? ' nd-active' : ''}`}
              onClick={() => play(a.name)}
              title={a.name}
            >
              <canvas
                width={PREVIEW}
                height={PREVIEW}
                ref={(el) => { if (el) canvasesRef.current[a.name] = el }}
              />
              <span className="nd-label">{LABELS[a.name] || a.name}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  )
}
