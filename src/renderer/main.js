'use strict'

import { SpriteSheet } from './engine/sprites.js'
import { World } from './engine/world.js'
import { Cat } from './engine/cat.js'
import { Bowl, Ball, Treat, Water, Butterfly, Bird, Gift } from './engine/props.js'
import { Litter, Piece } from './engine/furniture.js'
import { Moments, Schedule } from './engine/moments.js'
import { Routine } from './engine/routine.js'
import { Messages } from './engine/messages.js'
import { Needs } from './engine/needs.js'

// Los juguetes que quedan tirados por el piso si no se configura otra cosa.
// `kind` es el nombre del sprite en furniture.json.
const DEFAULT_TOYS = [
  { kind: 'mouse', at: 0.20 },
  { kind: 'pelotita', at: 0.40 },
  { kind: 'pelotita2', at: 0.45 },
  { kind: 'wand', at: 0.66 }
]

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')
const bubbleEl = document.getElementById('bubble')
const tipEl = document.getElementById('tip')

// Lo que se muestra en el tooltip segun lo que este haciendo.
const ACTION_LABELS = {
  play: 'jugando',
  trot: 'paseando',
  loaf: 'mirandote',
  scratch: 'rascando',
  climbTree: 'trepando',
  slide: 'derrapando',
  chaseCursor: 'cazando el cursor',
  seek: 'buscandote',
  meow: 'miau',
  eatTreat: 'comiendo',
  chaseButterfly: 'una mariposa',
  yawn: 'recién levantada',
  amasar: 'amasando',
  mirandoLaNada: 'mirando la nada',
  enojada: 'dejala',
  seVa: 'se va',
  tomaRegalo: 'te trae algo',
  llevaRegalo: 'te trae algo',
  ofrece: 'es para vos',
  acompana: 'acompañándote',
  watchBird: 'un pajarito',
  startle: '¿qué fue eso?',
  stalkBird: 'acechando',
  inBox: 'en su caja',
  chaseBall: 'jugando',
  crouch: 'jugando',
  pounce: 'jugando',
  purr: 'ronroneando',
  eat: 'comiendo',
  groom: 'lamiendose'
  // 'sleep' no lleva tooltip: mientras duerme hablan los prrr
}

let sheet = null
let propSheet = null
let furnSheet = null
let world = null
let cat = null
let bowl = null
let ball = null
let treat = null
let bed = null
let post = null
let tree = null
let cave = null
let toys = []
let meals = null
let playtimes = null
let moments = null
let messages = null
let routine = null
let litter = null
let water = null
let needs = null
let lastAsking = null
let hoverSince = 0
let forceStats = false   // solo para NALA_DEBUG: muestra el panel sin hover
let lastState = null
let origin = { x: 0, y: 0 }        // esquina del escritorio que cubre la ventana
let displays = null                // cada monitor, en coordenadas de la ventana
let lookCount = 1                  // cuantas versiones de su pinta hay
let habitatCount = 1               // cuantos habitats hay
let habitatId = 'casa'             // cual esta puesto
let pieces = []                    // las piezas del habitat puesto
let box = null                     // su caja, si el habitat trae una
let butterfly = null
let nextButterfly = 0              // cuando sale la proxima, en habitats con jardin
let birds = []
let nextBird = 0
let gift = null
let diasJuntos = 0                 // desde el primer dia
let nombre = 'Nala'
let nextSave = 0

/** Cuantos dias pasaron desde una fecha YYYY-MM-DD. */
function diasDesde (iso) {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return 0
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((hoy - d) / 86400000))
}

/** Le manda al proceso principal lo que tiene que recordar. */
function guardar () {
  if (!needs || !cat || !messages) return
  window.nala.saveEstado({
    needs: needs.snapshotRaw(),
    energia: cat.energy,
    saludadoEl: messages.greetedOn
  })
}
let floorTile = null               // la pieza que se repite a lo ancho del piso

/**
 * Que papel cumple cada pieza para ella. Lo que no esta aca es decorado: se
 * dibuja y nada mas.
 */
const PIECE_ROLE = {
  post: 'post',
  tree: 'tree', garden_tree: 'tree', slide: 'tree', sill: 'tree',
  box: 'box',
  cave: 'cave', tunnel: 'cave',
  bed: 'bed',
  ballpit: 'box',
  mouse: 'toy', pelotita: 'toy', pelotita2: 'toy', wand: 'toy', rope: 'toy'
}

/** Arma las piezas del habitat. Cada una elige sola de que hoja sale. */
function buildHabitat (habitat) {
  const h = habitat || { pieces: [] }
  const sheetFor = (kind) => {
    const has = (sh) => sh && (sh.meta.animations[kind] || sh.meta.animations[`${kind}_back`])
    return has(furnSheet) ? furnSheet : has(propSheet) ? propSheet : null
  }
  floorTile = h.floor && sheetFor(h.floor)
    ? { anim: h.floor, sheet: sheetFor(h.floor) }
    : null

  return (h.pieces || []).map((p) => {
    const sh = sheetFor(p.kind)
    if (!sh) {
      console.warn(`[nala] la pieza "${p.kind}" no existe en ninguna hoja`)
      return null
    }
    return new Piece(world, sh, cat.scale, p.kind, p.at,
                     p.display != null ? p.display : null)
  }).filter(Boolean)
}

let lastHotKey = ''
let hearts = []
let purrs = []
let pelitos = []                   // los que va dejando por ahi
let nextPelito = 0
let nextPurr = 0
let nextSueño = 0
let trabajo = 0                    // que tan activo venis con el mouse
let nextAcompanar = 0

