'use strict'

// Windows: node-window-manager expone bounds de cada ventana visible.
const { windowManager } = require('node-window-manager')

const IGNORE = /^(Program Manager|Windows Input Experience|Nala)$/i

module.exports = {
  name: 'win32',
  async list () {
    return windowManager
      .getWindows()
      .filter((w) => {
        if (!w.isVisible()) return false
        const title = w.getTitle()
        return title && title.trim().length > 0 && !IGNORE.test(title)
      })
      .map((w) => {
        const b = w.getBounds()
        return {
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          title: w.getTitle()
        }
      })
      .filter((r) => r.w > 120 && r.h > 80)
  }
}
