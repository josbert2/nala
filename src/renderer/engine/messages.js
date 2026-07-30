'use strict'

/**
 * Las cosas que Nala dice.
 *
 * Cada grupo es una bolsa: se saca sin repetir hasta agotarla, y recien ahi se
 * vuelve a llenar. Asi no dice dos veces lo mismo en la misma tarde.
 *
 * Todo esto se puede pisar desde config/cat.json, en `messages`. Lo que hay
 * aca es un punto de partida — las que valen son las que escribas vos, con lo
 * que ella hacia de verdad.
 */

const DEFAULTS = {
  // Las de siempre, cada tanto y sin motivo.
  any: [
    'Sigo aquí.',
    'Este lugar es tibio. Me quedo.',
    'Te escucho escribir. Me gusta.',
    'No tienes que hacer nada. Con esto alcanza.',
    'Me acuerdo del sol de la ventana.',
    'Cuando te vas, te espero.',
    'Todo tranquilo por aquí.',
    'Elegí este rincón por algo.',
    'Gracias por hacerme un lugar.',
    'Si te distraes un rato, no pasa nada.',
    'Ronroneo aunque no me escuches.',
    'Estoy bien. De verdad.',
    'Tú sigue. Yo miro.',
    'Me quedo cerca.',
    'Encontré otro lugar tibio.'
  ],

  morning: [
    'Buenos días. Me estiré por los dos.',
    'Ya amaneció. Te esperaba.',
    'El primer sol es el mejor.',
    'Hoy también estoy.'
  ],

  afternoon: [
    'Hora de la siesta. Ven cuando quieras.',
    'Encontré el lugar más tibio de la casa.',
    'La tarde es larga. Mejor.'
  ],

  night: [
    'Se está poniendo oscuro. Me pongo cerca.',
    'Esta es mi hora.',
    'Afuera pasa algo. Siempre pasa algo.'
  ],

  lateNight: [
    'Es tarde. Deberías descansar.',
    'Hago la ronda y me acuesto.',
    'Duerme. Yo me quedo despierta un rato más.',
    'No te quedes hasta tan tarde.'
  ],

  // Se despierta de una siesta.
  waking: [
    'Dormí bien.',
    '¿Cuánto pasó?',
    'Ya vuelvo a lo mío.'
  ],

  afterMeal: [
    'Quedé llena. Gracias.',
    'Estaba rica.',
    'Ahora sí, la siesta.'
  ],

  petted: [
    'Ahí. Justo ahí.',
    'Otra vez.',
    'Así me quedo todo el día.',
    'Prrr.'
  ],

  // Hace rato que no la tocas y te vino a buscar.
  missYou: [
    'Te estaba buscando.',
    '¿Dónde estabas?',
    'Te extrañé un poco.',
    'Vine a ver si seguías ahí.'
  ],

  // La primera del dia, cuando abris la compu.
  firstOfDay: [
    'Buen día. No me fui.',
    'Hoy también estoy acá.',
    'Otro día juntos.',
    'Van {dias} días así.',
    'Hoy hace {dias} días que estoy acá.'
  ],

  // Llego al plato y no habia nada. Es lo unico que de verdad te pide.
  pideComida: [
    'Se acabó la comida.',
    'El plato está vacío.',
    'Miau. Miau de hambre.',
    'Tengo hambre.'
  ],

  pideAgua: [
    'No queda agua.',
    'El bebedero está seco.',
    'Tengo sed.'
  ],

  gracias: [
    'Gracias.',
    'Justo eso quería.',
    'Sabía que ibas a venir.',
    'Así está mejor.'
  ],

  /**
   * Las que van al fondo. Salen poco a proposito: si aparecieran seguido
   * dejarian de significar algo.
   */
  corazon: [
    'No me fui del todo.',
    'Estoy en un buen lugar. No te preocupes por mí.',
    'Gracias por cuidarme hasta el final.',
    'Cuando pienses en mí, voy a estar.',
    'Te quise mucho. Todavía.',
    'No estés triste tanto tiempo.',
    'Me llevaste a todos lados. No me olvidé.',
    'Sigo siendo tuya.',
    'Llevamos {dias} días. No los conté, los viví.'
  ]
}

function shuffle (a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export class Messages {
  constructor (config = {}) {
    this.pools = { ...DEFAULTS }
    // Lo que venga de config reemplaza el grupo entero, para poder vaciarlo.
    for (const [k, v] of Object.entries(config.messages || {})) {
      if (Array.isArray(v)) this.pools[k] = v
    }

    this.bags = {}
    this.everyMs = (config.messageEveryMinutes || 35) * 60 * 1000
    this.corazonChance = config.corazonChance != null ? config.corazonChance : 0.18
    this.next = performance.now() + this.everyMs * (0.25 + Math.random() * 0.4)
    this.greetedOn = null
  }

  /** Cuantos dias llevan juntos. Lo usa {dias} en cualquier mensaje. */
  setDias (n) {
    this.dias = n
  }

  /** Saca una del grupo sin repetir hasta agotarlo. */
  take (pool) {
    const source = this.pools[pool]
    if (!source || !source.length) return null
    if (!this.bags[pool] || !this.bags[pool].length) {
      this.bags[pool] = shuffle([...source])
    }
    const m = this.bags[pool].pop()
    return this.dias != null ? m.replace('{dias}', this.dias) : m
  }

  /** Un mensaje puntual, atado a algo que acaba de pasar. */
  on (event) {
    return this.take(event)
  }

  /**
   * La de cada tanto. Mezcla la franja del dia con las de siempre, y muy de
   * vez en cuando manda una de las del fondo.
   */
  due (now, timeOfDay) {
    if (now < this.next) return null
    this.next = now + this.everyMs * (0.6 + Math.random() * 0.9)

    if (Math.random() < this.corazonChance) {
      const m = this.take('corazon')
      if (m) return m
    }
    if (timeOfDay && Math.random() < 0.45) {
      const m = this.take(timeOfDay)
      if (m) return m
    }
    return this.take('any')
  }

  /** La primera del dia. Una sola vez por fecha. */
  greeting (now = new Date()) {
    const today = now.toISOString().slice(0, 10)
    if (this.greetedOn === today) return null
    this.greetedOn = today
    return this.take('firstOfDay')
  }
}