const pointer = {
  x: -1, y: -1, active: false, movingMs: 9999, lastMove: 0,
  speed: 0, wiggle: 0, lastDir: 0, reversals: []
}

let caricias = []                  // cuando la acariciaste, para ver si te pasas
let lastTouch = performance.now()   // ultima vez que interactuaste con ella
let missCooldown = 0
let missAfterMs = 12 * 60 * 1000    // cuanto aguanta antes de venir a buscarte

/** Entran uno a tres, del mismo lado y escalonados, como una bandada. */
function soltarBandada () {
  const lado = Math.random() < 0.5 ? -1 : 1
  const cuantos = 1 + Math.floor(Math.random() * birds.length)
  birds.slice(0, cuantos).forEach((b, i) => {
    if (b.active) return
    b.spawn(lado)
    b.x -= lado * i * 70          // escalonados, no todos encima
    b.hold += i * 0.5             // y no se posan todos en el mismo instante
  })
}

/** Suelta una mariposa cerca de ella, pero no encima. */
function soltarMariposa () {
  if (!butterfly || !cat) return
  const lado = Math.random() < 0.5 ? -1 : 1
  const x = Math.max(40, Math.min(world.width - 40, cat.x + lado * (170 + Math.random() * 160)))
  butterfly.spawn(x, world.floorAt(x).y - 110 - Math.random() * 80)
}

/** Le hace decir algo del grupo `pool`, si no esta diciendo otra cosa. */
function sayNow (pool, ms = 7000) {
  if (!cat || !messages || cat.bubble) return
  const m = messages.on(pool)
  if (m) cat.say(m, ms)
}

/** Marca que la tocaste. Corta el "te extraña". */
function touched () {
  lastTouch = performance.now()
  missCooldown = lastTouch
}

// --------------------------------------------------------------------- setup

