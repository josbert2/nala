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
export class Anchored {
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

/**
 * Su bebedero. Casi siempre se lo encuentra lleno — tiene su fuente y se las
 * arregla sola. Cada tanto lo encuentra vacio y ahi si te lo pide.
 */
export class Water extends Anchored {
  constructor (world, xFraction = 0.05, displayIndex = null) {
    super(world, xFraction, displayIndex)
    this.level = 1
    this.visible = true
  }

  get anim () { return this.level > 0.06 ? 'water_full' : 'water_empty' }
  get vacio () { return this.level <= 0.06 }

  fill () { this.level = 1 }

  /** Un buen trago: le baja el nivel un cuarto. */
  beber () {
    this.level = Math.max(0, this.level - 0.25)
  }
}

/**
 * Una mariposa.
 *
 * Vuela sola eligiendo destinos al azar, y si ella se acerca demasiado se
 * espanta y sube. No se puede atrapar, y esa es la idea: un gato persiguiendo
 * una mariposa nunca gana, y por eso lo sigue haciendo.
 */
export class Butterfly {
  constructor (world) {
    this.world = world
    this.active = false
    this.x = 0
    this.y = 0
    this.tx = 0
    this.ty = 0
    this.phase = 0        // el aleteo
    this.hold = 0         // cuanto falta para elegir otro destino
    this.life = 0
    this.spooked = 0      // cuanto le dura el susto
  }

  spawn (x, y) {
    const d = this.world.displayAt ? this.world.displayAt(x) : null
    this.active = true
    this.x = x
    this.y = y != null ? y : this.world.floorAt(x).y - 140
    this.tx = this.x
    this.ty = this.y
    this.life = 70 + Math.random() * 70
    this.hold = 0
    this.spooked = 0
    this._d = d
  }

  /** Elige un lugar nuevo al que ir, dentro de la pantalla donde esta. */
  _pick (awayFrom) {
    const d = this.world.displayAt ? this.world.displayAt(this.x) : null
    const x1 = d ? d.x + 30 : 30
    const x2 = d ? d.x + d.width - 30 : this.world.width - 30
    const suelo = this.world.floorAt(this.x).y

    if (awayFrom != null) {
      // Espantada: se va para el otro lado y hacia arriba.
      const lejos = awayFrom > this.x ? x1 : x2
      this.tx = this.x + (lejos - this.x) * (0.35 + Math.random() * 0.3)
      this.ty = suelo - 150 - Math.random() * 110
      this.hold = 1.1
      return
    }
    this.tx = x1 + Math.random() * (x2 - x1)
    this.ty = suelo - 40 - Math.random() * 190
    this.hold = 1.4 + Math.random() * 2.2
  }

  update (dt, catX, catY) {
    if (!this.active) return
    this.phase += dt
    this.life -= dt
    this.spooked = Math.max(0, this.spooked - dt)

    // Si la tiene encima, se espanta.
    if (catX != null && Math.hypot(catX - this.x, (catY - 40) - this.y) < 120 &&
        this.spooked <= 0) {
      this.spooked = 1.6
      this._pick(catX)
    }

    this.hold -= dt
    if (this.hold <= 0) this._pick()

    const vel = this.spooked > 0 ? 210 : 62
    const dx = this.tx - this.x
    const dy = this.ty - this.y
    const dist = Math.hypot(dx, dy) || 1
    const paso = Math.min(dist, vel * dt)
    this.x += (dx / dist) * paso
    this.y += (dy / dist) * paso
    // El vaiven del vuelo, que es lo que la hace mariposa y no dron.
    this.y += Math.sin(this.phase * 7) * 26 * dt
    this.x += Math.cos(this.phase * 3.4) * 14 * dt

    if (this.life <= 0) this.active = false   // se va sola
  }
}

/**
 * Un pajarito.
 *
 * Cruza la pantalla volando, cada tanto se posa en algo, picotea un rato, y se
 * va. Si ella se acerca demasiado levanta vuelo antes de que llegue — no se
 * deja agarrar nunca, que es de lo que se trata.
 */
export class Bird {
  constructor (world) {
    this.world = world
    this.active = false
    this.x = 0
    this.y = 0
    this.vx = 0
    this.posado = false
    this.phase = 0
    this.hold = 0
    this.life = 0
    this.facing = 1
  }

  get anim () { return this.posado ? 'bird_perch' : 'bird' }

