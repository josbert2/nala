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
