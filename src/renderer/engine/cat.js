'use strict'

const GRAVITY = 1500        // px/s^2
const WALK_SPEED = 42       // px/s
const RUN_SPEED = 130
const SLIDE_SPEED = 320     // el envion del derrape
const MAX_FALL = 900
const HUNT_COOLDOWN = 20000  // cuanto espera antes de volver a cazar el cursor

// Estados que son "estar quieta en algun lado" y pueden elegirse al azar.
const RESTING = ['idle', 'sit', 'sleep', 'groom', 'stretch']

export class Cat {
  constructor (world, sheet, scale) {
    this.world = world
    this.sheet = sheet
    this.scale = scale

    this.x = world.width * 0.5
    this.y = world.floor.y
    this.vx = 0
    this.vy = 0
    this.facing = 1
    this.surface = world.floor

    this.state = 'idle'
    this.anim = 'idle'
    this.elapsed = 0
    this.hold = 3000

    this.energy = 0.7          // 1 = despierta y activa, 0 = dormida
    this.target = null         // {x} a donde va caminando
    this.after = null          // que hace al llegar
    this.props = null          // {bowl, ball}
    this.pinned = false        // el usuario la agarro con el mouse
    this.bubble = null         // {text, until}
    this.huntCooldownUntil = 0 // no vuelve a cazar el cursor hasta aca
  }

  get bounds () {
    return this.sheet.bounds(this.x, this.y, this.scale)
  }

  say (text, ms = 4200) {
    this.bubble = { text, until: performance.now() + ms }
  }

  // ------------------------------------------------------------------ estados

  setState (state, hold) {
    this.state = state
    this.elapsed = 0
    this.hold = hold != null ? hold : this._defaultHold(state)
    this.anim = this._animFor(state)
  }

  _animFor (state) {
    switch (state) {
      case 'walkTo': return 'walk'
      case 'chase':
      case 'chaseBall':
      case 'chaseCursor': return 'run'
      case 'slide': return 'slide'
      case 'seek': return 'walk'
      case 'eatTreat': return 'eat'
      case 'meow': return 'alert'
      case 'jump':
      case 'fall': return 'fall'
      case 'purr': return 'idle'
      case 'dragged': return 'fall'
      case 'watch': return 'alert'
      default: return state
    }
  }

  _defaultHold (state) {
    const r = (a, b) => a + Math.random() * (b - a)
    switch (state) {
      case 'idle': return r(3000, 9000)
      case 'sit': return r(4000, 12000)
      case 'sleep': return r(25000, 90000)
      case 'groom': return r(4000, 9000)
      case 'stretch': return 1400
      case 'watch': return r(2000, 5000)
      case 'purr': return 5000
      case 'eat': return 30000
      case 'crouch': return r(900, 1900)
      case 'play': return r(2500, 6000)
      case 'chaseBall': return 9000
      case 'chaseCursor': return 7000
      case 'slide': return 2600
      case 'eatTreat': return 20000
      case 'seek': return 14000
      case 'meow': return 2200
      default: return 4000
    }
  }

  get airborne () {
    return this.state === 'fall' || this.state === 'jump' ||
           this.state === 'pounce' || this.state === 'dragged'
  }

  // -------------------------------------------------------------------- update

  update (dt, ctx) {
    this.elapsed += dt * 1000

    if (this.bubble && performance.now() > this.bubble.until) this.bubble = null

    // La energia baja sola y se recupera durmiendo.
    this.energy += (this.state === 'sleep' ? 0.02 : -0.006) * dt
    this.energy = Math.min(1, Math.max(0, this.energy))

    if (this.state === 'dragged') { this._physics(dt, false); return }

    this._react(ctx)
    this._act(dt, ctx)
    this._physics(dt, true)

    if (!this.airborne && this.elapsed > this.hold) this._onHoldEnd(ctx)
  }

  /** Encadenamientos fijos: agazaparse siempre termina en salto. */
  _onHoldEnd (ctx) {
    if (this.state === 'crouch') { this._pounceAtBall(); return }
    if (this.state === 'play') {
      const ball = this.props && this.props.ball
      if (ball && ball.active && Math.abs(ball.x - this.x) > 40) {
        this.setState('chaseBall')
        return
      }
    }
    this._decide(ctx)
  }

  /** Llego a destino caminando. */
  _arrive () {
    this.target = null
    const next = this.after
    this.after = null
    this.setState(next || 'idle')
  }

