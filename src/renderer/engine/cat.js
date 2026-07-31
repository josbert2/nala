'use strict'

const GRAVITY = 1500        // px/s^2
const WALK_SPEED = 42       // px/s
const TROT_SPEED = 95       // el trote de cuando se va a otro monitor
const RUN_SPEED = 130
const SLIDE_SPEED = 320     // el envion del derrape
const STALK_SPEED = 22      // el acecho: mas rapido y el pajaro se le va
const MAX_FALL = 900
const HUNT_COOLDOWN = 20000  // cuanto espera antes de volver a cazar el cursor

// Estados que son "estar quieta en algun lado" y pueden elegirse al azar.
const RESTING = ['idle', 'sit', 'sleep', 'groom', 'stretch', 'loaf']

export class Cat {
  constructor (world, sheet, scale) {
    this.world = world
    this.sheet = sheet
    this.scale = scale

    // Arranca en el medio de la pantalla principal, no en el medio del
    // escritorio: con varios monitores eso la dejaba naciendo en el del costado.
    const home = world.displays.find((d) => d.primary) || world.displays[0]
    this.x = home.x + home.width * 0.5
    this.y = world.floorAt(this.x).y
    this.vx = 0
    this.vy = 0
    this.facing = 1
    this.surface = world.floorAt(this.x)

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
    this.birdCooldownUntil = 0 // deja de obsesionarse con el mismo pajaro
    this.giftCooldownUntil = 0 // traer un regalo es cada tanto, no seguido
    this.activity = 0.5        // 0 = hora de dormir, 1 = la hora loca
    this.zoomLeft = 0          // vueltas de locura que le quedan
    this.needs = null          // sus necesidades, si estan puestas
    this.asking = null         // 'comida' | 'agua' cuando te esta pidiendo
    this.autoServe = true      // se sirve sola: es independiente
    this.gaze = { x: 0, y: 0 } // donde tiene clavada la mirada, -1..1
    this.tripCooldownUntil = 0 // ni a irse a otro monitor hasta aca
    this.furnitureCooldownUntil = 0  // ni a usar sus muebles hasta aca
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
      case 'trot': return 'run'
      case 'chase':
      case 'chaseBall':
      case 'chaseCursor':
      case 'chaseButterfly': return 'run'
      case 'slide': return 'slide'
      case 'seek': return 'walk'
      case 'eatTreat': return 'eat'
      case 'litter': return 'dig'
      case 'drink': return 'eat'
      case 'goingWater':
      case 'goingEat': return 'walk'
      case 'pedir': return 'alert'
      case 'inBox': return 'alert'
      case 'watchBird': return 'alert'
      case 'stalkBird': return 'stalk'
      case 'startle': return 'startle'
      case 'goingBird': return 'walk'
      case 'tomaRegalo': return 'walk'
      case 'llevaRegalo': return 'walk'
      case 'ofrece': return 'alert'
      case 'dormirConEl': return 'sleep'
      case 'acompana': return 'loaf'
      case 'vaAcompanar': return 'walk'
      case 'goingBox': return 'walk'
      case 'zoom': return 'run'
      case 'meow': return 'alert'
      case 'jump':
      case 'fall': return 'fall'
      case 'purr': return 'idle'
      case 'dragged': return 'fall'
      case 'watch': return 'alert'
      case 'climbTree': return 'alert'
      default: return state
    }
  }

  _defaultHold (state) {
    const r = (a, b) => a + Math.random() * (b - a)
    switch (state) {
      case 'idle': return r(3000, 9000)
      case 'sit': return r(4000, 12000)
      case 'sleep': return r(25000, 90000)
      case 'loaf': return r(9000, 26000)
      case 'groom': return r(4000, 9000)
      case 'stretch': return 1400
      case 'yawn': return 1200
      case 'scratch': return r(3500, 7500)
      case 'litter': return r(4000, 7000)
      case 'drink': return r(4500, 7000)
      case 'goingWater':
      case 'goingEat': return 0
      case 'pedir': return r(5000, 8000)
      // En la caja se queda un rato largo, que es lo que hacen.
      case 'inBox': return r(40000, 120000)
      // Mirando un pajaro se queda pegada un buen rato.
      case 'watchBird': return r(7000, 16000)
      case 'stalkBird': return 12000
      case 'startle': return 1300
      case 'goingBird': return 0
      case 'tomaRegalo': return 0
      case 'llevaRegalo': return 25000
      case 'ofrece': return r(9000, 16000)
      case 'dormirConEl': return 0
      // Acompañando se queda un rato largo: es la idea.
      case 'acompana': return r(45000, 110000)
      case 'vaAcompanar': return 0
      case 'goingBox': return 0
      case 'zoom': return 400
      case 'climbTree': return 3000
      case 'trot': return 45000
      case 'watch': return r(2000, 5000)
      case 'purr': return 5000
      case 'eat': return 30000
      case 'crouch': return r(900, 1900)
      case 'play': return r(2500, 6000)
      case 'chaseBall': return 9000
      case 'chaseCursor': return 7000
      case 'chaseButterfly': return 14000
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

  /**
   * Los estados que solo marcan "ya llegue": resuelven llamando al metodo que
   * corresponda. Si ese metodo se va sin hacer nada — el pajaro desaparecio, el
   * juguete ya no esta — hay que sacarla igual, o se queda caminando en el
   * lugar con la animacion puesta y sin avanzar nunca.
   */
  LLEGADAS = {
    goingWater: (c) => c.goToWater(),
    goingEat: (c) => c.goToEat(),
    goingBox: (c) => c.goToBox(),
    goingBird: (c) => c.watchBird(),
    vaAcompanar: (c, ctx) => c.acompanar(ctx)
  }

  /** Encadenamientos fijos: agazaparse siempre termina en salto. */
  _onHoldEnd (ctx) {
    const llegada = this.LLEGADAS[this.state]
    if (llegada) {
      const antes = this.state
      llegada(this, ctx)
      // Red de seguridad: si el metodo no la movio de estado, la sacamos.
      if (this.state === antes) this.setState('idle', 1200)
      return
    }

    // Se cansa del pajaro. Sin esto lo miraba, terminaba, y _decide la mandaba
    // a mirar el mismo pajaro otra vez: se quedaba tiesa los dos minutos que
    // dura el pajaro.
    if (this.state === 'watchBird' || this.state === 'stalkBird') {
      this.birdCooldownUntil = performance.now() + 60000
    }
    if (this.state === 'crouch') { this._pounceAtBall(); return }
    // Sale del arenero y se limpia. Siempre.
    // Al salir de dormir se despereza y bosteza, como corresponde.
    if (this.state === 'sleep') { this.setState('stretch'); return }
    if (this.state === 'stretch') { this.setState('yawn'); return }
    if (this.state === 'litter') {
      if (this.needs) this.needs.fueAlBano()
      this.setState('groom')
      return
    }
    if (this.state === 'drink') {
      const water = this.props && this.props.water
      if (water && !water.vacio) {
        water.beber()
        if (this.needs) this.needs.tomo(1)
      }
      this.setState('groom', 4000)
      return
    }
    if (this.state === 'pedir') { this.asking = null; this.setState('sit'); return }
    if (this.state === 'zoom') { this._zoomNext(); return }
    // Despues del susto se queda mirando hacia donde paso.
    if (this.state === 'startle') { this.setState('watch', 3500); return }

    // Levanta el juguete y lo lleva hasta donde tenes el cursor.
    if (this.state === 'tomaRegalo') {
      const g = this.props && this.props.gift
      if (g) g.agarrar(this.giftAnim, this.x)
      const p = ctx && ctx.pointer
      const destino = p && p.active ? p.x : this.x + this.facing * 200
      this.goTo(destino, 'ofrece', 25000, 'llevaRegalo')
      return
    }
    if (this.state === 'ofrece') { this.setState('sit'); return }
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
    if (next === 'ofrece') {
      const g = this.props && this.props.gift
      if (g) g.soltar(this.x)
      // Que sea algo que pasa, no algo que hace.
      this.giftCooldownUntil = performance.now() + 12 * 60000 + Math.random() * 480000
    }
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

    // Un pajaro le corta cualquier cosa que este haciendo. No espera a
    // terminar: los gatos dejan lo que sea para mirar un pajaro.
    // Lo unico que no deja por un pajaro: comer, el arenero, y estar ya en eso.
    const NO_CORTAR = ['eat', 'eatTreat', 'drink', 'litter', 'pedir',
                       'watchBird', 'stalkBird', 'goingBird', 'crouch', 'pounce']
    const bird = this.props && this.props.bird
    if (bird && bird.active && this.energy > 0.2 &&
        Math.abs(bird.x - this.x) < 600 &&     // no cruza la pantalla por uno
        Math.random() < ctx.dt * 0.8 &&        // ni le llama la atencion siempre
        performance.now() > this.birdCooldownUntil &&
        this.after !== 'goingBird' &&          // ya va para alla
        !NO_CORTAR.includes(this.state)) {
      this.watchBird()
      return
    }

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
      // Echada no se levanta a mirar: se queda como esta y te sigue con los
      // ojos, que es justo la gracia de esa pose.
      if (RESTING.includes(this.state) && this.state !== 'stretch' &&
          this.state !== 'loaf') {
        this.facing = p.x > cx ? 1 : -1
        this.setState('watch')
      }
    }
  }

  /** Ejecuta el estado actual. */
  _act (dt, ctx) {
    switch (this.state) {
      case 'walkTo':
      case 'llevaRegalo':
      case 'trot': {
        if (!this.target) { this._arrive(); break }
        const dx = this.target.x - this.x
        if (Math.abs(dx) < 5) { this.vx = 0; this._arrive(); break }
        this.facing = Math.sign(dx)
        // El trote es para cruzar de monitor: a paso de gata tardaria minutos.
        this.vx = this.facing * (this.state === 'trot' ? TROT_SPEED : WALK_SPEED)
        break
      }
      case 'loaf': {
        // Echada como un pan, despierta. No se levanta, pero te sigue con la
        // mirada: la unica parte que se mueve es hacia donde mira.
        this.vx = 0
        const p = ctx.pointer
        if (p.active) this.facing = p.x > this.x ? 1 : -1
        break
      }
      case 'scratch': {
        // Clavada al lado del poste, mirandolo. Si la movieron de ahi, deja.
        this.vx = 0
        const post = this.props && this.props.post
        if (!post) { this.setState('idle', 1200); break }
        if (!post.holds(this.x)) { this.setState('idle', 1200); break }
        this.facing = post.x >= this.x ? 1 : -1
        this.energy = Math.max(0, this.energy - dt * 0.012)
        break
      }
      case 'climbTree': {
        // Llego al pie del arbol. De aca sube sola, tabla por tabla.
        this.vx = 0
        const up = this.world.reachableLedge(this.x, this.y)
        if (up) { this._jumpTo(up); break }
        this.setState('sit', 1600)
        break
      }
      case 'eat': {
        this.vx = 0
        const bowl = this.props && this.props.bowl
        if (!bowl || bowl.food <= 0) { this.setState('groom', 5000); break }
        this.facing = bowl.x > this.x ? 1 : -1
        if (bowl.nibble(dt)) {
          this.energy = Math.min(1, this.energy + 0.35)
          if (this.needs) this.needs.comio(1)
          // Terminar de comer casi siempre termina en el arenero.
          if (this.props.litter && Math.random() < 0.75) this.goToLitter()
          else this.setState('groom', 6000)
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
      case 'chaseButterfly': {
        const b = this.props && this.props.butterfly
        if (!b || !b.active) { this.setState('idle', 1200); break }
        const dx = b.x - this.x
        this.facing = Math.sign(dx) || 1
        if (Math.abs(dx) < 48) {
          this.vx = 0
          // Solo salta si la tiene al alcance. Si vuela alto se queda
          // mirandola, con la cola dura, que es lo que hacen.
          if (this.y - b.y < 165) {
            this.pounceTarget = b.x
            this.setState('crouch', 520)
          } else {
            this.setState('watch', 1400)
          }
          break
        }
        this.vx = this.facing * RUN_SPEED
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
      case 'watchBird': {
        // De lejos no lo persigue: lo mira, y castañetea. Pero si el pajaro se
        // posa y ella tiene ganas, se decide y lo empieza a acechar.
        this.vx = 0
        const p = this.props && this.props.bird
        if (!p || !p.active) { this.setState('sit', 2500); break }
        this.facing = p.x > this.x ? 1 : -1
        if (p.posado && this.energy > 0.3 && Math.random() < dt * 0.5) {
          this.setState('stalkBird')
        }
        break
      }
      case 'stalkBird': {
        // Agazapada y muy despacio: es la unica forma de acercarsele. Si va
        // rapido el pajaro levanta vuelo mucho antes.
        const p = this.props && this.props.bird
        if (!p || !p.active || !p.posado) { this.setState('watchBird'); break }
        const dx = p.x - this.x
        this.facing = Math.sign(dx) || 1
        if (Math.abs(dx) < 58) {
          this.vx = 0
          this.pounceTarget = p.x
          this.setState('crouch', 450)     // se junta y salta
          break
        }
        this.vx = this.facing * STALK_SPEED
        break
      }
      case 'acompana': {
        // Echada al lado tuyo mientras trabajas. No hace nada: esta.
        this.vx = 0
        const p = ctx.pointer
        if (p.active) this.facing = p.x > this.x ? 1 : -1
        break
      }
      case 'inBox': {
        this.vx = 0
        const p = ctx.pointer
        if (p.active) this.facing = p.x > this.x ? 1 : -1
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
      if (live.isFloor) { this.x = live.x1 + 6; this._turn() } else this._drop()
    } else if (this.x > live.x2 - 6) {
      if (live.isFloor) { this.x = live.x2 - 6; this._turn() } else this._drop()
    }
  }

  /** Los estados que la desplazan caminando. Chocar contra el borde los corta. */
  static get CAMINANDO () {
    return ['walkTo', 'trot', 'llevaRegalo', 'seek', 'chase', 'chaseBall',
            'chaseCursor', 'chaseButterfly', 'stalkBird', 'zoom']
  }

  _turn () {
    this.facing *= -1
    // Si venia yendo hacia un pajaro y se topo con el borde, se le pasa un
    // rato. Sin esto lo vuelve a intentar al frame siguiente, para siempre.
    if (this.after === 'goingBird' || this.state === 'stalkBird') {
      this.birdCooldownUntil = performance.now() + 20000
    }
    if (this.target) this.target = null
    // Cortar TODOS los estados que caminan, no solo dos. Con la lista corta,
    // los modos nuevos se quedaban empujando contra la pared sin fin.
    if (Cat.CAMINANDO.includes(this.state)) {
      this.after = null
      this.setState('idle', 1400)
    }
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

    // Sus necesidades van primero, y se las resuelve sola. Solo cuando llega
    // al plato y esta vacio te pide algo.
    if (this.needs && this.surface && this.surface.isFloor) {
      switch (this.needs.urgente) {
        case 'bano':
          if (this.props.litter) { this.goToLitter(); return }
          break
        case 'agua':
          if (this.props.water) { this.goToWater(); return }
          break
        case 'comida':
          if (this.props.bowl) { this.goToEat(); return }
          break
        case 'cariño':
          // Que te venga a buscar es cosa suya, no una tarea tuya.
          if (Math.random() < 0.5) { this.setState('seek'); return }
          break
      }
    }

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

    // Un pajaro le gana a todo lo demas, hasta a la mariposa.
    const bird = this.props && this.props.bird
    if (bird && bird.active && this.energy > 0.2 &&
        Math.abs(bird.x - this.x) < 600 &&
        performance.now() > this.birdCooldownUntil &&
        this.state !== 'watchBird' && this.state !== 'goingBird') {
      this.watchBird()
      return
    }

    // Una mariposa dando vueltas no se puede ignorar.
    const bfly = this.props && this.props.butterfly
    if (bfly && bfly.active && this.energy > 0.25 && this.state !== 'chaseButterfly') {
      this.setState('chaseButterfly')
      return
    }

    // La pelota tambien tira, salvo que este muerta de sueño.
    const ball = this.props && this.props.ball
    if (ball && ball.active && this.energy > 0.3) {
      this.setState('chaseBall')
      return
    }

    // Muy cansada, o es una hora en la que un gato simplemente duerme.
    if (this.energy < 0.2) { this.setState('sleep'); return }
    if (this.activity < 0.25 && Math.random() < 0.55) { this.setState('sleep'); return }

    // De vez en cuando se sube a una ventana.
    if (roll < 0.18) {
      const ledge = this.world.reachableLedge(this.x, this.y)
      if (ledge) { this._jumpTo(ledge); return }
    }

    // O baja de donde esta.
    if (this.surface && !this.surface.isFloor && roll > 0.9) { this._drop(); return }

    // Cada tanto usa sus cosas: el rascadero, un juguete, el arbol, o se mete
    // en la cueva si ya esta con sueño. Con su propio cooldown, para que no se
    // pase la vida yendo de un mueble al otro.
    if (this.surface && this.surface.isFloor && roll < 0.34 &&
        performance.now() > this.furnitureCooldownUntil) {
      const p = this.props || {}
      const options = []
      if (p.post) options.push(() => this.goToPost())
      if (p.tree) options.push(() => this.goUpTree())
      if (p.toys && p.toys.length) options.push(() => this.goToToy())
      if (p.cave && this.energy < 0.45) options.push(() => this.goToCave())
      if (p.litter) options.push(() => this.goToLitter())
      // La caja tira mas que el resto: es una caja.
      if (p.box) { options.push(() => this.goToBox()); options.push(() => this.goToBox()) }
      if (p.gift && p.toys && p.toys.length) options.push(() => this.traerRegalo())
      if (options.length) {
        this.furnitureCooldownUntil = performance.now() + 30000
        options[Math.floor(Math.random() * options.length)]()
        return
      }
    }

    // Cada tanto se manda a otro monitor. Va al trote y de una: a paso de gata
    // cruzar el escritorio entero le llevaria minutos.
    if (this.energy > 0.45 && performance.now() > this.tripCooldownUntil &&
        Math.random() < 0.10) {
      const there = this._otherScreenTarget()
      if (there != null) {
        this.tripCooldownUntil = performance.now() + 45000
        this.goTo(there, null, 45000, 'trot')
        return
      }
    }

    if (roll < 0.42) {
      const s = this.surface || this.world.floorAt(this.x)
      const min = s.x1 + 20
      const max = s.x2 - 20
      this.target = { x: min + Math.random() * Math.max(1, max - min) }
      this.setState('walkTo', 12000)
      return
    }

    const pool = (this.energy < 0.45 || this.activity < 0.4)
      ? ['sleep', 'sleep', 'loaf', 'idle', 'groom']
      : ['idle', 'sit', 'loaf', 'groom', 'stretch', 'idle']
    this.setState(pool[Math.floor(Math.random() * pool.length)])
  }

  /**
   * Un punto al azar en otro monitor. Solo sirven los que comparten el tramo
   * de piso con ella: si el piso esta cortado no hay como cruzar caminando.
   */
  _otherScreenTarget () {
    const w = this.world
    if (!w.displays || w.displays.length < 2) return null

    const here = w.displayAt(this.x)
    const floor = this.surface && this.surface.isFloor
      ? this.surface
      : w.floorAt(this.x)

    const options = w.displays.filter((d) => {
      if (d === here) return false
      const cx = d.x + d.width / 2
      return cx >= floor.x1 && cx <= floor.x2
    })
    if (!options.length) return null

    const d = options[Math.floor(Math.random() * options.length)]
    return d.x + 60 + Math.random() * Math.max(1, d.width - 120)
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

  /** Camina hasta x y ahi hace `then`. Con `mode` 'trot' va al trote. */
  goTo (x, then, hold, mode) {
    this.target = { x: Math.max(20, Math.min(this.world.width - 20, x)) }
    this.after = then || null
    this.setState(mode || 'walkTo', hold || 25000)
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

  /**
   * Algo aparecio en la pantalla y la agarro desprevenida. Se sobresalta y
   * despues se queda mirando para ese lado.
   */
  sobresalto (x) {
    if (this.airborne || this.state === 'startle') return
    if (x != null) this.facing = x > this.x ? 1 : -1
    this.energy = Math.max(this.energy, 0.5)
    this.setState('startle')
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
    ball.spawn(x, this.world.floorAt(x).y - 160)
    this.energy = Math.max(this.energy, 0.6)
    this.setState('watch', 1200)
  }

  pet () {
    if (this.needs) this.needs.mimada()
    this.setState('purr')
    this.energy = Math.min(1, this.energy + 0.15)
  }

  napNow () {
    this.setState('sleep')
    this.energy = Math.min(this.energy, 0.3)
  }

  /** A su cama. Va al trote hasta ahi y se duerme adentro. */
  /** Cada tanto se lleva un juguete a la cama y lo deja al lado suyo. */
  _llevarseAlgoALaCama () {
    const p = this.props || {}
    if (!p.gift || !p.toys || !p.toys.length) return false
    if (p.gift.active) return false
    if (Math.random() > 0.35) return false
    const j = p.toys[Math.floor(Math.random() * p.toys.length)]
    this.giftAnim = j.kind
    p.gift.agarrar(j.kind, this.x)
    return true
  }

  goToBed () {
    const bed = this.props && this.props.bed
    if (!bed) return
    this.energy = Math.min(this.energy, 0.4)
    // Si ya esta adentro no la hacemos caminar al lugar donde ya esta.
    if (bed.holds(this.x) && this.surface && this.surface.isFloor) {
      this.napNow()
      return
    }
    // Cada tanto se lleva un juguete y se duerme con el al lado.
    this._llevarseAlgoALaCama()
    this.goTo(bed.x, 'dormirConEl', 60000, 'trot')
  }

  /** A rascar el poste. Se para al lado y se despereza contra el. */
  goToPost () {
    const post = this.props && this.props.post
    if (!post) return
    this.energy = Math.max(this.energy, 0.5)
    if (post.holds(this.x) && this.surface && this.surface.isFloor) {
      this.facing = post.x >= this.x ? 1 : -1
      this.setState('scratch')
      return
    }
    this.goTo(post.x, 'scratch')
  }

  /**
   * La hora loca: sale disparada de una punta a la otra unas cuantas veces,
   * sin motivo, como hacen a las cinco de la mañana.
   */
  zoomies (times = 4) {
    if (this.airborne) return
    this.energy = Math.max(this.energy, 0.8)
    this.zoomLeft = times
    this._zoomNext()
  }

  _zoomNext () {
    if (this.zoomLeft-- <= 0) { this.setState('sit', 2000); return }
    const s = this.surface || this.world.floorAt(this.x)
    const mid = (s.x1 + s.x2) / 2
    const tx = this.x < mid ? s.x2 - 30 : s.x1 + 30
    this.goTo(tx, 'zoom', 9000, 'trot')
  }

  /**
   * A su caja. Se mete adentro y se queda ahi mirando, que es lo que hace
   * cualquier gato con cualquier caja. No duerme: mira.
   */
  goToBox () {
    const p = this.props || {}
    // Si el habitat trae mas de un lugar donde meterse (la caja, el pelotero),
    // elige uno. Si ya esta metida en alguno, ese.
    const lugares = (p.boxes && p.boxes.length) ? p.boxes : (p.box ? [p.box] : [])
    const box = lugares.find((b) => b.holds(this.x)) ||
                lugares[Math.floor(Math.random() * lugares.length)]
    if (!box) return
    this.props.box = box
    if (box.holds(this.x) && this.surface && this.surface.isFloor) {
      this.x = box.x
      this.vx = 0
      this.setState('inBox')
      return
    }
    this.goTo(box.x, 'goingBox', 40000, 'trot')
  }

  /**
   * Se queda mirando al pajaro. Si esta lejos camina hasta quedar debajo, y
   * ahi se sienta. Nunca lo alcanza.
   */
  watchBird () {
    const b = this.props && this.props.bird
    if (!b || !b.active) return
    if (Math.abs(b.x - this.x) < 130 || !this.surface || !this.surface.isFloor) {
      this.facing = b.x > this.x ? 1 : -1
      this.setState('watchBird')
      return
    }
    this.goTo(b.x, 'goingBird', 20000)
  }

  /** A tomar agua. Si el bebedero esta vacio, se sienta al lado y te lo pide. */
  goToWater () {
    const water = this.props && this.props.water
    if (!water) return
    if (Math.abs(this.x - water.x) < 26 && this.surface && this.surface.isFloor) {
      this.facing = water.x >= this.x ? 1 : -1
      if (water.vacio) {
        // No lo puede resolver sola: esto si te lo tiene que pedir.
        this.asking = 'agua'
        this.setState('pedir')
      } else {
        this.setState('drink')
      }
      return
    }
    this.goTo(water.x, 'goingWater', 40000, 'trot')
  }

  /**
   * A comer porque tiene hambre, no porque le sirvieron. Se sirve sola: tiene
   * su comedero. Cada tanto lo encuentra vacio y ahi te lo pide.
   */
  goToEat () {
    const bowl = this.props && this.props.bowl
    if (!bowl) return
    if (Math.abs(this.x - bowl.x) < 26 && this.surface && this.surface.isFloor) {
      this.facing = bowl.x >= this.x ? 1 : -1
      if (bowl.food <= 0) {
        if (this.autoServe && Math.random() > 0.25) {
          bowl.serve()
          this.setState('eat')
        } else {
          this.asking = 'comida'
          this.setState('pedir')
        }
      } else {
        this.setState('eat')
      }
      return
    }
    this.goTo(bowl.x, 'goingEat', 40000, 'trot')
  }

  /**
   * Te trae un regalo. Agarra uno de sus juguetes, te lo lleva hasta el cursor,
   * lo deja y se queda esperando que lo veas.
   */
  /**
   * Se viene a acompañar. Camina hasta cerca de donde estas trabajando y se
   * echa ahi al lado, sin pedir nada.
   */
  acompanar (ctx) {
    const p = ctx && ctx.pointer
    if (!p || !p.active) { this.setState('idle', 2000); return }
    if (Math.abs(p.x - this.x) < 190 && this.surface && this.surface.isFloor) {
      this.facing = p.x > this.x ? 1 : -1
      this.setState('acompana')
      return
    }
    this.goTo(p.x + (p.x > this.x ? -120 : 120), 'vaAcompanar', 25000, 'trot')
  }

  traerRegalo () {
    const p = this.props || {}
    if (!p.gift || !p.toys || !p.toys.length) return
    if (performance.now() < this.giftCooldownUntil) return
    const juguete = p.toys[Math.floor(Math.random() * p.toys.length)]
    this.giftAnim = juguete.kind
    this.energy = Math.max(this.energy, 0.5)
    if (Math.abs(juguete.x - this.x) < 30 && this.surface && this.surface.isFloor) {
      this.setState('tomaRegalo', 0)
      return
    }
    this.goTo(juguete.x, 'tomaRegalo', 30000, 'trot')
  }

  /** Al arenero. Escarba, hace lo suyo, tapa, y despues se limpia. */
  goToLitter () {
    const litter = this.props && this.props.litter
    if (!litter) return
    this.energy = Math.max(this.energy, 0.4)
    if (litter.holds(this.x) && this.surface && this.surface.isFloor) {
      this.setState('litter')
      return
    }
    this.goTo(litter.x, 'litter', 40000, 'trot')
  }

  /** A su cueva, a dormir metida adentro. */
  goToCave () {
    const cave = this.props && this.props.cave
    if (!cave) return
    this.energy = Math.min(this.energy, 0.4)
    if (cave.holds(this.x) && this.surface && this.surface.isFloor) {
      this.napNow()
      return
    }
    this.goTo(cave.x, 'sleep', 60000, 'trot')
  }

  /**
   * A lo alto del arbol. Camina hasta el pie y de ahi salta sola, tabla por
   * tabla: cada una esta al alcance de un salto desde la de abajo.
   */
  goUpTree () {
    const tree = this.props && this.props.tree
    if (!tree) return
    this.energy = Math.max(this.energy, 0.55)
    const up = this.world.reachableLedge(this.x, this.y)
    if (up) { this._jumpTo(up); return }
    this.goTo(tree.x, 'climbTree', 30000, 'trot')
  }

  /** A jugar con uno de sus juguetes: va y lo manotea. */
  goToToy (toy) {
    const toys = (this.props && this.props.toys) || []
    const t = toy || toys[Math.floor(Math.random() * toys.length)]
    if (!t) return
    this.energy = Math.max(this.energy, 0.5)
    if (t.holds(this.x)) {
      this.facing = t.x >= this.x ? 1 : -1
      this.setState('play')
      return
    }
    this.goTo(t.x, 'play')
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
    this.sheet.draw(ctx, this.anim, this.elapsed, this.x, this.y, this.scale,
                    this.facing < 0, this.gaze)
  }
}
