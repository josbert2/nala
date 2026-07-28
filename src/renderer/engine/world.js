'use strict'

/**
 * El mundo son superficies horizontales sobre las que la gata puede pararse:
 * el piso (borde inferior de la pantalla) y el borde superior de cada ventana
 * abierta.
 */
export class World {
  constructor (width, height) {
    this.width = width
    this.height = height
    this.floor = { x1: 0, x2: width, y: height - 2, id: 'floor', title: 'piso' }
    this.ledges = []
  }

  resize (width, height) {
    this.width = width
    this.height = height
    this.floor = { x1: 0, x2: width, y: height - 2, id: 'floor', title: 'piso' }
  }

  /**
   * Convierte rects de ventanas en repisas. Descarta las que quedan tapadas
   * por otra ventana mas adelante en la lista, para que la gata no camine
   * sobre un borde invisible.
   */
  setWindows (rects) {
    const ledges = []
    rects.forEach((r, i) => {
      const y = r.y
      if (y < 24 || y > this.height - 40) return       // fuera de pantalla util
      const x1 = Math.max(0, r.x)
      const x2 = Math.min(this.width, r.x + r.w)
      if (x2 - x1 < 90) return

      // Recortar los tramos cubiertos por ventanas que estan por encima.
      let segments = [[x1, x2]]
      for (let j = 0; j < i; j++) {
        const o = rects[j]
        if (o.y > y || o.y + o.h < y) continue          // no cruza esta altura
        const ox1 = o.x
        const ox2 = o.x + o.w
        segments = segments.flatMap(([a, b]) => {
          if (ox2 <= a || ox1 >= b) return [[a, b]]
          const out = []
          if (ox1 > a) out.push([a, Math.min(ox1, b)])
          if (ox2 < b) out.push([Math.max(ox2, a), b])
          return out
        })
      }

      for (const [a, b] of segments) {
        if (b - a >= 90) {
          ledges.push({ x1: a, x2: b, y, id: `w${i}`, title: r.title })
        }
      }
    })
    this.ledges = ledges
  }

  get surfaces () {
    return [this.floor, ...this.ledges]
  }

  surfaceAt (id) {
    return this.surfaces.find((s) => s.id === id) || null
  }

  /** Superficie mas alta que esta por debajo de (x, y). Siempre existe: el piso. */
  landingBelow (x, y) {
    let best = this.floor
    for (const s of this.ledges) {
      if (x < s.x1 + 4 || x > s.x2 - 4) continue
      if (s.y < y + 2) continue                          // esta arriba, no sirve
      if (s.y < best.y) best = s
    }
    return best
  }

  /** Repisa alcanzable de un salto desde (x, y). */
  reachableLedge (x, y, maxRise = 190, maxReach = 130) {
    const candidates = this.ledges.filter((s) => {
      const dy = y - s.y
      if (dy < 30 || dy > maxRise) return false
      const dx = x < s.x1 ? s.x1 - x : x > s.x2 ? x - s.x2 : 0
      return dx <= maxReach
    })
    if (!candidates.length) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }
}