function resize () {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(window.innerWidth * dpr)
  canvas.height = Math.round(window.innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  if (world) world.resize(window.innerWidth, window.innerHeight, displays)
}

window.nala.onBoot(async ({ config, display, look, looks, habitat, habitats, estado, debug }) => {
  origin = { x: display.x, y: display.y }
  displays = display.displays

  // Cada version de su pinta tiene su propia carpeta. El proceso principal nos
  // dice cual esta puesta; si no dijo nada, la primera que existio.
  const dir = `../../assets/sprites/${look || 'v1'}`
  lookCount = Array.isArray(looks) ? looks.length : 1

  ;[sheet, propSheet, furnSheet] = await Promise.all([
    SpriteSheet.load(`${dir}/cat.png`, `${dir}/cat.json`),
    SpriteSheet.load(`${dir}/props.png`, `${dir}/props.json`),
    SpriteSheet.load(`${dir}/furniture.png`, `${dir}/furniture.json`)
  ])

  world = new World(window.innerWidth, window.innerHeight, displays)
  cat = new Cat(world, sheet, config.scale || 2)
  bowl = new Bowl(world, config.bowlAt != null ? config.bowlAt : 0.12,
                  config.bowlDisplay != null ? config.bowlDisplay : null)
  ball = new Ball(world)
  treat = new Treat(world)
  butterfly = new Butterfly(world)
  birds = [new Bird(world), new Bird(world), new Bird(world)]
  gift = new Gift(world)

  // Su habitat. Las piezas salen del json: cada una se dibuja sola desde el
  // sprite, y si el sprite le declaro tablas, el motor las usa de superficies.
  const at = (key, fallback) => (config[key] != null ? config[key] : fallback)
  const on = (key) => (config[key] != null ? config[key] : null)
  const s = cat.scale

  // Estas van siempre, en cualquier habitat: las necesita.
  litter = new Litter(world, furnSheet, s, at('litterAt', 0.42), on('litterDisplay'))
  water = new Water(world, at('waterAt', 0.05), on('waterDisplay'))

  habitatCount = Array.isArray(habitats) ? habitats.length : 1
  habitatId = (habitat && habitat.id) || 'casa'
  pieces = buildHabitat(habitat)

  // Cada pieza cumple un papel para ella: en el jardin el arbol de verdad es
  // "su arbol", en el parque el tunel es "su cueva". Asi las conductas que ya
  // existen sirven en todos los habitats sin escribirlas de nuevo.
  const byRole = (role) => pieces.find((p) => PIECE_ROLE[p.kind] === role) || null
  post = byRole('post')
  tree = byRole('tree')
  cave = byRole('cave')
  bed = byRole('bed')
  box = byRole('box')
  const cuevitas = pieces.filter((p) => PIECE_ROLE[p.kind] === 'box')
  toys = pieces.filter((p) => PIECE_ROLE[p.kind] === 'toy')

  cat.props = { bowl, ball, treat, bed, post, tree, cave, toys, litter, water, box, boxes: cuevitas, butterfly, bird: null, gift }

  needs = new Needs(config)
  cat.needs = needs
  cat.autoServe = config.autoServe !== false
  world.setFurniture(pieces.filter((p) => p.surfaces().length))
  world.setFloorMargin((sheet.ch - sheet.ground) * cat.scale + 2)

  meals = new Schedule(config.meals)
  playtimes = new Schedule(config.playtimes)
  moments = new Moments(config.moments)
  routine = new Routine(config.routine || {})
  messages = new Messages(config)

  // Lo que se acuerda de la sesion anterior.
  const mem = estado || {}
  const cerrada = mem.at ? Math.max(0, (Date.now() - mem.at) / 1000) : 0
  needs.restore(mem.needs, cerrada)
  if (typeof mem.energia === 'number') cat.energy = mem.energia
  if (mem.saludadoEl) messages.greetedOn = mem.saludadoEl
  diasJuntos = mem.desde ? diasDesde(mem.desde) : 0
  if (diasJuntos > 0) messages.setDias(diasJuntos)
  missAfterMs = (config.missYouAfterMinutes || 12) * 60 * 1000

  resize()
  nombre = config.name || 'Nala'
  const hola = config.greeting || messages.greeting()
  if (hola) cat.say(hola, 9000)
  requestAnimationFrame(loop)

  if (debug) {
    // Autotest: saca la pelota y captura el canvas para poder mirarlo.
    setTimeout(() => { forceStats = true }, 3200)
    setTimeout(() => { forceStats = false; soltarBandada() }, 3300)
    setTimeout(() => {
      console.log(`[nala] ball.active=${ball.active} estado=${cat.state} menu=${menuOpen}`)
    }, 5500)
  }
})

let ventanasPrev = null            // para saber cual apareció
let nextSusto = 0

window.nala.onWindows((rects) => {
  if (!world) return

  // Algo aparecio en la pantalla y la agarro desprevenida. Es lo unico que la
  // hace reaccionar a TU mundo y no al suyo, asi que va con la mano liviana:
  // solo ventanas grandes, y una vez cada minuto y medio como mucho. Si te
  // sobresaltara con cada pestaña la ibas a querer apagar en un dia.
  const clave = (w) => `${w.title}|${w.w}x${w.h}`
  const ahora = new Set(rects.map(clave))
  if (ventanasPrev && cat) {
    const nueva = rects.find((w) => !ventanasPrev.has(clave(w)) && w.w * w.h > 260000)
    const now = performance.now()
    const tranquila = ['idle', 'sit', 'loaf', 'groom', 'sleep', 'watch', 'alert']
    if (nueva && now > nextSusto && tranquila.includes(cat.state)) {
      nextSusto = now + 90000
      cat.sobresalto(nueva.x + nueva.w / 2 - origin.x)
    }
  }
  ventanasPrev = ahora
  // De coordenadas de pantalla a coordenadas de la ventana.
  world.setWindows(rects.map((r) => ({ ...r, x: r.x - origin.x, y: r.y - origin.y })))
})

window.nala.onCommand((cmd) => {
  if (!cat) return
  if (cmd.type === 'come') cat.come(pointer.active ? pointer.x : world.width / 2)
  if (cmd.type === 'sleep') cat.napNow()
  if (cmd.type === 'feed') {
    cat.mealtime()
    if (cat.asking === 'comida') { cat.asking = null; sayNow('gracias', 6000) }
  }
  if (cmd.type === 'play') cat.playtime()
  if (cmd.type === 'treat') cat.giveTreat()
  if (cmd.type === 'bed') cat.goToBed()
  if (cmd.type === 'scratch') cat.goToPost()
  if (cmd.type === 'tree') cat.goUpTree()
  if (cmd.type === 'cave') cat.goToCave()
  if (cmd.type === 'litter') cat.goToLitter()
  if (cmd.type === 'box') cat.goToBox()
  if (cmd.type === 'butterfly') soltarMariposa()
  if (cmd.type === 'bird') soltarBandada()
  if (cmd.type === 'gift') cat.traerRegalo()
  if (cmd.type === 'water') {
    water.fill()
    if (cat.asking === 'agua') { cat.asking = null; sayNow('gracias', 6000) }
  }
  if (cmd.type === 'toy') cat.goToToy()
  if (cmd.type === 'free') { cat.target = null; cat.after = null; cat.setState('idle', 500) }
})

window.addEventListener('resize', resize)

// ------------------------------------------------------------------- puntero

const DRAG_THRESHOLD = 7        // px que hay que mover para que sea arrastre y no caricia
const HOVER_PAD = 10            // margen extra alrededor de ella para el hit test

// Que esta agarrando el mouse ahora mismo.
let grip = null   // {kind:'cat'|'ball', downX, downY, downAt, moved}

// La posicion del cursor la manda el proceso principal, no el DOM: cuando la
// ventana esta en modo atravesable, en Linux no llega ningun evento de mouse.
window.nala.onPointer((p) => {
  const x = p.x - origin.x
  const y = p.y - origin.y
  if (x === pointer.x && y === pointer.y) return

  const now = performance.now()
  const dtMove = Math.max(8, now - pointer.lastMove)
  pointer.speed = Math.hypot(x - pointer.x, y - pointer.y) / (dtMove / 1000)
  // Zarandeo: cuantas veces cambiaste de direccion en el ultimo medio segundo.
  const dir = Math.sign(x - pointer.x)
  if (dir !== 0 && dir !== pointer.lastDir) {
    pointer.lastDir = dir
    pointer.reversals.push(now)
  }
  pointer.reversals = pointer.reversals.filter((t) => now - t < 600)
  pointer.wiggle = pointer.reversals.length

  pointer.x = x
  pointer.y = y
  pointer.active = true
  pointer.lastMove = now

  if (!grip) return

  if (!grip.moved && Math.hypot(x - grip.downX, y - grip.downY) > DRAG_THRESHOLD) {
    grip.moved = true
    if (grip.kind === 'cat') cat.grab(x, y + 20)
  }
  if (!grip.moved) return
  if (grip.kind === 'cat') { cat.x = x; cat.y = y + 20 }
  if (grip.kind === 'ball') ball.hold(x, y)
})

window.addEventListener('mousedown', (e) => {
  if (!cat) return

  // Si el click es sobre el propio menu, no lo cerramos aca: dejamos que el
  // boton haga lo suyo. Cerrarlo en mousedown mataba el handler del boton.
  if (menuOpen && menuEl.contains(e.target)) return

  hideMenu()

  if (e.button === 2) {                       // click derecho sobre ella: menu
    if (hit(e.clientX, e.clientY)) { showMenu(e.clientX, e.clientY); e.preventDefault() }
    return
  }
  if (e.button !== 0) return

  const kind = hitBall(e.clientX, e.clientY) ? 'ball' : hit(e.clientX, e.clientY) ? 'cat' : null
  if (!kind) return
  grip = { kind, downX: e.clientX, downY: e.clientY, downAt: performance.now(), moved: false }
  touched()
})

window.addEventListener('mouseup', (e) => {
  if (menuOpen && menuEl.contains(e.target)) return
  if (!grip) return
  const held = performance.now() - grip.downAt

  if (grip.kind === 'ball') {
    if (grip.moved) ball.drop()
    else ball.kick(pointer.x > ball.x ? -1 : 1, 1.1)   // fue un manotazo
  } else if (grip.moved) {
    cat.release()                                       // la levantaste y la soltas
  } else {
    // No la moviste: fue una caricia. Pero si le acariciás de más se
    // sobreestimula y te bufa, que es exactamente lo que hacen.
    const now = performance.now()
    caricias = caricias.filter((t) => now - t < 25000)
    caricias.push(now)
    if (caricias.length >= 5 || cat.enojada) {
      caricias = []
      cat.enojarse(pointer.x)
      sayNow('enojada', 5000)
      grip = null
      touched()
      return
    }

    cat.pet()
    const bursts = held > 700 ? 3 : 1
    for (let i = 0; i < bursts; i++) popHearts(cat.x + (i - 1) * 12, cat.y - 40 - i * 8)
    if (held > 700) cat.setState('purr', 7000)
    if (Math.random() < 0.5) sayNow('petted', 5000)
  }

  grip = null
  touched()
})

window.addEventListener('dblclick', (e) => {
  if (cat && hit(e.clientX, e.clientY)) { cat.meow(); touched() }
})

window.addEventListener('contextmenu', (e) => e.preventDefault())

/**
 * Los bordes del monitor donde cae x. La ventana abarca todo el escritorio,
 * asi que recortar contra window.innerWidth dejaria que el menu o el globito
 * se abran cruzando la juntura entre dos pantallas.
 */
function screenEdges (x) {
  const d = world && world.displays ? world.displayAt(x) : null
  if (!d) return { x1: 0, x2: window.innerWidth, y1: 0, y2: window.innerHeight }
  return { x1: d.x, x2: d.x + d.width, y1: d.y, y2: d.y + d.height }
}

function hit (x, y) {
  if (!cat) return false
  const b = cat.bounds
  return x >= b.x - HOVER_PAD && x <= b.x + b.w + HOVER_PAD &&
         y >= b.y - HOVER_PAD && y <= b.y + b.h + HOVER_PAD
}

function hitBall (x, y) {
  if (!ball || !ball.active) return false
  const r = 9 * cat.scale + HOVER_PAD
  return Math.hypot(x - ball.x, y - (ball.y - 7 * cat.scale)) <= r
}

/**
 * La ventana cubre toda la pantalla y por defecto el mouse la atraviesa.
 * Le pasamos al proceso principal las zonas donde SI tiene que agarrar el
 * mouse: ella y la pelota. Ahi adentro la ventana se vuelve solida y nada
 * llega a lo que haya atras.
 */
function sendHotRects () {
  if (!cat) return
  const rects = []

  const b = cat.bounds
  rects.push({
    x: Math.round(b.x - HOVER_PAD + origin.x),
    y: Math.round(b.y - HOVER_PAD + origin.y),
    w: Math.round(b.w + HOVER_PAD * 2),
    h: Math.round(b.h + HOVER_PAD * 2)
  })

  if (ball && ball.active) {
    const r = 9 * cat.scale + HOVER_PAD
    rects.push({
      x: Math.round(ball.x - r + origin.x),
      y: Math.round(ball.y - 7 * cat.scale - r + origin.y),
      w: Math.round(r * 2),
      h: Math.round(r * 2)
    })
  }

  if (menuOpen) {
    rects.push({
      x: Math.round(menuEl.offsetLeft + origin.x),
      y: Math.round(menuEl.offsetTop + origin.y),
      w: menuEl.offsetWidth,
      h: menuEl.offsetHeight
    })
  }

  // Mientras arrastras o con el menu abierto no hay que soltarla nunca.
  const force = menuOpen || !!grip || cat.pinned
  const key = force + '|' + rects.map((r) => `${r.x},${r.y},${r.w},${r.h}`).join(';')
  if (key === lastHotKey) return
  lastHotKey = key
  window.nala.setHotRects(rects, force)
}

// ---------------------------------------------------------------- la mirada

const GAZE_RANGE = 420    // hasta donde le sigue algo con los ojos
const GAZE_EASE = 9       // que tan rapido cambia de foco

/**
 * A donde esta mirando.
 *
 * Un gato no mueve la cabeza con el cuerpo: la clava en lo que le interesa y
 * mueve el cuerpo debajo. La cabeza del sprite va quieta a proposito, asi que
 * lo unico que hay que resolver aca es hacia donde apunta la pupila.
 */
function updateGaze (dt) {
  if (!cat) return
  const b = cat.bounds
  const hx = b.x + b.w / 2
  const hy = b.y + b.h * 0.26        // la altura de sus ojos, mas o menos

  // Mirando la nada, la mirada se clava en un punto vacio y no te sigue. Que
  // no reaccione a nada es todo el gesto.
  if (cat.state === 'mirandoLaNada') {
    cat.gaze.x += (cat.facing * 0.75 - cat.gaze.x) * Math.min(1, dt * 2)
    cat.gaze.y += (-0.35 - cat.gaze.y) * Math.min(1, dt * 2)
    return
  }

  let tx = null
  let ty = null

  // Lo que la tenga ocupada manda sobre el cursor.
  if (ball && ball.active && cat.state.startsWith('chase')) {
    tx = ball.x; ty = ball.y - 10
  } else if (treat && treat.active && cat.state === 'eatTreat') {
    tx = treat.x; ty = treat.y
  } else if (pointer.active && Math.hypot(pointer.x - hx, pointer.y - hy) < GAZE_RANGE) {
    tx = pointer.x; ty = pointer.y
  }

  let gx, gy
  if (tx == null) {
    // Sin nada que mirar, mira hacia donde va.
    gx = cat.facing * 0.35
    gy = 0
  } else {
    gx = Math.max(-1, Math.min(1, (tx - hx) / 190))
    gy = Math.max(-1, Math.min(1, (ty - hy) / 150))
  }

  const k = Math.min(1, dt * GAZE_EASE)
  cat.gaze.x += (gx - cat.gaze.x) * k
  cat.gaze.y += (gy - cat.gaze.y) * k
}

// -------------------------------------------------------------- como esta ella

const statsEl = document.getElementById('stats')
const HOVER_DELAY = 800   // cuanto hay que quedarse encima para que aparezca

/**
 * Si te quedas un momento encima de ella, muestra como esta. Es para poder
 * mirarla, no para tener que atenderla: ella se arregla sola.
 */
function drawStats (now) {
  const over = forceStats || (cat && !menuOpen && !grip && hit(pointer.x, pointer.y))
  if (!over) { hoverSince = 0; statsEl.dataset.show = '0'; return }
  if (!hoverSince) hoverSince = now
  if (now - hoverSince < HOVER_DELAY) { statsEl.dataset.show = '0'; return }

  const rows = needs.snapshot(cat.energy)
  if (!statsEl.childElementCount) {
    for (const r of rows) {
      const row = document.createElement('div')
      row.className = 'row'
      row.innerHTML = `<span class="name"></span><span class="bar"><span class="fill"></span></span>`
      row.querySelector('.name').textContent = r.label
      statsEl.appendChild(row)
    }
  }
  rows.forEach((r, i) => {
    const fill = statsEl.children[i].querySelector('.fill')
    fill.style.width = `${Math.round(r.value * 100)}%`
    fill.dataset.low = r.value < 0.2 ? '2' : r.value < 0.4 ? '1' : '0'
  })

  statsEl.hidden = false
  statsEl.dataset.show = '1'
  const b = cat.bounds
  const w = statsEl.offsetWidth
  const edges = typeof screenEdges === 'function' ? screenEdges(cat.x) : null
  const minX = edges ? edges.x1 + 6 : 6
  const maxX = (edges ? edges.x2 - 6 : window.innerWidth - 6) - w
  statsEl.style.left = `${Math.max(minX, Math.min(maxX, b.x + b.w / 2 - w / 2))}px`
  // Si esta diciendo algo, el panel se corre arriba del globito.
  const above = cat.bubble && !bubbleEl.hidden ? bubbleEl.offsetHeight + 8 : 0
  statsEl.style.top = `${Math.max(6, b.y - statsEl.offsetHeight - 10 - above)}px`
}

// ----------------------------------------------------------------- menu rapido

const menuEl = document.getElementById('menu')
let menuOpen = false

/**
 * El menu, agrupado. Con dieciocho opciones en una lista plana no se encontraba
 * nada. El tercer campo de cada opcion dice cuando mostrarla.
 */
const MENU_GROUPS = [
  {
    titulo: 'Darle',
    items: [
      ['Una caricia', () => { cat.pet(); popHearts(cat.x, cat.y - 40) }],
      ['Un premio', () => cat.giveTreat(cat.x + (Math.random() < 0.5 ? -1 : 1) * 170)],
      ['La comida', () => cat.mealtime()],
      ['Agua', () => water.fill()]
    ]
  },
  {
    titulo: 'Que juegue',
    items: [
      ['Con la pelota', () => cat.playtime()],
      ['Con un juguete', () => cat.goToToy()],
      ['Con una mariposa', () => soltarMariposa()],
      ['Con los pajaritos', () => soltarBandada()]
    ]
  },
  {
    titulo: 'Pedirle',
    items: [
      ['Que te traiga algo', () => cat.traerRegalo()],
      ['Que rasque el poste', () => cat.goToPost(), () => !!post],
      ['Que suba al árbol', () => cat.goUpTree(), () => !!tree],
      ['Que se meta en la caja', () => cat.goToBox(), () => !!box],
      ['Que vaya al arenero', () => cat.goToLitter()],
      ['Que se meta en la cueva', () => cat.goToCave(), () => !!cave],
      ['Que se vaya a la cama', () => cat.goToBed(), () => !!bed],
      ['Que duerma', () => cat.napNow()]
    ]
  },
  {
    titulo: 'Cambiar',
    items: [
      ['De hábitat', () => window.nala.cycleHabitat(), () => habitatCount > 1],
      ['De pinta', () => window.nala.cycleLook(), () => lookCount > 1]
    ]
  }
]

function showMenu (x, y) {
  menuEl.innerHTML = ''

  // Encabezado: su nombre y que esta haciendo ahora mismo.
  const cab = document.createElement('div')
  cab.className = 'cab'
  const haciendo = ACTION_LABELS[cat.state]
  cab.innerHTML = `<span class="nom"></span>${haciendo ? '<span class="hac"></span>' : ''}`
  cab.querySelector('.nom').textContent = nombre
  if (haciendo) cab.querySelector('.hac').textContent = haciendo
  menuEl.appendChild(cab)

  for (const grupo of MENU_GROUPS) {
    const visibles = grupo.items.filter(([, , when]) => !when || when())
    if (!visibles.length) continue

    const t = document.createElement('div')
    t.className = 'grupo'
    t.textContent = grupo.titulo
    menuEl.appendChild(t)

    for (const [label, action] of visibles) {
      const b = document.createElement('button')
      b.textContent = label
      b.addEventListener('mouseup', (ev) => {
        ev.stopPropagation()
        action()
        touched()
        hideMenu()
      })
      menuEl.appendChild(b)
    }
  }
  menuEl.hidden = false
  menuOpen = true
  const w = menuEl.offsetWidth
  const h = menuEl.offsetHeight
  const e = screenEdges(x)
  menuEl.style.left = `${Math.max(e.x1 + 8, Math.min(x, e.x2 - w - 8))}px`
  menuEl.style.top = `${Math.max(e.y1 + 8, Math.min(y, e.y2 - h - 8))}px`
  menuEl.dataset.show = '1'
}

function hideMenu () {
  if (!menuOpen) return
  menuOpen = false
  menuEl.dataset.show = '0'
  menuEl.hidden = true
}

// ------------------------------------------------------------------ corazones

function popHearts (x, y) {
  for (let i = 0; i < 6; i++) {
    hearts.push({
      x: x + (Math.random() - 0.5) * 26,
      y,
      vy: -20 - Math.random() * 26,
      vx: (Math.random() - 0.5) * 22,
      life: 1
    })
  }
}

/**
 * Los pelitos que va dejando.
 *
 * Se caen solos y se quedan en el piso un buen rato. Salen sobre todo cuando se
 * sacude — que es cuando de verdad vuela pelo — y de a poco mientras se lame o
 * duerme. Es una gata de pelo largo: es lo que pasa.
 */
function soltarPelitos (n, fuerza) {
  if (!cat || pelitos.length > 90) return
  const b = cat.bounds
  for (let i = 0; i < n; i++) {
    pelitos.push({
      x: b.x + b.w * (0.25 + Math.random() * 0.5),
      y: b.y + b.h * (0.35 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * fuerza,
      vy: -Math.random() * fuerza * 0.5,
      largo: 2 + Math.floor(Math.random() * 3),
      claro: Math.random() < 0.45,
      posado: false,
      vida: 240 + Math.random() * 300     // se quedan minutos, no segundos
    })
  }
}

function maybePelitos (now, dt) {
  if (!cat) return
  // Sacudirse los manda a volar. Lamerse y dormir los suelta de a poco.
  if (cat.state === 'sacudirse') {
    if (now > nextPelito) { nextPelito = now + 120; soltarPelitos(2, 90) }
    return
  }
  if (cat.state === 'groom' || cat.state === 'rascarse') {
    if (now > nextPelito) { nextPelito = now + 900 + Math.random() * 900; soltarPelitos(1, 26) }
    return
  }
  if (cat.state === 'sleep' && now > nextPelito) {
    nextPelito = now + 12000 + Math.random() * 20000
    soltarPelitos(1, 10)
  }
}

function drawPelitos (dt) {
  if (!pelitos.length) return
  const P = sheet.meta.palette
  const e = Math.max(1, Math.round(cat.scale / 2))
  pelitos = pelitos.filter((p) => p.vida > 0)
  for (const p of pelitos) {
    p.vida -= dt
    if (!p.posado) {
      p.vy += 210 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      const suelo = world.floorAt(p.x).y
      if (p.y >= suelo) { p.y = suelo; p.posado = true }
    }
    ctx.save()
    // Los ultimos segundos se van desvaneciendo, no desaparecen de golpe.
    ctx.globalAlpha = Math.min(1, p.vida / 6) * 0.85
    ctx.fillStyle = p.claro ? P.light : P.dark
    for (let i = 0; i < p.largo; i++) {
      ctx.fillRect(Math.round(p.x + i * e), Math.round(p.y - (p.posado ? 0 : i * 0.4)), e, e)
    }
    ctx.restore()
  }
}

/** Mientras duerme (o mientras la acaricias) le salen prrr flotando. */
function maybePurr (now) {
  if (!cat) return

  // Mirando un pajaro no ronronea: castañetea. Ese "ek ek ek" que hacen
  // cuando ven uno y no lo pueden alcanzar.
  if (cat.state === 'watchBird') {
    if (now < nextPurr) return
    nextPurr = now + 1400 + Math.random() * 1600
    const b = cat.bounds
    purrs.push({
      text: 'ek '.repeat(2 + Math.floor(Math.random() * 3)).trim(),
      x: b.x + b.w * (0.6 + Math.random() * 0.2),
      y: b.y + b.h * 0.2,
      vx: 5 + Math.random() * 8,
      vy: -15 - Math.random() * 8,
      life: 1,
      size: 12 + Math.floor(Math.random() * 3)
    })
    return
  }

  const purring = cat.state === 'sleep' || cat.state === 'purr'
  if (!purring) { nextPurr = now + 900; return }
  if (now < nextPurr) return

  const slow = cat.state === 'sleep'
  nextPurr = now + (slow ? 2000 + Math.random() * 2400 : 900 + Math.random() * 900)

  const b = cat.bounds
  purrs.push({
    text: 'p' + 'r'.repeat(3 + Math.floor(Math.random() * 4)),
    x: b.x + b.w * (0.62 + Math.random() * 0.22),
    y: b.y + b.h * (0.34 + Math.random() * 0.1),
    vx: 6 + Math.random() * 10,
    vy: -13 - Math.random() * 9,
    life: 1,
    size: 13 + Math.floor(Math.random() * 4)
  })
}

function drawPurrs (dt) {
  purrs = purrs.filter((p) => p.life > 0)
  for (const p of purrs) {
    p.life -= dt * 0.3
    p.x += p.vx * dt
    p.y += p.vy * dt
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4)) * 0.8
    ctx.fillStyle = '#d8d1c6'
    ctx.font = `italic ${p.size}px system-ui, sans-serif`
    ctx.fillText(p.text, p.x, p.y)
    ctx.restore()
  }
}

