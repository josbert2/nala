/**
 * Publica la geometria de las ventanas abiertas en D-Bus.
 *
 * Bajo Wayland el compositor no le cuenta a las apps donde estan las otras
 * ventanas. Sin este dato la gata no puede caminar por los bordes. Esta
 * extension expone esa info y nada mas: no dibuja ni modifica nada.
 */

import Gio from 'gi://Gio'
import Meta from 'gi://Meta'
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js'

const IFACE = `
<node>
  <interface name="dev.josbert.DeskCat">
    <method name="GetWindows">
      <arg type="s" direction="out" name="json"/>
    </method>
  </interface>
</node>`

const ALLOWED = new Set([Meta.WindowType.NORMAL, Meta.WindowType.DIALOG])

export default class DeskCatExtension extends Extension {
  enable () {
    this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this)
    this._dbus.export(Gio.DBus.session, '/dev/josbert/DeskCat')
  }

  disable () {
    this._dbus?.unexport()
    this._dbus = null
  }

  GetWindows () {
    const out = []
    for (const actor of global.get_window_actors()) {
      const w = actor.meta_window
      if (!w) continue
      if (w.minimized || w.is_override_redirect()) continue
      if (!ALLOWED.has(w.get_window_type())) continue

      const r = w.get_frame_rect()
      if (r.width < 120 || r.height < 80) continue

      out.push({
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        title: w.get_title() ?? ''
      })
    }
    // Orden: la de mas arriba en el stack primero (para calcular oclusion).
    out.reverse()
    return JSON.stringify(out)
  }
}
