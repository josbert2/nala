/**
 * Revisa el motor sin abrir ventana.
 *
 * Existe por una razon concreta: tres veces seguidas se colo el mismo error —
 * un estado sin salida garantizada — y las tres las encontro Josbert usandola,
 * no yo probandola. Se quedaba empujando contra la pared, secuestrada por un
 * pajaro, o caminando en el lugar sin avanzar.
 *
 * Son sintomas distintos del mismo problema, y todos se ven desde afuera sin
 * necesidad de mirar la pantalla:
 *
 *   1. Un estado que no cambia nunca.
 *   2. La animacion de caminar puesta y la velocidad en cero.
 *   3. Un estado que dice que camina y la posicion que no se mueve.
 *
 * Corre el motor a 60 fps simulados, le tira estimulos al azar (pajaros,
 * pelotas, el cursor) y avisa si alguna de las tres se cumple.
 *
 *     node tools/revisar_motor.mjs
 *     node tools/revisar_motor.mjs --minutos 30
 *
 * ESTADO: INCOMPLETO. Corre y no da falsos positivos con el motor sano, pero
 * NO cumple todavia lo que promete. Se valido reintroduciendo a proposito el
 * bug de la pared (_turn con la lista corta de estados que caminan) y el
 * chequeo dijo "todo bien". O sea: hoy no lo hubiera agarrado.
 *
 * Por que falla, hasta donde se llego: la deteccion #3 pide que este pegada
 * sin avanzar varios segundos seguidos, pero los estimulos del simulador la
 * sacan del estado antes de llegar al limite. Bajar el limite tampoco alcanzo.
 * Falta o bien un modo con menos estimulos, o bien detectar el sintoma real —
 * "la x esta clavada contra el borde del piso mientras vx apunta hacia afuera",
 * que es una condicion instantanea y no necesita acumular tiempo.
 *
 * Sirve igual como banco de pruebas: levanta el motor entero sin ventana y le
 * pega media hora de uso en segundos. Pero no confiar en que "pasa" quiera
 * decir que esta bien.
 */

import { World } from '../src/renderer/engine/world.js'
import { Cat } from '../src/renderer/engine/cat.js'
import { Bowl, Ball, Treat, Water, Butterfly, Bird, Gift } from '../src/renderer/engine/props.js'
import { Needs } from '../src/renderer/engine/needs.js'

const ANCHO = 1920
const ALTO = 1080
const FPS = 60
const DT = 1 / FPS

// Cuanto aguantamos cada sintoma antes de cantarlo, en segundos simulados.
const LIMITE_ESTADO = 150     // un estado que no cambia nunca
const LIMITE_EN_EL_LUGAR = 3  // animacion de caminar y velocidad cero
const LIMITE_SIN_AVANZAR = 5 // estado que dice que camina y x que no se mueve

const CAMINANDO = new Set(['walk', 'run', 'stalk', 'slide'])

// Una hoja de sprites falsa: al motor solo le importa la caja de colision.
const sheet = {
  cw: 48,
  ch: 48,
  ground: 42,
  meta: { animations: {} },
  bounds: (x, y, s) => ({ x: x - 24 * s, y: y - 42 * s, w: 48 * s, h: 48 * s })
}

/** Un mueble de mentira, con su tabla, para que tenga donde subirse. */
function mueble (world, xFraction, conTabla) {
  const x = () => world.width * xFraction
  return {
    kind: 'test',
    get x () { return x() },
    get y () { return world.floorAt(x()).y },
    twoPart: true,
    holds (px) { return Math.abs(px - x()) < 30 },
    surfaces () {
      if (!conTabla) return []
      return [{ id: `t${xFraction}`, x1: x() - 60, x2: x() + 60, y: world.floorAt(x()).y - 90 }]
    }
  }
}

