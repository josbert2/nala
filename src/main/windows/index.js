'use strict'

/**
 * Proveedor de geometria de ventanas.
 *
 * La gata camina por el borde superior de las ventanas abiertas, asi que
 * necesita saber donde estan. Cada plataforma lo resuelve distinto:
 *
 *   win32          -> node-window-manager (API nativa de Windows)
 *   linux/X11      -> wmctrl
 *   linux/GNOME    -> la extension de GNOME Shell que esta en gnome-extension/
 *                     (unica forma bajo Wayland: el compositor no expone la
 *                      geometria de ventanas a las apps)
 *
 * Si ninguno esta disponible devuelve [] y la gata vive solo en el piso.
 */

module.exports = function createProvider () {
  const impl = pick()
  let warned = false

  return {
    name: impl.name,
    async list () {
      try {
        const rects = await impl.list()
        return Array.isArray(rects) ? rects : []
      } catch (err) {
        if (!warned) {
          warned = true
          console.warn(`[nala] proveedor de ventanas "${impl.name}" fallo:`, err.message)
          console.warn('[nala] la gata va a quedarse en el piso. Ver README.')
        }
        return []
      }
    }
  }
}

function pick () {
  if (process.platform === 'win32') {
    try {
      return require('./win32')
    } catch (err) {
      console.warn('[nala] node-window-manager no disponible:', err.message)
      return require('./none')
    }
  }
  if (process.platform === 'linux') return require('./linux')
  return require('./none')
}
