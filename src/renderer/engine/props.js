'use strict'

const GRAVITY = 1500
const BOUNCE = 0.52
const FRICTION = 0.86

const clamp = (v, max) => Math.max(-max, Math.min(max, v))

/**
 * Un objeto clavado a un punto del piso de un monitor.
 *
 * `xFraction` es la fraccion del ancho de SU pantalla, no del escritorio
 * entero: asi las cosas no se corren de lugar cuando ella pasa a andar por
 * varias. Por defecto van en la principal; `displayIndex` las manda a otra.
 */
class Anchored {
  constructor (world, xFraction, displayIndex = null) {
    this.world = world
    this.xFraction = xFraction
    this.displayIndex = displayIndex
  }

  get display () {
    const ds = this.world.displays
    if (this.displayIndex != null && ds[this.displayIndex]) return ds[this.displayIndex]
    return ds.find((d) => d.primary) || ds[0]
  }

  get x () {
    const d = this.display
    return d.x + d.width * this.xFraction
  }

  get y () { return this.world.floorAt(this.x).y }
}

/**
 * Su cama. Se dibuja en dos partes: el fondo va detras de ella y el borde de
 * adelante por encima, para que quede metida adentro y no parada sobre ella.
 */
export class Bed extends Anchored {
  constructor (world, xFraction = 0.86, displayIndex = null) {
    super(world, xFraction, displayIndex)
  }

  /** Ya llego: esta lo bastante cerca como para estar echada adentro. */
  holds (x) {
    return Math.abs(x - this.x) < 26
  }
}

/** El plato. Vive en un punto fijo del piso y se llena a las horas de comer. */
export class Bowl extends Anchored {
  constructor (world, xFraction = 0.12, displayIndex = null) {
    super(world, xFraction, displayIndex)
    this.food = 0            // 1 = lleno, 0 = vacio
    this.visible = false
  }

  get anim () { return this.food > 0 ? 'bowl_full' : 'bowl_empty' }

  serve () {
    this.food = 1
    this.visible = true
  }

  /** La gata come: vacia el plato en `seconds`. */
  nibble (dt, seconds = 12) {
    this.food = Math.max(0, this.food - dt / seconds)
    return this.food <= 0
  }

  /** El plato vacio se guarda despues de un rato. */
  update (dt) {
    if (this.visible && this.food <= 0) {
      this._emptyFor = (this._emptyFor || 0) + dt
      if (this._emptyFor > 45) { this.visible = false; this._emptyFor = 0 }
    } else {
      this._emptyFor = 0
    }
  }
}

/** Un premio en el piso. Ella corre a comerlo. */
export class Treat {
  constructor (world) {
    this.world = world
    this.active = false
    this.x = 0
    this.amount = 0
  }

  get y () { return this.world.floorAt(this.x).y }

  drop (x) {
    this.active = true
    this.x = Math.max(30, Math.min(this.world.width - 30, x))
    this.amount = 1
  }

  nibble (dt, seconds = 4) {
    this.amount -= dt / seconds
    if (this.amount <= 0) {
      this.active = false
      return true
    }
    return false
  }
}

/** La pelotita. Rueda, rebota y se queda quieta hasta que alguien la toca. */
export class Ball {
  constructor (world) {
    this.world = world
    this.active = false
    this.x = 0
    this.y = 0
    this.vx = 0
    this.vy = 0
    this.spin = 0
    this.idleFor = 0
    this.held = false        // el usuario la esta arrastrando
  }

  /** La agarras con el mouse: queda suspendida donde la lleves. */
  hold (x, y) {
    this.held = true
    this.vx = (x - this.x) * 8
    this.vy = (y - this.y) * 8
    this.x = x
    this.y = y
    this.idleFor = 0
  }

  drop () {
    this.held = false
    // Se va con la velocidad que traia la mano.
    this.vx = Math.max(-600, Math.min(600, this.vx))
    this.vy = Math.max(-600, Math.min(600, this.vy))
  }

  spawn (x, y) {
    this.active = true
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 140
    this.vy = -180
    this.idleFor = 0
  }

  /**
   * Un manotazo. La distancia sale distinta cada vez, y cada tanto le pega
   * justo y la pelota sale disparada de punta a punta de la pantalla.
   */
  kick (dir, power = 1) {
    const blast = Math.random() < 0.22 ? 2.0 + Math.random() * 1.4 : 0.7 + Math.random() * 0.8
    const p = power * blast
    this.vx = clamp(dir * (110 + Math.random() * 210) * p, 1500)
    this.vy = clamp(-(100 + Math.random() * 180) * p, 1100)
    this.blast = blast > 1.8
    this.idleFor = 0
  }

  get resting () {
    return this.active && Math.abs(this.vx) < 6 && Math.abs(this.vy) < 6
  }

  update (dt) {
    if (!this.active || this.held) return

    this.vy += GRAVITY * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.spin += this.vx * dt * 0.06

    const w = this.world.width
    if (this.x < 8) { this.x = 8; this.vx = -this.vx * BOUNCE }
    if (this.x > w - 8) { this.x = w - 8; this.vx = -this.vx * BOUNCE }

    const ground = this.world.landingBelow(this.x, this.y - this.vy * dt)
    if (this.y >= ground.y) {
      this.y = ground.y
      if (Math.abs(this.vy) > 40) {
        this.vy = -this.vy * BOUNCE
      } else {
        this.vy = 0
      }
      this.vx *= FRICTION
      if (Math.abs(this.vx) < 4) this.vx = 0
    }

    // Si nadie la toca por un buen rato, desaparece.
    this.idleFor = this.resting ? this.idleFor + dt : 0
    if (this.idleFor > 75) this.active = false
  }
}