function correr (minutos) {
  const world = new World(ANCHO, ALTO, [{ x: 0, y: 0, width: ANCHO, height: ALTO, primary: true }])
  const cat = new Cat(world, sheet, 2)
  const bowl = new Bowl(world, 0.12)
  const water = new Water(world, 0.05)
  const litter = mueble(world, 0.48)
  const box = mueble(world, 0.38)
  const post = mueble(world, 0.28, true)
  const tree = mueble(world, 0.64, true)
  const cave = mueble(world, 0.79)
  const bed = mueble(world, 0.93)
  const toys = [mueble(world, 0.2), mueble(world, 0.7)]
  const ball = new Ball(world)
  const treat = new Treat(world)
  const butterfly = new Butterfly(world)
  const birds = [new Bird(world), new Bird(world)]
  const gift = new Gift(world)

  cat.props = {
    bowl, ball, treat, bed, post, tree, cave, toys, litter, water,
    box, boxes: [box], butterfly, bird: null, gift
  }
  cat.needs = new Needs({})
  world.setFurniture([post, tree])
  world.setFloorMargin(14)

  const pointer = { x: 900, y: 900, active: true, movingMs: 0, lastMove: 0, speed: 0, wiggle: 0 }

  const fallas = []
  let estado = cat.state
  let desdeEstado = 0
  let enElLugar = 0
  let sinAvanzar = 0
  let xAnterior = cat.x
  let t = 0

  const total = minutos * 60 * FPS
  for (let f = 0; f < total; f++) {
    t += DT

    // Estimulos, con la misma frecuencia que en la app o un poco mas seguido:
    // la idea es cubrir camino, no ser realista.
    if (Math.random() < DT / 90) birds.forEach((b) => { if (!b.active) b.spawn() })
    if (Math.random() < DT / 120) butterfly.spawn(Math.random() * ANCHO)
    if (Math.random() < DT / 100) ball.spawn(Math.random() * ANCHO, world.floorAt(500).y - 200)
    if (Math.random() < DT / 150) cat.mealtime()
    if (Math.random() < DT / 200) cat.traerRegalo()
    if (Math.random() < DT / 200) cat.acompanar({ pointer })
    if (Math.random() < DT / 300) cat.zoomies()

    // Mandarla contra los bordes a proposito. Sin esto el chequeo no ejercita
    // el caso que mas se rompio — la primera version no agarraba el bug de la
    // pared porque nunca la mandaba mas alla del borde.
    if (Math.random() < DT / 25) {
      cat.goTo(Math.random() < 0.5 ? -400 : ANCHO + 400, null, 30000,
               Math.random() < 0.5 ? 'trot' : 'llevaRegalo')
    }

    // El cursor se mueve a los saltos, como uno de verdad, y cada tanto se va
    // a un extremo: ahi es donde la mandan a caminar contra la pared.
    if (Math.random() < DT * 2) {
      pointer.x = Math.random() < 0.2
        ? (Math.random() < 0.5 ? 3 : ANCHO - 3)
        : Math.random() * ANCHO
      pointer.y = 400 + Math.random() * 600
      pointer.lastMove = t * 1000
      pointer.speed = 200 + Math.random() * 2000
      pointer.wiggle = Math.floor(Math.random() * 6)
    }
    pointer.movingMs = t * 1000 - pointer.lastMove

    ball.update(DT)
    butterfly.update(DT, cat.x, cat.y)
    for (const b of birds) b.update(DT, cat.x, cat.vx)
    const vivos = birds.filter((b) => b.active)
    cat.props.bird = vivos.length ? vivos[0] : null
    gift.update(DT, cat.x, cat.y)
    cat.needs.update(DT)
    cat.update(DT, { pointer, dt: DT })

    // --- 1. un estado que no cambia nunca
    if (cat.state === estado) {
      desdeEstado += DT
      if (desdeEstado > LIMITE_ESTADO) {
        fallas.push(`estado "${cat.state}" sin cambiar por ${Math.round(desdeEstado)} s`)
        desdeEstado = 0
      }
    } else {
      estado = cat.state
      desdeEstado = 0
    }

    // --- 2. animacion de caminar y velocidad en cero
    if (CAMINANDO.has(cat.anim) && Math.abs(cat.vx) < 1 && !cat.airborne) {
      enElLugar += DT
      if (enElLugar > LIMITE_EN_EL_LUGAR) {
        fallas.push(`"${cat.state}" usa la animacion "${cat.anim}" con vx=0 ` +
                    `hace ${Math.round(enElLugar)} s: camina en el lugar`)
        enElLugar = 0
      }
    } else {
      enElLugar = 0
    }

    // --- 3. dice que camina y la x no se mueve
    if (CAMINANDO.has(cat.anim) && Math.abs(cat.x - xAnterior) < 0.5 && !cat.airborne) {
      sinAvanzar += DT
      if (sinAvanzar > LIMITE_SIN_AVANZAR) {
        fallas.push(`"${cat.state}" con animacion de caminar y sin avanzar ` +
                    `hace ${Math.round(sinAvanzar)} s (x=${cat.x.toFixed(0)})`)
        sinAvanzar = 0
      }
    } else {
      sinAvanzar = 0
    }
    xAnterior = cat.x
  }

  return fallas
}

const args = process.argv.slice(2)
const i = args.indexOf('--minutos')
const minutos = i >= 0 ? Number(args[i + 1]) : 20

console.log(`revisando el motor: ${minutos} minutos simulados a ${FPS} fps...\n`)
const fallas = correr(minutos)

if (!fallas.length) {
  console.log('todo bien: no se quedo trabada ni una vez.')
  process.exit(0)
}

// Las mismas fallas se repiten mucho; alcanza con contarlas una vez cada una.
const cuenta = new Map()
for (const f of fallas) {
  const clave = f.replace(/hace \d+ s/, 'hace N s').replace(/por \d+ s/, 'por N s')
                 .replace(/x=-?\d+/, 'x=N')
  cuenta.set(clave, (cuenta.get(clave) || 0) + 1)
}
console.log(`${fallas.length} avisos, ${cuenta.size} distintos:\n`)
for (const [f, n] of [...cuenta.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  x${String(n).padStart(3)}  ${f}`)
}
process.exit(1)