  /** Entra volando por un costado. */
  spawn (desde) {
    const d = this.world.displayAt ? this.world.displayAt(this.world.width / 2) : null
    const x1 = d ? d.x : 0
    const x2 = d ? d.x + d.width : this.world.width
    const izq = desde != null ? desde < 0 : Math.random() < 0.5

    this.active = true
    this.posado = false
    this.x = izq ? x1 - 30 : x2 + 30
    this.facing = izq ? 1 : -1
    this.vx = this.facing * (95 + Math.random() * 60)
    this.y = this.world.floorAt(Math.max(x1, Math.min(x2, this.x))).y - 190 -
             Math.random() * 90
    this.life = 60 + Math.random() * 50
    this.hold = 1.4 + Math.random() * 1.6
  }

  /** Busca donde posarse: una tabla de sus muebles, o el piso. */
  _posarse () {
    const cerca = this.world.surfaces
      .filter((sf) => sf.x1 + 20 < this.x && this.x < sf.x2 - 20)
      .sort((a, b) => a.y - b.y)
    const sf = cerca[0] || this.world.floorAt(this.x)
    this.posado = true
    this.sup = sf
    this.y = sf.y
    this.vx = 0
    this.hold = 5 + Math.random() * 9
    this.tarea = 0
  }

  /**
   * Lo que hace mientras esta posado: pega saltitos, picotea, se queda quieto
   * mirando. Es lo que lo hace parecer un pajaro y no un adorno.
   */
  _vivir (dt) {
    this.tarea -= dt
    if (this.tarea > 0) {
      if (this.saltando) {
        // Un saltito corto, con su arco.
        this.saltoT += dt
        const k = Math.min(1, this.saltoT / 0.28)
        this.x = this.saltoX + (this.saltoDest - this.saltoX) * k
        this.y = this.sup.y - Math.sin(k * Math.PI) * 7
        if (k >= 1) { this.saltando = false; this.y = this.sup.y }
      }
      return
    }

    // Elige que hacer ahora.
    const r = Math.random()
    if (r < 0.5 && this.sup) {
      // Saltito para un costado, sin salirse de la tabla.
      const dir = Math.random() < 0.5 ? -1 : 1
      const dest = this.x + dir * (12 + Math.random() * 16)
      if (dest > this.sup.x1 + 14 && dest < this.sup.x2 - 14) {
        this.saltando = true
        this.saltoT = 0
        this.saltoX = this.x
        this.saltoDest = dest
        this.facing = dir
        this.tarea = 0.3
        return
      }
    }
    if (r < 0.8) {
      this.tarea = 0.8 + Math.random() * 1.4    // picotea
    } else {
      this.facing *= -1                          // se da vuelta a mirar
      this.tarea = 0.6 + Math.random()
    }
  }

  _volar () {
    this.posado = false
    this.vx = this.facing * (110 + Math.random() * 70)
    this.hold = 3 + Math.random() * 4
  }

  /** Se espanta y sale disparado hacia arriba. */
  espantar (desdeX) {
    if (!this.active) return
    this.facing = desdeX > this.x ? -1 : 1
    this.posado = false
    this.vx = this.facing * 260
    this.hold = 5
    this.life = Math.min(this.life, 6)
  }

  update (dt, catX, catVel) {
    if (!this.active) return
    this.phase += dt
    this.life -= dt
    this.hold -= dt

    // Cuanto la deja acercarse depende de como venga. Si viene a la carrera
    // levanta vuelo de lejos; si viene agazapada y despacio lo deja acercarse
    // mucho mas — y ahi esta el juego.
    if (catX != null && this.posado) {
      const cerca = Math.abs(catX - this.x)
      const limite = catVel != null && Math.abs(catVel) > 55 ? 165 : 74
      if (cerca < limite) this.espantar(catX)
    }

    if (this.hold <= 0) {
      if (this.posado) this._volar()
      else if (Math.random() < 0.85 && this.life > 12) this._posarse()
      else this.hold = 1.5 + Math.random() * 2
    }

    if (this.posado) {
      this._vivir(dt)
    } else {
      this.x += this.vx * dt
      this.y -= Math.sin(this.phase * 5) * 22 * dt   // el vuelo va a los saltitos
      if (this.vx !== 0) this.facing = Math.sign(this.vx)
    }

    const d = this.world.displayAt ? this.world.displayAt(this.x) : null
    const fuera = d ? (this.x < d.x - 60 || this.x > d.x + d.width + 60)
                    : (this.x < -60 || this.x > this.world.width + 60)
    if (this.life <= 0 || fuera) this.active = false
  }
}
