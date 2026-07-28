'use strict'

/**
 * Carga el spritesheet y sabe dibujar un frame de una animacion.
 * El sheet es una grilla: una fila por animacion, una columna por frame.
 */
export class SpriteSheet {
  constructor (image, meta) {
    this.image = image
    this.meta = meta
    this.cw = meta.cell[0]
    this.ch = meta.cell[1]
    this.ground = meta.ground
  }

  static async load (pngUrl, jsonUrl) {
    const [image, meta] = await Promise.all([
      new Promise((res, rej) => {
        const img = new Image()
        img.onload = () => res(img)
        img.onerror = () => rej(new Error(`no pude cargar ${pngUrl}`))
        img.src = pngUrl
      }),
      fetch(jsonUrl).then((r) => r.json())
    ])
    return new SpriteSheet(image, meta)
  }

  anim (name) {
    return this.meta.animations[name] || this.meta.animations.idle
  }

  /** Cuantos ms dura una vuelta completa de la animacion. */
  duration (name) {
    const a = this.anim(name)
    return (a.frames / a.fps) * 1000
  }

  /**
   * Dibuja el frame correspondiente a `elapsed` ms de la animacion `name`.
   * (x, y) es el punto donde apoyan las patas (centro-abajo del sprite).
   */
  draw (ctx, name, elapsed, x, y, scale, flip) {
    const a = this.anim(name)
    let idx = Math.floor((elapsed / 1000) * a.fps)
    idx = a.loop
      ? ((idx % a.frames) + a.frames) % a.frames        // tolera elapsed negativo
      : Math.max(0, Math.min(idx, a.frames - 1))

    const sx = idx * this.cw
    const sy = a.row * this.ch
    const dw = this.cw * scale
    const dh = this.ch * scale
    // El sprite se ancla por su linea de piso, no por el borde de la celda.
    const dx = Math.round(x - dw / 2)
    const dy = Math.round(y - this.ground * scale)

    ctx.save()
    if (flip) {
      ctx.translate(dx + dw, dy)
      ctx.scale(-1, 1)
      ctx.drawImage(this.image, sx, sy, this.cw, this.ch, 0, 0, dw, dh)
    } else {
      ctx.drawImage(this.image, sx, sy, this.cw, this.ch, dx, dy, dw, dh)
    }
    ctx.restore()
  }

  /** Caja de colision aproximada en coordenadas de pantalla. */
  bounds (x, y, scale) {
    const dw = this.cw * scale
    const dh = this.ch * scale
    return {
      x: x - dw / 2,
      y: y - this.ground * scale,
      w: dw,
      h: dh
    }
  }
}