function drawHearts (dt) {
  hearts = hearts.filter((h) => h.life > 0)
  for (const h of hearts) {
    h.life -= dt * 0.7
    h.x += h.vx * dt
    h.y += h.vy * dt
    ctx.save()
    ctx.globalAlpha = Math.max(0, h.life)
    ctx.fillStyle = '#e0959b'
    ctx.font = '16px system-ui'
    ctx.fillText('♥', h.x, h.y)
    ctx.restore()
  }
}

// -------------------------------------------------------------------- tooltip

function drawTip () {
  const label = cat ? ACTION_LABELS[cat.state] : null
  // El globito de texto manda: no se muestran los dos a la vez.
  if (!label || (cat && cat.bubble)) {
    tipEl.dataset.show = '0'
    return
  }
  const b = cat.bounds
  tipEl.textContent = label
  tipEl.hidden = false
  tipEl.dataset.show = '1'
  const w = tipEl.offsetWidth
  const e = screenEdges(b.x + b.w / 2)
  const left = Math.max(e.x1 + 6, Math.min(e.x2 - w - 6, b.x + b.w / 2 - w / 2))
  tipEl.style.left = `${left}px`
  tipEl.style.top = `${Math.max(e.y1 + 6, b.y - tipEl.offsetHeight - 8)}px`
}

