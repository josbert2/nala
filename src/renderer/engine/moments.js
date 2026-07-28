'use strict'

/**
 * "Momentos suyos": cosas que hacia a cierta hora del dia.
 * Cada momento se dispara una sola vez por dia.
 */
export class Moments {
  constructor (moments = []) {
    this.moments = moments.map((m, i) => ({ ...m, key: `${i}:${m.at}` }))
    this.firedToday = new Map()   // key -> YYYY-MM-DD
  }

  static minutes (hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number)
    return h * 60 + (m || 0)
  }

  /** Devuelve el momento que corresponde disparar ahora, o null. */
  due (now = new Date()) {
    const today = now.toISOString().slice(0, 10)
    const mins = now.getHours() * 60 + now.getMinutes()

    for (const m of this.moments) {
      if (this.firedToday.get(m.key) === today) continue
      const at = Moments.minutes(m.at)
      // Ventana de 4 minutos: si la maquina estaba apagada, no se dispara tarde.
      if (mins < at || mins > at + 4) continue
      this.firedToday.set(m.key, today)
      return m
    }
    return null
  }
}

/** Lista simple de horarios ("08:00"), cada uno dispara una vez por dia. */
export class Schedule {
  constructor (times = []) {
    this.inner = new Moments(times.map((at) => ({ at })))
  }

  due (now) {
    return this.inner.due(now) !== null
  }
}

/** Notas sueltas que aparecen de a ratos, sin horario. */
export class Notes {
  constructor (notes = [], everyMs = 25 * 60 * 1000) {
    this.notes = notes
    this.everyMs = everyMs
    this.next = performance.now() + everyMs * (0.5 + Math.random())
    this.pool = []
  }

  due () {
    if (!this.notes.length) return null
    if (performance.now() < this.next) return null
    this.next = performance.now() + this.everyMs * (0.6 + Math.random() * 0.8)
    if (!this.pool.length) this.pool = shuffle([...this.notes])
    return this.pool.pop()
  }
}

function shuffle (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