  /** Reacciones inmediatas que pueden cortar lo que este haciendo. */
  _react (ctx) {
    if (this.airborne || this.state === 'purr') return
    const p = ctx.pointer
    if (!p.active) return

    const b = this.bounds
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const dist = Math.hypot(p.x - cx, p.y - cy)

    // Le sacudis el cursor cerca y sale a cazarlo, como con un puntero laser.
    // Pide un zarandeo deliberado (varios cambios de direccion), no cualquier
    // movimiento, y despues se toma un rato largo antes de volver a picar.
    // Sin esto se la pasaba saltando mientras vos trabajabas.
    if (p.speed > 1500 && p.wiggle >= 4 && dist < 260 && this.energy > 0.28 &&
        performance.now() > this.huntCooldownUntil &&
        (RESTING.includes(this.state) || this.state === 'watch')) {
      this.huntCooldownUntil = performance.now() + HUNT_COOLDOWN
      this.setState('chaseCursor')
      return
    }

    // Cursor muy cerca y moviendose: se despierta y mira.
    if (dist < 160 && p.movingMs < 400) {
      if (this.state === 'sleep') {
        this.setState('stretch', 1400)
        this.energy = Math.max(this.energy, 0.5)
        return
      }
      if (RESTING.includes(this.state) && this.state !== 'stretch') {
        this.facing = p.x > cx ? 1 : -1
        this.setState('watch')
      }
    }
  }

  /** Ejecuta el estado actual. */
  _act (dt, ctx) {
    switch (this.state) {
      case 'walkTo': {
        if (!this.target) { this._arrive(); break }
        const dx = this.target.x - this.x
        if (Math.abs(dx) < 5) { this.vx = 0; this._arrive(); break }
        this.facing = Math.sign(dx)
        this.vx = this.facing * WALK_SPEED
        break
      }
      case 'eat': {
        this.vx = 0
        const bowl = this.props && this.props.bowl
        if (!bowl || bowl.food <= 0) { this.setState('groom', 5000); break }
        this.facing = bowl.x > this.x ? 1 : -1
        if (bowl.nibble(dt)) {
          this.energy = Math.min(1, this.energy + 0.35)
          this.setState('groom', 6000)
        }
        break
      }
      case 'chaseBall': {
        const ball = this.props && this.props.ball
        if (!ball || !ball.active) { this.setState('idle', 1200); break }
        const dx = ball.x - this.x
        const adx = Math.abs(dx)
        if (adx < 34 && Math.abs(ball.y - this.y) < 60) {
          this.vx = 0
          this.pounceTarget = ball.x
          this.setState('crouch')
          break
        }
        this.facing = Math.sign(dx) || 1
        // Viene de lejos y a veces se tira de panza a derrapar hasta la pelota.
        if (adx > 60 && adx < 220 && this.energy > 0.35 && Math.random() < dt * 2.6) {
          this._startSlide(ball.x)
          break
        }
        this.vx = this.facing * RUN_SPEED
        break
      }
      case 'slide': {
        // Derrape: viene a fondo y va frenando. Si toca la pelota, la empuja.
        this.vx *= Math.pow(0.14, dt)
        const ball = this.props && this.props.ball
        if (ball && ball.active && Math.abs(ball.x - this.x) < 32 &&
            Math.abs(ball.y - this.y) < 50) {
          // El envion del derrape se la lleva puesta, con suerte variable.
          ball.vx = this.vx * (1.1 + Math.random() * 2.2)
          ball.vy = Math.min(ball.vy, -(90 + Math.random() * 260))
          ball.idleFor = 0
        }
        if (Math.abs(this.vx) < 28) {
          this.vx = 0
          this.setState('play')
        }
        break
      }
      case 'chaseCursor': {
        const p = ctx.pointer
        if (!p.active) { this.setState('idle', 1000); break }
        const dx = p.x - this.x
        this.facing = Math.sign(dx) || 1
        if (Math.abs(dx) < 40) {
          this.vx = 0
          this.pounceTarget = p.x
          this.setState('crouch', 600)
          break
        }
        this.vx = this.facing * RUN_SPEED
        break
      }
      case 'eatTreat': {
        this.vx = 0
        const treat = this.props && this.props.treat
        if (!treat || !treat.active) { this.setState('groom', 4000); break }
        this.facing = treat.x > this.x ? 1 : -1
        if (treat.nibble(dt)) {
          this.energy = Math.min(1, this.energy + 0.2)
          this.setState('groom', 5000)
        }
        break
      }
      case 'seek': {
        // Te extraña: camina hacia donde esta tu cursor.
        const p = ctx.pointer
        if (!p.active) { this.setState('idle', 1200); break }
        const dx = p.x - this.x
        if (Math.abs(dx) < 70) { this.vx = 0; this.setState('watch', 4000); break }
        this.facing = Math.sign(dx)
        this.vx = this.facing * WALK_SPEED
        break
      }
      case 'crouch': {
        this.vx = 0
        const ball = this.props && this.props.ball
        if (ball && ball.active) this.facing = ball.x > this.x ? 1 : -1
        break
      }
      case 'play': {
        this.vx = 0
        const ball = this.props && this.props.ball
        if (!ball || !ball.active) { this.setState('idle', 1500); break }
        this.facing = ball.x > this.x ? 1 : -1
        // Manotazo cuando la pelota pasa cerca.
        if (Math.abs(ball.x - this.x) < 30 && ball.resting && Math.random() < dt * 1.4) {
          ball.kick(this.facing, 0.6)
        }
        break
      }
      case 'chase': {
        const p = ctx.pointer
        const dx = p.x - this.x
        if (Math.abs(dx) < 24) { this.vx = 0; this.setState('purr'); break }
        this.facing = Math.sign(dx)
        this.vx = this.facing * RUN_SPEED
        break
      }
      case 'watch': {
        this.vx = 0
        const p = ctx.pointer
        if (p.active) this.facing = p.x > this.x ? 1 : -1
        break
      }
      default:
        this.vx = 0
    }
  }

