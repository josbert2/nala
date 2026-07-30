'use strict'

import { SpriteSheet } from './engine/sprites.js'
import { World } from './engine/world.js'
import { Cat } from './engine/cat.js'
import { Bowl, Ball, Treat, Bed, Water } from './engine/props.js'
import { ScratchPost, CatTree, Cave, Toy, Litter } from './engine/furniture.js'
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
let lastHotKey = ''
let hearts = []
let purrs = []
let nextPurr = 0

const pointer = {
  x: -1, y: -1, active: false, movingMs: 9999, lastMove: 0,
  speed: 0, wiggle: 0, lastDir: 0, reversals: []
}

let lastTouch = performance.now()   // ultima vez que interactuaste con ella
let missCooldown = 0
let missAfterMs = 12 * 60 * 1000    // cuanto aguanta antes de venir a buscarte

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

window.nala.onBoot(async ({ config, display, look, looks, debug }) => {
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
  bed = new Bed(world, config.bedAt != null ? config.bedAt : 0.86,
                config.bedDisplay != null ? config.bedDisplay : null)

  // Su casa. El arbol y el rascadero traen tablas: se las damos al mundo para
  // que sean superficies de verdad y ella pueda subirse.
  const at = (key, fallback) => (config[key] != null ? config[key] : fallback)
  const on = (key) => (config[key] != null ? config[key] : null)
  const s = cat.scale
  post = new ScratchPost(world, furnSheet, s, at('postAt', 0.28), on('postDisplay'))
  tree = new CatTree(world, furnSheet, s, at('treeAt', 0.55), on('treeDisplay'))
  cave = new Cave(world, furnSheet, s, at('caveAt', 0.72), on('caveDisplay'))
  litter = new Litter(world, furnSheet, s, at('litterAt', 0.42), on('litterDisplay'))
  water = new Water(world, at('waterAt', 0.05), on('waterDisplay'))
  toys = (config.toys || DEFAULT_TOYS).map(
    (t) => new Toy(world, furnSheet, s, t.kind, t.at, t.display != null ? t.display : null))

  cat.props = { bowl, ball, treat, bed, post, tree, cave, toys, litter, water }

  needs = new Needs(config)
  cat.needs = needs
  cat.autoServe = config.autoServe !== false
  world.setFurniture([post, tree])
  world.setFloorMargin((sheet.ch - sheet.ground) * cat.scale + 2)

  meals = new Schedule(config.meals)
  playtimes = new Schedule(config.playtimes)
  moments = new Moments(config.moments)
  routine = new Routine(config.routine || {})
  messages = new Messages(config)
  missAfterMs = (config.missYouAfterMinutes || 12) * 60 * 1000

  resize()
  const hola = config.greeting || messages.greeting()
  if (hola) cat.say(hola, 9000)
  requestAnimationFrame(loop)

  if (debug) {
    // Autotest: saca la pelota y captura el canvas para poder mirarlo.
    setTimeout(() => { cat.playtime(); console.log('[nala] playtime() llamado') }, 2500)
    setTimeout(() => { forceStats = true }, 3200)
    setTimeout(() => {
      console.log(`[nala] ball.active=${ball.active} estado=${cat.state} menu=${menuOpen}`)
    }, 5500)
    setTimeout(() => { cat.napNow(); console.log('[nala] napNow(): deberian salir prrr') }, 6500)
  }
})

