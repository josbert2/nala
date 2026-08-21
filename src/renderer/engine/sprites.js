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
  draw (ctx, name, elapsed, x, y, scale, flip, gaze) {
    const a = this.anim(name)
    let idx = Math.floor((elapsed / 1000) * a.fps)
    idx = a.loop
      ? ((idx % a.frames) + a.frames) % a.frames        // tolera elapsed negativo
      : Math.max(0, Math.min(idx, a.frames - 1))

    // Algunas animaciones (dormir echada, por ejemplo) se ven mas chicas que
    // el resto en la vida real: "scale" en el json de la animacion la ajusta
    // sin tocar el tamaño general del bicho.
    scale = scale * (a.scale || 1)

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

    if (gaze) this._eyes(ctx, a, idx, dx, dy, dw, scale, flip, gaze)
  }

  /**
   * Repinta los ojos con la mirada corrida.
   *
   * Los gatos clavan la mirada en algo y mueven el cuerpo debajo, asi que la
   * cabeza va quieta en el sprite y lo unico que se mueve es la pupila. Eso no
   * se puede pre-renderizar sin una version por direccion, asi que el ojo lo
   * pinta el motor encima, con las medidas que el generador dejo en el json.
   */
  _eyes (ctx, a, idx, dx, dy, dw, scale, flip, gaze) {
    const g = this.meta.eye
    const marks = a.eyes && a.eyes[idx]
    if (!g || !marks || !marks.length) return   // ojos cerrados: nada que pintar

    const P = this.meta.palette
    const mx = Math.max(-1, Math.min(1, gaze.x)) * g.maxGaze
    const my = Math.max(-1, Math.min(1, gaze.y)) * g.maxGaze
    const s = flip ? -1 : 1

    for (const [ex, ey] of marks) {
      const cx = flip ? this.cw - ex : ex

      // Un poco mas grande que lo que dibujo el generador, para taparlo bien.
      if (g.ring) {
        this._blob(ctx, dx, dy, scale, cx, ey, g.ring[0], g.ring[1],
                   P.deep || P.dark)
      } else {
        this._blob(ctx, dx, dy, scale, cx, ey, g.iris[0], g.iris[1], P.eye)
      }
      this._blob(ctx, dx, dy, scale, cx, ey, g.iris[0], g.iris[1], P.eye)
      this._blob(ctx, dx, dy, scale, cx + mx * s, ey + my,
                 g.pupil[0], g.pupil[1], P.pupil || P.outline)
      this._blob(ctx, dx, dy, scale,
                 cx + (g.hiOffset[0] + mx * 0.5) * s, ey + g.hiOffset[1] + my * 0.5,
                 g.hi, g.hi, P.light)
    }
  }

  /**
   * Una elipse rasterizada en la grilla del sprite: cada pixel del sprite es un
   * cuadrado de `scale`. Dibujarla con ctx.ellipse la dejaria suavizada y
   * cantaria muchisimo al lado del pixel art.
   */
  _blob (ctx, dx, dy, scale, cx, cy, rx, ry, color) {
    if (!color) return
    ctx.fillStyle = color
    const x0 = Math.floor(cx - rx)
    const x1 = Math.ceil(cx + rx)
    const y0 = Math.floor(cy - ry)
    const y1 = Math.ceil(cy + ry)
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const u = (px + 0.5 - cx) / rx
        const v = (py + 0.5 - cy) / ry
        if (u * u + v * v > 1) continue
        ctx.fillRect(Math.round(dx + px * scale), Math.round(dy + py * scale), scale, scale)
      }
    }
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