// -------------------------------------------------------------------- globito

function drawBubble () {
  if (!cat || !cat.bubble) {
    bubbleEl.dataset.show = '0'
    return
  }
  const b = cat.bounds
  bubbleEl.textContent = cat.bubble.text
  bubbleEl.hidden = false
  bubbleEl.dataset.show = '1'
  const w = bubbleEl.offsetWidth
  const e = screenEdges(b.x + b.w / 2)
  const left = Math.max(e.x1 + 8, Math.min(e.x2 - w - 8, b.x + b.w / 2 - 30))
  bubbleEl.style.left = `${left}px`
  bubbleEl.style.top = `${Math.max(e.y1 + 8, b.y - bubbleEl.offsetHeight - 12)}px`
}

// ----------------------------------------------------------------------- loop

let last = performance.now()

function loop (now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  pointer.movingMs = now - pointer.lastMove

  // Cuanto venis moviendo el mouse, suavizado. Es lo mas cerca que se puede
  // estar de "esta trabajando" sin espiarte el teclado.
  const activo = pointer.movingMs < 900 ? 1 : 0
  trabajo += (activo - trabajo) * Math.min(1, dt * 0.35)

  if (cat) {
    // Rutina del dia: comer y jugar mandan sobre lo demas.
    if (meals.due()) {
      cat.mealtime()
    } else if (playtimes.due()) {
      cat.playtime()
    } else if (routine.zoomiesDue()) {
      cat.zoomies()
    } else {
      const due = moments.due()
      if (due) {
        if (due.state) cat.setState(due.state, due.hold || 12000)
        if (due.note) cat.say(due.note, 9000)
      } else if (!cat.bubble) {
        const m = messages.due(now, routine.timeOfDay())
        if (m) cat.say(m, 8500)
      }
    }

    // El ritmo del dia empuja lo que tiende a hacer: los gatos son
    // crepusculares, no viven igual a las 4 de la tarde que a las 8.
    cat.activity = routine.activity()
    cat.tuActividad = trabajo

    // Cosas que dice atadas a lo que le acaba de pasar.
    // Los sueños salen espaciados: si soñara seguido dejaria de tener gracia.
    if (cat.state === 'sleep') {
      if (!nextSueño) nextSueño = now + 45000 + Math.random() * 90000
      else if (now > nextSueño && !cat.bubble) {
        sayNow('sueños', 9000)
        nextSueño = now + 90000 + Math.random() * 150000
      }
    } else {
      nextSueño = 0
    }

    if (cat.state !== lastState) {
      if (cat.state === 'ofrece') sayNow('regalo', 8000)
      else if (lastState === 'sleep') sayNow('waking')
      else if (lastState === 'eat') sayNow('afterMeal')
      lastState = cat.state
    }

    needs.update(dt)

    // Se guarda cada tanto, no en cada frame.
    if (now > nextSave) { nextSave = now + 30000; guardar() }
    butterfly.update(dt, cat.x, cat.y)
    for (const b of birds) b.update(dt, cat.x, cat.vx)

    // La bandada se espanta junta: si uno levanta vuelo, los que estan cerca
    // salen atras. Es lo que las hace parecer una bandada y no tres pajaros
    // sueltos que casualmente estan en el mismo lugar.
    for (const b of birds) {
      if (!b.active || b.posado || b.hold < 4.6) continue
      for (const o of birds) {
        if (o !== b && o.active && o.posado && Math.abs(o.x - b.x) < 260) {
          o.espantar(b.x + (b.x > o.x ? 60 : -60))
        }
      }
    }

    // Ella se ocupa del que tenga mas cerca.
    const activos = birds.filter((b) => b.active)
    cat.props.bird = activos.length
      ? activos.reduce((a, b) => (Math.abs(a.x - cat.x) <= Math.abs(b.x - cat.x) ? a : b))
      : null
    gift.update(dt, cat.x, cat.y)

    // Los pajaritos pasan solos cada tanto, en cualquier habitat: se ven por
    // la ventana aunque ella este adentro.
    if (!birds.some((b) => b.active)) {
      if (!nextBird) nextBird = now + 240000 + Math.random() * 420000
      else if (now > nextBird) { soltarBandada(); nextBird = 0 }
    }

    // En el jardin sale una sola cada tanto. En los otros habitats hay que
    // pedirla: no queda bien una mariposa dentro de la casa.
    if (habitatId === 'jardin') {
      if (!nextButterfly) nextButterfly = now + 30000 + Math.random() * 60000
      if (!butterfly.active && now > nextButterfly) {
        soltarMariposa()
        nextButterfly = 0
      }
    }
    bowl.update(dt)
    ball.update(dt)

    // Cuando llega al plato y no hay nada, te lo pide. Es lo unico que
    // necesita de vos: el resto se lo arregla sola.
    if (cat.asking !== lastAsking) {
      if (cat.asking === 'comida') sayNow('pideComida', 9000)
      if (cat.asking === 'agua') sayNow('pideAgua', 9000)
      lastAsking = cat.asking
    }

    // Si venis trabajando hace un rato, se viene a acompañar. No pide nada:
    // se echa al lado y se queda.
    if (trabajo > 0.75 && now > nextAcompanar && cat.energy > 0.25 &&
        ['idle', 'sit', 'loaf', 'groom'].includes(cat.state)) {
      nextAcompanar = now + 8 * 60 * 1000
      cat.acompanar({ pointer })
    }

    // Hace rato que no la tocas: te viene a buscar.
    if (now - lastTouch > missAfterMs && now - missCooldown > missAfterMs) {
      missCooldown = now
      cat.missYou()
      sayNow('missYou')
    }
    cat.update(dt, { pointer, dt })
    updateGaze(dt)
    sendHotRects()
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // El piso del habitat, si trae: se repite a lo ancho de cada pantalla.
  if (floorTile) {
    const sh = floorTile.sheet
    const w = sh.cw * cat.scale
    for (const dsp of world.displays) {
      const y = world.floorAt(dsp.x + 1).y
      for (let x = dsp.x; x < dsp.x + dsp.width; x += w) {
        sh.draw(ctx, floorTile.anim, 0, x + w / 2, y, cat.scale, false)
      }
    }
  }

  // Los pelitos van sobre el piso pero debajo de todo lo demas.
  drawPelitos(dt)

  // Las piezas del habitat van detras de ella. Las que son de dos partes (la
  // cueva, el tunel, la cama) dejan su frente para despues: solo se dibuja por
  // encima cuando ella esta metida adentro, si no la taparia al pasar.
  const dentro = (p) => p.twoPart && cat && p.holds(cat.x) &&
                        cat.surface && cat.surface.isFloor && !cat.airborne
  for (const p of pieces) {
    p.sheet.draw(ctx, p.backAnim, now, p.x, p.y, cat.scale, false)
    if (p.twoPart && !dentro(p)) p.sheet.draw(ctx, p.frontAnim, now, p.x, p.y, cat.scale, false)
  }

  // El arenero: la bandeja detras, el borde por delante.
  const inLitter = litter && cat && litter.holds(cat.x) &&
                   cat.surface && cat.surface.isFloor && !cat.airborne
  const drawFurn = (f, anim) => {
    if (f && furnSheet) furnSheet.draw(ctx, anim || f.anim, 0, f.x, f.y, cat.scale, false)
  }
  drawFurn(litter, 'litter_back')
  if (!inLitter) drawFurn(litter, 'litter_front')

  if (water) propSheet.draw(ctx, water.anim, now, water.x, water.y, cat.scale, false)
  if (bowl && bowl.visible) {
    propSheet.draw(ctx, bowl.anim, now, bowl.x, bowl.y, cat.scale, false)
  }
  if (treat && treat.active) {
    propSheet.draw(ctx, 'treat', now, treat.x, treat.y, cat.scale, false)
  }
  if (ball && ball.active) {
    propSheet.draw(ctx, 'ball', ball.spin * 1000, ball.x, ball.y, cat.scale, false)
  }
  for (const b of birds) {
    if (!b.active) continue
    propSheet.draw(ctx, b.anim, b.phase * 1000, b.x, b.y, cat.scale, b.facing < 0)
  }
  if (butterfly && butterfly.active) {
    propSheet.draw(ctx, 'butterfly', butterfly.phase * 1000, butterfly.x, butterfly.y,
                   cat.scale, butterfly.tx < butterfly.x)
  }
  if (gift && gift.active && !gift.enBoca && furnSheet) {
    furnSheet.draw(ctx, gift.anim, 0, gift.x, gift.y, cat.scale, false)
  }
  if (cat) cat.draw(ctx)
  if (gift && gift.active && gift.enBoca && furnSheet) {
    furnSheet.draw(ctx, gift.anim, 0, gift.x + cat.facing * 16, gift.y, cat.scale,
                   cat.facing < 0)
  }

  for (const p of pieces) {
    if (dentro(p)) p.sheet.draw(ctx, p.frontAnim, now, p.x, p.y, cat.scale, false)
  }
  if (inLitter) drawFurn(litter, 'litter_front')
  maybePelitos(now, dt)
  maybePurr(now)
  drawPurrs(dt)
  drawStats(now)
  drawHearts(dt)
  drawTip()
  drawBubble()

  requestAnimationFrame(loop)
}
