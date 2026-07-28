'use strict'

const GRAVITY = 1500
const BOUNCE = 0.52
const FRICTION = 0.86

/** El plato. Vive en un punto fijo del piso y se llena a las horas de comer. */
export class Bowl {
  constructor (world, xFraction = 0.12) {
    this.world = world
    this.xFraction = xFraction
    this.food = 0            // 1 = lleno, 0 = vacio
    this.visible = false
  }

  get x () { return this.world.width * this.xFraction }
  get y () { return this.world.floor.y }
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
  }

  spawn (x, y) {
    this.active = true
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 140
    this.vy = -180
    this.idleFor = 0
  }

  kick (dir, power = 1) {
    this.vx = dir * (120 + Math.random() * 180) * power
    this.vy = -(120 + Math.random() * 160) * power
    this.idleFor = 0
  }

  get resting () {
    return this.active && Math.abs(this.vx) < 6 && Math.abs(this.vy) < 6
  }

  update (dt) {
    if (!this.active) return

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
