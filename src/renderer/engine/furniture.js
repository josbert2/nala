'use strict'

import { Anchored } from './props.js'

/**
 * Sus muebles: el rascadero, la casa arbol, la cueva y los juguetes tirados.
 *
 * Los que tienen tablas (el rascadero y el arbol) NO las traen escritas aca:
 * las leen del json de su propio sprite, donde las declara el generador al lado
 * del dibujo. Asi las medidas viven en un solo lugar, y mover una tabla en el
 * dibujo mueve tambien el lugar donde ella se para.
 */
class Furniture extends Anchored {
  constructor (world, sheet, scale, anim, xFraction, displayIndex = null) {
    super(world, xFraction, displayIndex)
    this.sheet = sheet
    this.scale = scale
    this.anim = anim
  }

  get _meta () {
    return (this.sheet && this.sheet.meta.animations[this.anim]) || null
  }

  /** El borde izquierdo del sprite, que es desde donde se miden las tablas. */
  get _left () {
    return this.x - (this.sheet.cw / 2) * this.scale
  }

  /** Sus tablas, ya en coordenadas del mundo. El motor las usa de superficies. */
  surfaces () {
    const m = this._meta
    if (!m || !m.ledges || !m.ledges.length) return []
    const g = this.sheet.ground
    const left = this._left
    return m.ledges.map(([sx1, sx2, sy], i) => ({
      id: `${this.anim}${i}`,
      x1: left + sx1 * this.scale,
      x2: left + sx2 * this.scale,
      y: this.y - (g - sy) * this.scale,
      title: this.title
    }))
  }
}

/** El rascadero. Se para en dos patas y lo rasca; arriba tiene su tablita. */
export class ScratchPost extends Furniture {
  constructor (world, sheet, scale, xFraction = 0.28, displayIndex = null) {
    super(world, sheet, scale, 'post', xFraction, displayIndex)
    this.title = 'su rascadero'
  }

  /** Ya esta al lado como para rascarlo. */
  holds (x) {
    return Math.abs(x - this.x) < 40
  }
}

/** Su casa arbol. Tres tablas: la baja, el techo de la casita y la de arriba. */
export class CatTree extends Furniture {
  constructor (world, sheet, scale, xFraction = 0.55, displayIndex = null) {
    super(world, sheet, scale, 'tree', xFraction, displayIndex)
    this.title = 'su arbol'
  }
}

/**
 * Su cueva. Se dibuja en dos partes, pero al reves que la cama: la cascara va
 * por delante SOLO cuando ella esta metida adentro. Si no, el mueble entero va
 * detras, porque es mas alto que ella y si no la taparia entera al pasar.
 */
export class Cave extends Furniture {
  constructor (world, sheet, scale, xFraction = 0.72, displayIndex = null) {
    super(world, sheet, scale, 'cave_back', xFraction, displayIndex)
    this.title = 'su cueva'
  }

  /** Esta metida adentro: lo bastante cerca del centro de la boca. */
  holds (x) {
    return Math.abs(x - this.x) < 30
  }
}

/**
 * Un juguete tirado en el piso. No hace nada solo: esta ahi para que ella lo
 * vaya a manotear. `anim` elige cual (mouse, pelotita, pelotita2, wand).
 */
export class Toy extends Furniture {
  constructor (world, sheet, scale, anim, xFraction, displayIndex = null) {
    super(world, sheet, scale, anim, xFraction, displayIndex)
    this.title = 'su juguete'
  }

  holds (x) {
    return Math.abs(x - this.x) < 34
  }
}

/**
 * Su arenero. Como la cueva, se dibuja en dos partes: la bandeja detras y el
 * borde de adelante por encima, para que se la vea parada adentro.
 */
export class Litter extends Furniture {
  constructor (world, sheet, scale, xFraction = 0.42, displayIndex = null) {
    super(world, sheet, scale, 'litter_back', xFraction, displayIndex)
    this.title = 'su arenero'
  }

  /** Ya esta adentro de la bandeja. */
  holds (x) {
    return Math.abs(x - this.x) < 28
  }
}

/**
 * Una pieza cualquiera del habitat.
 *
 * No sabe nada de que es: saca todo del sprite. Si en la hoja existen
 * `<kind>_back` y `<kind>_front` se dibuja en dos partes y ella puede meterse
 * adentro; si el json le declara tablas, el motor las usa de superficies. Asi
 * agregar una pieza al habitat es dibujarla y nombrarla, sin tocar codigo.
 */
export class Piece extends Furniture {
  constructor (world, sheet, scale, kind, xFraction, displayIndex = null) {
    const anims = (sheet && sheet.meta.animations) || {}
    const twoPart = anims[`${kind}_back`] != null
    super(world, sheet, scale, twoPart ? `${kind}_back` : kind, xFraction, displayIndex)
    this.kind = kind
    this.twoPart = twoPart
    this.backAnim = twoPart ? `${kind}_back` : kind
    this.frontAnim = twoPart ? `${kind}_front` : null
  }

  /** Solo las piezas de dos partes se la tragan adentro. */
  holds (x) {
    return this.twoPart && Math.abs(x - this.x) < 30
  }
}
