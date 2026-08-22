'use strict'

/**
 * Sus necesidades.
 *
 * Bajan solas con el tiempo, pero ella NO depende de vos para taparlas: tiene
 * su comedero y su bebedero y va sola, como cualquier gato que se respete.
 * Solo te pide cuando de verdad no puede resolverlo — cuando llega al plato y
 * está vacío. Ese es el único momento en que hace falta que hagas algo.
 *
 * Todas van de 0 a 1, donde 1 es "cubierta". La excepción es `bano`, que va al
 * revés: sube hasta que tiene que ir.
 */

// Horas que tarda cada una en ir de llena a vacía si nadie hace nada.
// Aceleradas para que su conducta se NOTE en una sesión: va sola a comer,
// tomar agua, al arenero y a buscarte cada tanto. Ajustable con needHours.
const HOURS = {
  comida: 1,
  agua: 0.8,
  cariño: 0.9
}

// Debajo de esto se pone en movimiento sola. Un poco más alto = reacciona antes.
const LOW = {
  comida: 0.4,
  agua: 0.42,
  cariño: 0.35
}

const BANO_URGENTE = 0.7
const BANO_HORAS = 1.2   // cuánto tarda en necesitar el arenero

export class Needs {
  constructor (config = {}) {
    const h = { ...HOURS, ...(config.needHours || {}) }
    this.rate = {
      comida: 1 / (h.comida * 3600),
      agua: 1 / (h.agua * 3600),
      cariño: 1 / (h.cariño * 3600)
    }
    this.low = { ...LOW, ...(config.needLow || {}) }

    // Empieza razonablemente bien, no recién levantada ni muerta de hambre.
    this.comida = 0.75
    this.agua = 0.7
    this.cariño = 0.6
    this.bano = 0.15
  }

  /** Como esta, para guardarlo. */
  snapshotRaw () {
    return { comida: this.comida, agua: this.agua, cariño: this.cariño, bano: this.bano }
  }

  /**
   * Vuelve a como estaba, y le corre el tiempo que la app estuvo cerrada.
   * El tiempo cerrado se topea: si estuvo apagada tres dias no tiene sentido
   * que vuelva muerta de hambre — se sirve sola, ya hubiera comido.
   */
  restore (guardado, segundosCerrada = 0) {
    if (!guardado) return
    for (const k of ['comida', 'agua', 'cariño', 'bano']) {
      if (typeof guardado[k] === 'number') this[k] = clamp01(guardado[k])
    }
    this.update(Math.min(segundosCerrada, 4 * 3600))
  }

  update (dt) {
    this.comida = clamp01(this.comida - this.rate.comida * dt)
    this.agua = clamp01(this.agua - this.rate.agua * dt)
    this.cariño = clamp01(this.cariño - this.rate.cariño * dt)
    // El baño sube solo, despacio. Comer y tomar agua lo empujan aparte.
    this.bano = clamp01(this.bano + dt / (BANO_HORAS * 3600))
  }

  // ------------------------------------------------------------- satisfacer

  comio (cuanto = 1) {
    this.comida = clamp01(this.comida + cuanto)
    this.bano = clamp01(this.bano + 0.35 * cuanto)
  }

  tomo (cuanto = 1) {
    this.agua = clamp01(this.agua + cuanto)
    this.bano = clamp01(this.bano + 0.25 * cuanto)
  }

  fueAlBano () {
    this.bano = 0
  }

  mimada (cuanto = 0.35) {
    this.cariño = clamp01(this.cariño + cuanto)
  }

  // ---------------------------------------------------------------- consultar

  get tieneHambre () { return this.comida < this.low.comida }
  get tieneSed () { return this.agua < this.low.agua }
  get faltaCariño () { return this.cariño < this.low.cariño }
  get necesitaBano () { return this.bano > BANO_URGENTE }

  /** La más urgente de todas, o null si está todo bien. */
  get urgente () {
    if (this.necesitaBano) return 'bano'
    // El agua aprieta antes que la comida: un gato aguanta más sin comer.
    if (this.agua < this.low.agua * 0.6) return 'agua'
    if (this.comida < this.low.comida * 0.6) return 'comida'
    if (this.tieneSed) return 'agua'
    if (this.tieneHambre) return 'comida'
    if (this.faltaCariño) return 'cariño'
    return null
  }

  /**
   * Cómo está, para mostrarlo. `descanso` no vive acá: es la energía de ella,
   * que ya maneja el motor, y se la pasamos de afuera para no tener dos.
   */
  snapshot (descanso) {
    return [
      { id: 'comida', label: 'Comida', value: this.comida },
      { id: 'agua', label: 'Agua', value: this.agua },
      { id: 'descanso', label: 'Sueño', value: clamp01(descanso) },
      { id: 'bano', label: 'Baño', value: 1 - this.bano },
      { id: 'cariño', label: 'Cariño', value: this.cariño }
    ]
  }
}

function clamp01 (v) {
  return Math.max(0, Math.min(1, v))
}
