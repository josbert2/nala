import { useEffect, useState } from 'react'
import './debug.css'

// Barra 0..1 con etiqueta y porcentaje.
function Bar ({ label, value, tone }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="dbg-bar">
      <span className="dbg-bar-label">{label}</span>
      <span className="dbg-bar-track">
        <span className={`dbg-bar-fill${tone ? ' t-' + tone : ''}`} style={{ width: pct + '%' }} />
      </span>
      <span className="dbg-bar-num">{pct}</span>
    </div>
  )
}

function Flag ({ on, children }) {
  return <span className={`dbg-flag${on ? ' on' : ''}`}>{children}</span>
}

export default function DebugPanel () {
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState(null)

  // Toggle con la tecla D (salvo que estes escribiendo en un input).
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'd' || e.key === 'D') setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Mientras esta abierto, lee el estado del engine ~10 veces por segundo.
  useEffect(() => {
    if (!open) return
    let alive = true
    const tick = () => {
      if (!alive) return
      const fn = window.__nalaDebug
      setSnap(fn ? fn() : null)
    }
    tick()
    const id = setInterval(tick, 100)
    return () => { alive = false; clearInterval(id) }
  }, [open])

  if (!open) {
    return (
      <button className="dbg-chip" onClick={() => setOpen(true)} title="Debug (tecla D)">
        debug
      </button>
    )
  }

  return (
    <aside className="dbg">
      <div className="dbg-head">
        <span className="dbg-title">DEBUG</span>
        <button className="dbg-x" onClick={() => setOpen(false)} title="Cerrar (D)">×</button>
      </div>

      {!snap ? (
        <div className="dbg-wait">esperando el engine…</div>
      ) : (
        <>
          <div className="dbg-state">
            <span className="dbg-state-name">{snap.state}</span>
            <span className="dbg-state-anim">{snap.anim} · {snap.facing > 0 ? '→' : '←'}</span>
          </div>

          <div className="dbg-progress">
            <span className="dbg-progress-fill" style={{ width: Math.round(snap.progress * 100) + '%' }} />
          </div>
          <div className="dbg-progress-num">{snap.elapsed} / {snap.hold} ms</div>

          <div className="dbg-flags">
            {snap.after && <span className="dbg-next">→ {snap.after}</span>}
            {snap.target != null && <span className="dbg-next">x:{snap.target}</span>}
            <Flag on={snap.airborne}>aire</Flag>
            <Flag on={snap.pinned}>agarrada</Flag>
            <Flag on={snap.angry}>enojada</Flag>
            {snap.asking && <span className="dbg-flag on">pide:{snap.asking}</span>}
          </div>

          <div className="dbg-section">needs</div>
          {snap.needs.map((n) => (
            <Bar key={n.id} label={n.label} value={n.value} tone={n.value < 0.35 ? 'low' : null} />
          ))}
          <Bar label="Energía" value={snap.energy} tone={snap.energy < 0.3 ? 'low' : null} />

          <div className="dbg-section">pointer</div>
          <div className="dbg-grid">
            <span>x</span><b>{snap.pointer.x}</b>
            <span>y</span><b>{snap.pointer.y}</b>
            <span>vel</span><b>{snap.pointer.speed}</b>
            <span>wiggle</span><b>{snap.pointer.wiggle}</b>
            <span>activo</span><b>{snap.pointer.active ? 'sí' : 'no'}</b>
          </div>

          <div className="dbg-section">cooldowns (s)</div>
          <div className="dbg-grid">
            <span>cursor</span><b className={snap.cooldowns.cursor ? 'wait' : 'ok'}>{snap.cooldowns.cursor || 'listo'}</b>
            <span>regalo</span><b className={snap.cooldowns.regalo ? 'wait' : 'ok'}>{snap.cooldowns.regalo || 'listo'}</b>
            <span>pájaro</span><b className={snap.cooldowns.pajaro ? 'wait' : 'ok'}>{snap.cooldowns.pajaro || 'listo'}</b>
          </div>
        </>
      )}
    </aside>
  )
}
