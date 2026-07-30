'use strict'

/**
 * El ritmo de un gato de verdad.
 *
 * Los gatos son crepusculares: se encienden al amanecer y al atardecer, y el
 * resto del dia lo pasan durmiendo — entre 13 y 16 horas. Esto no son eventos
 * sueltos sino una curva de actividad por hora, que empuja lo que ella tiende
 * a hacer en cada momento sin decidirlo por ella.
 *
 * 0 = dormida como un tronco. 1 = la hora loca.
 */
const CURVE = [
  0.18, 0.12, 0.10, 0.14, 0.40, 0.80,   // 00-05  la madrugada, y arranca al alba
  0.95, 0.85, 0.70, 0.45, 0.28, 0.22,   // 06-11  despierta, desayuna, se afloja
  0.18, 0.32, 0.22, 0.18, 0.30, 0.60,   // 12-17  la siesta larga de la tarde
  0.90, 0.95, 0.75, 0.62, 0.80, 0.45    // 18-23  el pico del atardecer y la ronda
]

/** Las horas en que un gato se vuelve loco y sale disparado sin motivo. */
const ZOOMIE_HOURS = [5, 22]

export class Routine {
  constructor (config = {}) {
    this.curve = Array.isArray(config.activityCurve) && config.activityCurve.length === 24
      ? config.activityCurve
      : CURVE
    this.zoomieHours = config.zoomieHours || ZOOMIE_HOURS
    this.firedZoomies = new Map()
  }

  /** Cuan activa esta ahora, interpolando entre hora y hora. */
  activity (now = new Date()) {
    const h = now.getHours()
    const k = now.getMinutes() / 60
    const a = this.curve[h]
    const b = this.curve[(h + 1) % 24]
    return a + (b - a) * k
  }

  /** Si le toca un ataque de locura ahora mismo. Una vez por hora marcada. */
  zoomiesDue (now = new Date()) {
    const h = now.getHours()
    if (!this.zoomieHours.includes(h)) return false
    // Dentro de la hora cae en un minuto al azar, para que no sea siempre igual.
    const key = `${now.toISOString().slice(0, 10)}:${h}`
    if (this.firedZoomies.has(key)) return false
    if (now.getMinutes() < 5) return false
    this.firedZoomies.set(key, true)
    return true
  }

  /** Franja del dia, para elegir que te dice. */
  timeOfDay (now = new Date()) {
    const h = now.getHours()
    if (h >= 6 && h < 12) return 'morning'
    if (h >= 12 && h < 18) return 'afternoon'
    if (h >= 18 && h < 23) return 'night'
    return 'lateNight'
  }
}
