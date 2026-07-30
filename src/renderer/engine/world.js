'use strict'

/**
 * El mundo son superficies horizontales sobre las que la gata puede pararse:
 * el piso y el borde superior de cada ventana abierta.
 *
 * El escritorio puede tener varios monitores, asi que el piso no es uno solo:
 * hay un tramo por pantalla, al pie de cada una. Los tramos que se tocan y
 * estan a la misma altura se fusionan en uno, asi la gata cruza de un monitor
 * al otro caminando, sin enterarse del borde.
 *
 * Todas las coordenadas son locales a la ventana, que cubre la union de todas
 * las pantallas. El origen lo resta el renderer antes de llegar aca.
 */
export class World {
  constructor (width, height, displays) {
    this.width = width
    this.height = height
    this.floorMargin = 2      // cuanto sobra del sprite por debajo de sus patas
    this.ledges = []
    this.displays = displays && displays.length
      ? displays
      : [{ x: 0, y: 0, width, height, primary: true }]
    this.resize(width, height)
  }

  resize (width, height, displays) {
    this.width = width
    this.height = height
    if (displays && displays.length) this.displays = displays
    this._rebuildFloors()
  }

  /** El sprite tiene pixeles por debajo de la linea de patas: no los cortemos. */
  setFloorMargin (m) {
    this.floorMargin = Math.max(2, m)
    this._rebuildFloors()
  }

  /**
   * Un tramo de piso por monitor, al pie de cada uno. Después se fusionan los
   * que son contiguos y estan a la misma altura: con los monitores alineados
   * en fila queda un unico piso de punta a punta del escritorio.
   *
   * Si dos monitores estan a alturas distintas quedan tramos separados, y ella
   * se da vuelta en el borde en vez de caminar sobre el vacio.
   */
  _rebuildFloors () {
    const segments = this.displays
      .map((d) => ({
        x1: d.x,
        x2: d.x + d.width,
        // Al pie de la zona util: encima de la barra de tareas, no debajo.
        y: (d.floorY != null ? d.floorY : d.y + d.height) - this.floorMargin
      }))
      .sort((a, b) => a.x1 - b.x1)

    const merged = []
    for (const s of segments) {
      const prev = merged[merged.length - 1]
      // Contiguos (o casi) y a la misma altura: es el mismo piso.
      if (prev && Math.abs(prev.y - s.y) <= 2 && s.x1 - prev.x2 <= 2) {
        prev.x2 = Math.max(prev.x2, s.x2)
      } else {
        merged.push({ ...s })
      }
    }

    this.floors = merged.map((s, i) => ({
      ...s, id: `floor${i}`, isFloor: true, title: 'piso'
    }))
  }

  /** El piso mas ancho. Sirve de referencia cuando no importa el lugar. */
  get floor () {
    return this.floors.reduce((a, b) => (b.x2 - b.x1 > a.x2 - a.x1 ? b : a), this.floors[0])
  }

  /**
   * El piso que hay bajo x. Si x cae en un hueco entre monitores devuelve el
   * mas cercano, para que nunca falte suelo donde aterrizar.
   */
  floorAt (x) {
    for (const f of this.floors) {
      if (x >= f.x1 && x <= f.x2) return f
    }
    let best = this.floors[0]
    let bestDist = Infinity
    for (const f of this.floors) {
      const d = x < f.x1 ? f.x1 - x : x - f.x2
      if (d < bestDist) { bestDist = d; best = f }
    }
    return best
  }

  /** El monitor que contiene x (o el mas cercano). */
  displayAt (x) {
    for (const d of this.displays) {
      if (x >= d.x && x <= d.x + d.width) return d
    }
    return this.displays[0]
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
      const d = this.displayAt(r.x + r.w / 2)
      // Fuera de la zona util de SU monitor, no de la del escritorio entero.
      if (y < d.y + 24 || y > d.y + d.height - 40) return
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
    return [...this.floors, ...this.ledges]
  }

  surfaceAt (id) {
    return this.surfaces.find((s) => s.id === id) || null
  }

  /** Superficie mas alta que esta por debajo de (x, y). Siempre existe: el piso. */
  landingBelow (x, y) {
    let best = this.floorAt(x)
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