  /** Gravedad, bordes y aterrizaje. */
  _physics (dt, useSurfaces) {
    this.x += this.vx * dt

    if (this.airborne) {
      this.vy = Math.min(MAX_FALL, this.vy + GRAVITY * dt)
      this.y += this.vy * dt
      this.x = Math.max(8, Math.min(this.world.width - 8, this.x))

      if (this.state === 'dragged') return

      const wasPounce = this.state === 'pounce'
      const landing = this.world.landingBelow(this.x, this.y - this.vy * dt)
      if (this.y >= landing.y) {
        this.y = landing.y
        this.vy = 0
        this.vx = 0
        this.surface = landing
        if (wasPounce) {
          const ball = this.props && this.props.ball
          if (ball && ball.active && Math.abs(ball.x - this.x) < 46) {
            ball.kick(this.facing, 0.9)
          }
          this.setState('play')
        } else {
          this.setState('sit', 900)
        }
      }
      return
    }

    if (!useSurfaces) return

    // Sigue a su superficie: si la ventana se movio o se cerro, se cae.
    const live = this.world.surfaceAt(this.surface.id)
    if (!live) { this._drop(); return }
    this.surface = live
    this.y = live.y

    if (this.x < live.x1 + 6) {
      if (live.id === 'floor') { this.x = live.x1 + 6; this._turn() } else this._drop()
    } else if (this.x > live.x2 - 6) {
      if (live.id === 'floor') { this.x = live.x2 - 6; this._turn() } else this._drop()
    }
  }

  _turn () {
    this.facing *= -1
    if (this.target) this.target = null
    if (this.state === 'walkTo') this.setState('idle', 1200)
  }

  _drop () {
    this.vy = 20
    this.vx = this.facing * 24
    this.surface = null
    this.setState('fall', 0)
  }

  /** Elige que hacer despues. Aca vive la personalidad. */
  _decide (ctx) {
    const roll = Math.random()

    // El premio gana sobre todo lo demas. Es un premio.
    const treat = this.props && this.props.treat
    if (treat && treat.active && this.state !== 'eatTreat') {
      this.goTo(treat.x, 'eatTreat')
      return
    }

    // Despues el plato servido.
    const bowl = this.props && this.props.bowl
    if (bowl && bowl.food > 0 && this.state !== 'eat') {
      this.goTo(bowl.x, 'eat')
      return
    }

    // La pelota tambien tira, salvo que este muerta de sueño.
    const ball = this.props && this.props.ball
    if (ball && ball.active && this.energy > 0.3) {
      this.setState('chaseBall')
      return
    }

    // Muy cansada: se duerme casi seguro.
    if (this.energy < 0.2) { this.setState('sleep'); return }

    // De vez en cuando se sube a una ventana.
    if (roll < 0.18) {
      const ledge = this.world.reachableLedge(this.x, this.y)
      if (ledge) { this._jumpTo(ledge); return }
    }

    // O baja de donde esta.
    if (this.surface && this.surface.id !== 'floor' && roll > 0.9) { this._drop(); return }

    if (roll < 0.42) {
      const s = this.surface || this.world.floor
      const min = s.x1 + 20
      const max = s.x2 - 20
      this.target = { x: min + Math.random() * Math.max(1, max - min) }
      this.setState('walkTo', 12000)
      return
    }

    const pool = this.energy < 0.45
      ? ['sleep', 'sleep', 'idle', 'groom']
      : ['idle', 'sit', 'groom', 'stretch', 'idle']
    this.setState(pool[Math.floor(Math.random() * pool.length)])
  }

