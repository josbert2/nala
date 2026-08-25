import { useEffect, useRef } from 'react'
import './nala.css'   // estilos del engine (tip / stats / bubble), symlink

// Provee window.nala (lo que en Electron da preload.js) y arranca el engine.
function installShim () {
  if (window.nala) return
  let bootCb = null
  let bootData = null
  let pointerCb = null
  let commandCb = null
  const noop = () => {}
  const fireBoot = () => { if (bootCb && bootData) bootCb(bootData) }

  window.nala = {
    onBoot (cb) { bootCb = cb; fireBoot() },
    onWindows (cb) { cb([]) },
    onCommand (cb) { commandCb = cb },
    sendCommand (cmd) { if (commandCb) commandCb(cmd) },   // el drawer dispara animaciones
    onPointer (cb) { pointerCb = cb },
    onFlowUpdated: noop,
    setHotRects: noop,
    saveEstado (e) {
      try { localStorage.setItem('nala-estado', JSON.stringify({ ...e, at: Date.now() })) } catch (_) {}
    },
    toggleDiary () { /* en web el click derecho abre el drawer de animaciones */ },
    setLook (id) { try { localStorage.setItem('nala-look', id) } catch (_) {} location.reload() },
    setHabitat (id) { try { localStorage.setItem('nala-habitat', id) } catch (_) {} location.reload() }
  }

  window.addEventListener('mousemove', (e) => {
    if (pointerCb) pointerCb({ x: e.clientX, y: e.clientY })
  })

  const getJSON = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  Promise.all([
    getJSON('/config/cat.json'),
    getJSON('/assets/sprites/looks.json'),
    getJSON('/config/habitats.json')
  ]).then(([config, looksIdx, habIdx]) => {
    config = config || { name: 'Nala', scale: 1, moments: [], notes: [] }
    looksIdx = looksIdx || { default: 'v4', looks: [{ id: 'v4', label: 'v4' }] }
    habIdx = habIdx || { default: 'casa', habitats: [{ id: 'casa', label: 'Su casa', pieces: [] }] }

    const lookId = localStorage.getItem('nala-look') || looksIdx.default
    const habId = localStorage.getItem('nala-habitat') || habIdx.default
    const habitat = (habIdx.habitats || []).find((h) => h.id === habId) || habIdx.habitats[0]

    let estado = {}
    try { estado = JSON.parse(localStorage.getItem('nala-estado')) || {} } catch (_) {}

    const W = window.innerWidth
    const H = window.innerHeight
    bootData = {
      config,
      display: {
        x: 0, y: 0, width: W, height: H,
        scaleFactor: window.devicePixelRatio || 1,
        displays: [{ x: 0, y: 0, width: W, height: H, floorY: H, primary: true }]
      },
      look: lookId,
      looks: (looksIdx.looks || []).map((l) => ({ id: l.id, label: l.label })),
      habitat,
      habitats: (habIdx.habitats || []).map((h) => ({ id: h.id, label: h.label })),
      estado,
      flow: { edges: [] },
      platform: 'web',
      debug: false
    }
    fireBoot()
  })
}

export default function NalaStage () {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    installShim()
    // El engine agarra #stage/#tip/#stats/#bubble por id; ya están en el DOM.
    // Las rutas de assets del engine son relativas al documento (/assets), que
    // servimos por symlink en public/.
    import('./nala-main.js')
  }, [])

  return (
    <>
      <canvas id="stage" />
      <div id="tip" className="tip" hidden />
      <div id="stats" className="stats" hidden />
      <div id="bubble" className="bubble" hidden />
    </>
  )
}
