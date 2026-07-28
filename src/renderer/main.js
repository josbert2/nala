'use strict'

import { SpriteSheet } from './engine/sprites.js'
import { World } from './engine/world.js'
import { Cat } from './engine/cat.js'
import { Bowl, Ball } from './engine/props.js'
import { Moments, Notes, Schedule } from './engine/moments.js'

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')
const bubbleEl = document.getElementById('bubble')
const tipEl = document.getElementById('tip')

// Lo que se muestra en el tooltip segun lo que este haciendo.
const ACTION_LABELS = {
  play: 'jugando',
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
let meals = null
let playtimes = null
let moments = null
let notes = null
let origin = { x: 0, y: 0 }        // esquina de la pantalla que cubre la ventana
let interactive = false
let hearts = []

const pointer = { x: -1, y: -1, active: false, movingMs: 9999, lastMove: 0 }

// --------------------------------------------------------------------- setup

function resize () {
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(window.innerWidth * dpr)
  canvas.height = Math.round(window.innerHeight * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
  if (world) world.resize(window.innerWidth, window.innerHeight)
}

window.nala.onBoot(async ({ config, display }) => {
  origin = { x: display.x, y: display.y }

  ;[sheet, propSheet] = await Promise.all([
    SpriteSheet.load('../../assets/sprites/cat.png', '../../assets/sprites/cat.json'),
    SpriteSheet.load('../../assets/sprites/props.png', '../../assets/sprites/props.json')
  ])

  world = new World(window.innerWidth, window.innerHeight)
  cat = new Cat(world, sheet, config.scale || 2)
  bowl = new Bowl(world, config.bowlAt != null ? config.bowlAt : 0.12)
  ball = new Ball(world)
  cat.props = { bowl, ball }

  meals = new Schedule(config.meals)
  playtimes = new Schedule(config.playtimes)
  moments = new Moments(config.moments)
  notes = new Notes(config.notes, (config.noteEveryMinutes || 25) * 60 * 1000)

  resize()
  if (config.greeting) cat.say(config.greeting, 7000)
  requestAnimationFrame(loop)
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
  if (cmd.type === 'free') { cat.target = null; cat.after = null; cat.setState('idle', 500) }
})

window.addEventListener('resize', resize)

// ------------------------------------------------------------------- puntero

window.addEventListener('mousemove', (e) => {
  pointer.x = e.clientX
  pointer.y = e.clientY
  pointer.active = true
  pointer.lastMove = performance.now()
  if (cat && cat.pinned) { cat.x = e.clientX; cat.y = e.clientY + 20 }
})

window.addEventListener('mousedown', (e) => {
  if (!cat || e.button !== 0) return

  // Manotazo a la pelota: la pateás vos.
  if (hitBall(e.clientX, e.clientY)) {
    ball.kick(e.clientX > ball.x ? -1 : 1, 1.1)
    return
  }

  if (hit(e.clientX, e.clientY)) {
    cat.grab(e.clientX, e.clientY + 20)
    cat._dragStart = performance.now()
  }
})

window.addEventListener('mouseup', (e) => {
  if (!cat || !cat.pinned) return
  const quick = performance.now() - (cat._dragStart || 0) < 220
  cat.release()
  if (quick) { cat.pet(); popHearts(cat.x, cat.y - 40) }   // fue un click, no un arrastre
})

window.addEventListener('dblclick', (e) => {
  if (cat && hit(e.clientX, e.clientY)) cat.pet()
})

function hit (x, y) {
  if (!cat) return false
  const b = cat.bounds
  return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
}

function hitBall (x, y) {
  if (!ball || !ball.active) return false
  const r = 9 * cat.scale
  return Math.hypot(x - ball.x, y - (ball.y - 7 * cat.scale)) <= r
}

/**
 * La ventana cubre toda la pantalla, asi que por defecto el mouse la atraviesa.
 * Solo se vuelve solida cuando el cursor esta encima de la gata.
 */
function updateInteractive () {
  const want = cat
    ? (cat.pinned || hit(pointer.x, pointer.y) || hitBall(pointer.x, pointer.y))
    : false
  if (want !== interactive) {
    interactive = want
    window.nala.setInteractive(want)
  }
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
    cat.update(dt, { pointer })
    updateInteractive()
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (bowl && bowl.visible) {
    propSheet.draw(ctx, bowl.anim, now, bowl.x, bowl.y, cat.scale, false)
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
