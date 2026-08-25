/* web-shim.js — puente para correr el MISMO engine de Nala en el navegador.
 *
 * En Electron, `window.nala` lo provee preload.js (IPC con el proceso principal).
 * Acá lo emulamos: config/hábitats/looks salen de los JSON estáticos, el estado
 * va a localStorage, y el puntero se toma del DOM (en Electron lo reenviaba el
 * proceso principal). Debe ser un <script> CLÁSICO y cargar ANTES del módulo
 * main.js, así `window.nala` ya existe cuando el engine arranca.
 */
(function () {
  let bootCb = null
  let bootData = null
  let pointerCb = null
  const cbs = {}
  const noop = () => {}

  const fireBoot = () => { if (bootCb && bootData) bootCb(bootData) }

  window.nala = {
    onBoot (cb) { bootCb = cb; fireBoot() },
    onWindows (cb) { cbs.windows = cb; cb([]) },   // en web no hay ventanas del SO
    onCommand (cb) { cbs.command = cb },
    onPointer (cb) { pointerCb = cb },
    onFlowUpdated (cb) { cbs.flow = cb },
    setHotRects: noop,                              // no hay click-through en web
    saveEstado (e) {
      try { localStorage.setItem('nala-estado', JSON.stringify({ ...e, at: Date.now() })) } catch (_) {}
    },
    toggleDiary () { window.open('diary/index.html', 'nala-diary') },
    setLook (id) { try { localStorage.setItem('nala-look', id) } catch (_) {} location.reload() },
    setHabitat (id) { try { localStorage.setItem('nala-habitat', id) } catch (_) {} location.reload() }
  }

  // El puntero: en Electron lo reenvía el main; acá va directo del DOM.
  window.addEventListener('mousemove', (e) => {
    if (pointerCb) pointerCb({ x: e.clientX, y: e.clientY })
  })

  const getJSON = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null)

  Promise.all([
    getJSON('../../config/cat.json'),
    getJSON('../../assets/sprites/looks.json'),
    getJSON('../../config/habitats.json')
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
    const display = {
      x: 0, y: 0, width: W, height: H,
      scaleFactor: window.devicePixelRatio || 1,
      displays: [{ x: 0, y: 0, width: W, height: H, floorY: H, primary: true }]
    }

    bootData = {
      config,
      display,
      look: lookId,
      looks: (looksIdx.looks || []).map((l) => ({ id: l.id, label: l.label })),
      habitat,                                   // objeto completo, con sus piezas
      habitats: (habIdx.habitats || []).map((h) => ({ id: h.id, label: h.label })),
      estado,
      flow: { edges: [] },
      platform: 'web',
      debug: false
    }
    fireBoot()
  })
})()
