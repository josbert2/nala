'use strict'

import { SpriteSheet } from './engine/sprites.js'
import { World } from './engine/world.js'
import { Cat } from './engine/cat.js'
import { Bowl, Ball, Treat } from './engine/props.js'
import { Moments, Notes, Schedule } from './engine/moments.js'

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')
const bubbleEl = document.getElementById('bubble')
const tipEl = document.getElementById('tip')

// Lo que se muestra en el tooltip segun lo que este haciendo.
const ACTION_LABELS = {
  play: 'jugando',
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
  sleep: 'durmiendo',
  groom: 'lamiendose'
}

let sheet = null
let propSheet = null
let world = null
let cat = null
let bowl = null
let ball = null
let treat = null
let meals = null
let playtimes = null
let moments = null
let notes = null
let origin = { x: 0, y: 0 }        // esquina de la pantalla que cubre la ventana
let lastHotKey = ''
let hearts = []

const pointer = {
  x: -1, y: -1, active: false, movingMs: 9999, lastMove: 0,
  speed: 0, wiggle: 0, lastDir: 0, reversals: []
}

let lastTouch = performance.now()   // ultima vez que interactuaste con ella
let missCooldown = 0
let missAfterMs = 12 * 60 * 1000    // cuanto aguanta antes de venir a buscarte

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
  if (world) world.resize(window.innerWidth, window.innerHeight)
}

window.nala.onBoot(async ({ config, display, debug }) => {
  origin = { x: display.x, y: display.y }

  ;[sheet, propSheet] = await Promise.all([
    SpriteSheet.load('../../assets/sprites/cat.png', '../../assets/sprites/cat.json'),
    SpriteSheet.load('../../assets/sprites/props.png', '../../assets/sprites/props.json')
  ])

  world = new World(window.innerWidth, window.innerHeight)
  cat = new Cat(world, sheet, config.scale || 2)
  bowl = new Bowl(world, config.bowlAt != null ? config.bowlAt : 0.12)
  ball = new Ball(world)
  treat = new Treat(world)
  cat.props = { bowl, ball, treat }
  world.setFloorMargin((sheet.ch - sheet.ground) * cat.scale + 2)

  meals = new Schedule(config.meals)
  playtimes = new Schedule(config.playtimes)
  moments = new Moments(config.moments)
  notes = new Notes(config.notes, (config.noteEveryMinutes || 25) * 60 * 1000)
  missAfterMs = (config.missYouAfterMinutes || 12) * 60 * 1000

  resize()
  if (config.greeting) cat.say(config.greeting, 7000)
  requestAnimationFrame(loop)

  if (debug) {
    // Autotest: saca la pelota y captura el canvas para poder mirarlo.
    setTimeout(() => { cat.playtime(); console.log('[nala] playtime() llamado') }, 2500)
    setTimeout(() => {
      console.log(`[nala] ball.active=${ball.active} x=${ball.x.toFixed(0)} y=${ball.y.toFixed(0)} estado=${cat.state}`)
      window.nala.debugShot(canvas.toDataURL('image/png'))
    }, 5000)
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
  if (cmd.type === 'feed') cat.mealtime()
  if (cmd.type === 'play') cat.playtime()
  if (cmd.type === 'treat') cat.giveTreat()
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

window.addEventListener('mouseup', () => {
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
  }

  grip = null
  touched()
})

window.addEventListener('dblclick', (e) => {
  if (cat && hit(e.clientX, e.clientY)) { cat.meow(); touched() }
})

window.addEventListener('contextmenu', (e) => e.preventDefault())

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

// ----------------------------------------------------------------- menu rapido

const menuEl = document.getElementById('menu')
let menuOpen = false

const MENU_ITEMS = [
  ['Acariciarla', () => { cat.pet(); popHearts(cat.x, cat.y - 40) }],
  ['Darle un premio', () => cat.giveTreat(cat.x + (Math.random() < 0.5 ? -1 : 1) * 170)],
  ['Sacar la pelota', () => cat.playtime()],
  ['Servirle la comida', () => cat.mealtime()],
  ['Que duerma', () => cat.napNow()]
]

function showMenu (x, y) {
  menuEl.innerHTML = ''
  for (const [label, action] of MENU_ITEMS) {
    const b = document.createElement('button')
    b.textContent = label
    b.addEventListener('click', () => { action(); touched(); hideMenu() })
    menuEl.appendChild(b)
  }
  menuEl.hidden = false
  menuOpen = true
  const w = menuEl.offsetWidth
  const h = menuEl.offsetHeight
  menuEl.style.left = `${Math.min(x, window.innerWidth - w - 8)}px`
  menuEl.style.top = `${Math.min(y, window.innerHeight - h - 8)}px`
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
  const left = Math.max(6, Math.min(window.innerWidth - w - 6, b.x + b.w / 2 - w / 2))
  tipEl.style.left = `${left}px`
  tipEl.style.top = `${Math.max(6, b.y - tipEl.offsetHeight - 8)}px`
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
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, b.x + b.w / 2 - 30))
  bubbleEl.style.left = `${left}px`
  bubbleEl.style.top = `${Math.max(8, b.y - bubbleEl.offsetHeight - 12)}px`
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
    } else {
      const due = moments.due()
      if (due) {
        if (due.state) cat.setState(due.state, due.hold || 12000)
        if (due.note) cat.say(due.note, 9000)
      } else if (!cat.bubble) {
        const note = notes.due()
        if (note) cat.say(note, 8000)
      }
    }

    bowl.update(dt)
    ball.update(dt)

    // Hace rato que no la tocas: te viene a buscar.
    if (now - lastTouch > missAfterMs && now - missCooldown > missAfterMs) {
      missCooldown = now
      cat.missYou()
    }
    cat.update(dt, { pointer })
    sendHotRects()
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
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
  drawHearts(dt)
  drawTip()
  drawBubble()

  requestAnimationFrame(loop)
}