window.nala.onWindows((rects) => {
  if (!world) return
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
    // No la moviste: fue una caricia. Cuanto mas la sostuviste, mas ronronea.
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

const MENU_ITEMS = [
  ['Acariciarla', () => { cat.pet(); popHearts(cat.x, cat.y - 40) }],
  ['Darle un premio', () => cat.giveTreat(cat.x + (Math.random() < 0.5 ? -1 : 1) * 170)],
  ['Sacar la pelota', () => cat.playtime()],
  ['Servirle la comida', () => cat.mealtime()],
  ['Llenarle el agua', () => water.fill()],
  ['A rascar el poste', () => cat.goToPost()],
  ['Arriba del arbol', () => cat.goUpTree()],
  ['A su cueva', () => cat.goToCave()],
  ['A su arenero', () => cat.goToLitter()],
  ['A jugar con un juguete', () => cat.goToToy()],
  ['A su cama', () => cat.goToBed()],
  ['Que duerma', () => cat.napNow()],
  // El tercer campo dice cuando mostrar la opcion. Sin mas de una version de su
  // pinta, cambiarla no hace nada.
  ['Cambiarle la pinta', () => window.nala.cycleLook(), () => lookCount > 1]
]

function showMenu (x, y) {
  menuEl.innerHTML = ''
  for (const [label, action, when] of MENU_ITEMS) {
    if (when && !when()) continue
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

/** Mientras duerme (o mientras la acaricias) le salen prrr flotando. */
function maybePurr (now) {
  if (!cat) return
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

    // Cosas que dice atadas a lo que le acaba de pasar.
    if (cat.state !== lastState) {
      if (lastState === 'sleep') sayNow('waking')
      else if (lastState === 'eat') sayNow('afterMeal')
      lastState = cat.state
    }

    needs.update(dt)
    bowl.update(dt)
    ball.update(dt)

    // Cuando llega al plato y no hay nada, te lo pide. Es lo unico que
    // necesita de vos: el resto se lo arregla sola.
    if (cat.asking !== lastAsking) {
      if (cat.asking === 'comida') sayNow('pideComida', 9000)
      if (cat.asking === 'agua') sayNow('pideAgua', 9000)
      lastAsking = cat.asking
    }

    // Hace rato que no la tocas: te viene a buscar.
    if (now - lastTouch > missAfterMs && now - missCooldown > missAfterMs) {
      missCooldown = now
      cat.missYou()
      sayNow('missYou')
    }
    cat.update(dt, { pointer })
    sendHotRects()
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Sus muebles van detras de ella. El arbol y el rascadero son mas altos que
  // ella a proposito: se la ve trepando por delante de las tablas.
  const drawFurn = (f, anim) => {
    if (f && furnSheet) furnSheet.draw(ctx, anim || f.anim, 0, f.x, f.y, cat.scale, false)
  }
  drawFurn(tree)
  drawFurn(post)
  for (const t of toys) drawFurn(t)

  // La cueva es el unico mueble que puede ir por delante, y solo cuando ella
  // esta metida adentro: es mas alta que ella, asi que si fuera siempre por
  // delante la taparia entera cada vez que pasa caminando.
  const inCave = cave && cat && cave.holds(cat.x) &&
                 cat.surface && cat.surface.isFloor && !cat.airborne
  drawFurn(cave, 'cave_back')
  if (!inCave) drawFurn(cave, 'cave_front')

  // El arenero igual que la cueva: la bandeja detras, el borde por delante.
  const inLitter = litter && cat && litter.holds(cat.x) &&
                   cat.surface && cat.surface.isFloor && !cat.airborne
  drawFurn(litter, 'litter_back')
  if (!inLitter) drawFurn(litter, 'litter_front')

  // Su cama va partida en dos: el fondo detras de ella y el borde de adelante
  // por encima, para que se la vea metida adentro y no parada sobre la cama.
  if (bed) propSheet.draw(ctx, 'bed_back', 0, bed.x, bed.y, cat.scale, false)
  if (water) {
    propSheet.draw(ctx, water.anim, now, water.x, water.y, cat.scale, false)
  }
  if (bowl && bowl.visible) {
    propSheet.draw(ctx, bowl.anim, now, bowl.x, bowl.y, cat.scale, false)
  }
  if (treat && treat.active) {
    propSheet.draw(ctx, 'treat', now, treat.x, treat.y, cat.scale, false)
  }
  if (ball && ball.active) {
    propSheet.draw(ctx, 'ball', ball.spin * 1000, ball.x, ball.y, cat.scale, false)
  }
  if (cat) cat.draw(ctx)
  if (inCave) drawFurn(cave, 'cave_front')
  if (inLitter) drawFurn(litter, 'litter_front')
  if (bed) propSheet.draw(ctx, 'bed_front', 0, bed.x, bed.y, cat.scale, false)
  maybePurr(now)
  drawPurrs(dt)
  drawStats(now)
  drawHearts(dt)
  drawTip()
  drawBubble()

  requestAnimationFrame(loop)
}