  /** Arranca el derrape hacia tx. */
  _startSlide (tx) {
    this.facing = tx >= this.x ? 1 : -1
    this.vx = this.facing * SLIDE_SPEED
    this.setState('slide', 2600)
  }

  _pounceAtBall () {
    const ball = this.props && this.props.ball
    const tx = this.pounceTarget != null
      ? this.pounceTarget
      : (ball && ball.active ? ball.x : this.x + this.facing * 70)
    this.pounceTarget = null
    this.facing = tx >= this.x ? 1 : -1
    this.vy = -330
    const timeUp = -this.vy / GRAVITY
    this.vx = (tx - this.x) / Math.max(0.2, timeUp * 1.6)
    this.surface = null
    this.setState('pounce', 0)
  }

  _jumpTo (ledge) {
    const tx = Math.max(ledge.x1 + 20, Math.min(ledge.x2 - 20, this.x))
    const rise = this.y - ledge.y
    this.facing = tx >= this.x ? 1 : -1
    this.vy = -Math.sqrt(2 * GRAVITY * (rise + 30))
    const timeUp = -this.vy / GRAVITY
    this.vx = (tx - this.x) / Math.max(0.25, timeUp * 1.35)
    this.surface = null
    this.setState('jump', 0)
  }

  // ---------------------------------------------------------------- comandos

  /** Camina hasta x y ahi hace `then`. */
  goTo (x, then, hold) {
    this.target = { x: Math.max(20, Math.min(this.world.width - 20, x)) }
    this.after = then || null
    this.setState('walkTo', hold || 25000)
  }

  come (x) {
    this.target = { x: Math.max(20, Math.min(this.world.width - 20, x)) }
    this.setState('chase', 6000)
  }

  /** Hora de comer: se despierta y va al plato. */
  mealtime () {
    const bowl = this.props && this.props.bowl
    if (!bowl) return
    bowl.serve()
    this.energy = Math.max(this.energy, 0.55)
    this.goTo(bowl.x, 'eat')
  }

  /** Le tiras un premio. Va corriendo. */
  giveTreat (x) {
    const treat = this.props && this.props.treat
    if (!treat) return
    treat.drop(x != null ? x : this.x + (Math.random() < 0.5 ? -1 : 1) * 160)
    this.energy = Math.max(this.energy, 0.5)
    this.goTo(treat.x, 'eatTreat')
  }

  /** Maulla. */
  meow () {
    this.setState('meow')
  }

  /** Hace rato que no la tocas: te viene a buscar. */
  missYou () {
    if (this.airborne || this.state === 'eat' || this.state === 'eatTreat') return
    this.energy = Math.max(this.energy, 0.45)
    this.setState('seek')
  }

  /** Hora de jugar: aparece la pelota cerca de ella. */
  playtime () {
    const ball = this.props && this.props.ball
    if (!ball) return
    const side = Math.random() < 0.5 ? -1 : 1
    const x = Math.max(40, Math.min(this.world.width - 40, this.x + side * (90 + Math.random() * 140)))
    ball.spawn(x, this.world.floor.y - 160)
    this.energy = Math.max(this.energy, 0.6)
    this.setState('watch', 1200)
  }

  pet () {
    this.setState('purr')
    this.energy = Math.min(1, this.energy + 0.15)
  }

  napNow () {
    this.setState('sleep')
    this.energy = Math.min(this.energy, 0.3)
  }

  grab (x, y) {
    this.pinned = true
    this.surface = null
    this.vx = 0
    this.vy = 0
    this.setState('dragged', 0)
    this.x = x
    this.y = y
  }

  release () {
    this.pinned = false
    this.setState('fall', 0)
  }

  draw (ctx) {
    this.sheet.draw(ctx, this.anim, this.elapsed, this.x, this.y, this.scale, this.facing < 0)
  }
}
