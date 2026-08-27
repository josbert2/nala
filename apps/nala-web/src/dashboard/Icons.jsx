import { useEffect, useMemo, useRef, useState } from 'react'
import ICONS from './hugeicons.json'

const CDN = (name, style) => `https://cdn.hugeicons.com/icons/${name}-${style}.svg`
const STYLES = [
  ['solid-standard', 'Solid · Standard'], ['stroke-standard', 'Stroke · Standard'], ['duotone-standard', 'Duotone · Standard'],
  ['solid-rounded', 'Solid · Rounded'], ['stroke-rounded', 'Stroke · Rounded'], ['bulk-rounded', 'Bulk · Rounded'],
  ['twotone-rounded', 'Twotone · Rounded'], ['duotone-rounded', 'Duotone · Rounded'],
  ['solid-sharp', 'Solid · Sharp'], ['stroke-sharp', 'Stroke · Sharp']
]
const STYLE_LABEL = Object.fromEntries(STYLES)
const FAM = { solid: 'Solid', stroke: 'Stroke', duotone: 'Duo', bulk: 'Bulk', twotone: '2Tone' }
const SHP = { standard: '', rounded: 'R', sharp: 'Sh' }
const shortStyle = (s) => { const [f, sh] = s.split('-'); return SHP[sh] ? `${FAM[f] || f} ${SHP[sh]}` : (FAM[f] || f) }
const BONUS = 'sin-categoria-bonus-1-variante'
const PAGE = 180
const SIZES = ['16', '20', '24', '28', '32', '36', '40', '44', '48', '64']
const STROKES = ['0.5', '1', '1.5', '2', '3']

function applyOverrides (raw, { color, strokeWidth, size }) {
  let t = raw
  if (color) t = t.replace(/#[0-9a-fA-F]{3,8}/g, color)
  if (strokeWidth) t = t.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`)
  if (size) {
    const i = t.indexOf('>')
    t = t.slice(0, i).replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`) + t.slice(i)
  }
  return t
}

export default function Icons () {
  const cats = ICONS.categorias
  const allNames = useMemo(() => {
    const out = []
    for (const [c, names] of Object.entries(cats)) for (const n of names) out.push({ name: n, category: c })
    out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
    return out
  }, [cats])

  const [cat, setCat] = useState('__all__')
  const [active, setActive] = useState(() => new Set(STYLES.map(([v]) => v)))
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [open, setOpen] = useState(null)   // {name, cat, style}
  const [toast, setToast] = useState('')

  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 1400) }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = cat === '__all__' ? allNames : allNames.filter((e) => e.category === cat)
    const filtered = needle ? base.filter((e) => e.name.includes(needle)) : base
    const out = []
    for (const { name, category } of filtered) {
      const styles = category === BONUS ? ['stroke-rounded'] : STYLES.map(([v]) => v)
      for (const v of styles) if (active.has(v)) out.push({ name, category, style: v })
    }
    return out
  }, [allNames, cat, q, active])

  useEffect(() => { setShown(PAGE) }, [cat, q, active])

  // infinite scroll
  const sentinel = useRef(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setShown((s) => Math.min(s + PAGE, list.length)) })
    io.observe(el)
    return () => io.disconnect()
  }, [list.length])

  const iconCount = useMemo(() => new Set(list.map((x) => x.name)).size, [list])
  const catNames = useMemo(() => Object.keys(cats).filter((c) => c !== BONUS).sort(), [cats])

  const toggleStyle = (v) => setActive((prev) => {
    const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); if (n.size === 0) n.add(v); return n
  })

  return (
    <div className="hi">
      <div className="hi-layout">
        <aside className="hi-sidebar">
          <div className="ds-group" style={{ margin: '0 0 6px' }}>Categorías</div>
          <button className={`hi-cat${cat === '__all__' ? ' active' : ''}`} onClick={() => { setCat('__all__'); setQ('') }}>
            <span>Todas</span><span className="hi-cat-n">{ICONS.meta.total_iconos_unicos}</span>
          </button>
          {catNames.map((c) => (
            <button key={c} className={`hi-cat${cat === c ? ' active' : ''}`} onClick={() => { setCat(c); setQ('') }}>
              <span>{c.replace(/-/g, ' ')}</span><span className="hi-cat-n">{cats[c].length}</span>
            </button>
          ))}
        </aside>

        <div className="hi-main">
          <div className="hi-controls">
            <div className="sk-bar">
              <div className="sk-search-wrap">
                <svg className="sk-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                <input className="sk-search" placeholder="Buscar icono (ej: arrow, mail-01)…" value={q}
                  onChange={(e) => { setQ(e.target.value); if (e.target.value.trim()) setCat('__all__') }} />
                {q && <button className="sk-search-x" aria-label="Limpiar" onClick={() => setQ('')}>×</button>}
              </div>
              <span className="sk-count">{iconCount.toLocaleString('es')} iconos · {list.length.toLocaleString('es')} variantes</span>
            </div>
            <div className="hi-styletabs">
              {STYLES.map(([v, l]) => (
                <button key={v} className={`hi-styletab${active.has(v) ? ' on' : ''}`} onClick={() => toggleStyle(v)}>{l}</button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <div className="sk-empty">No encontré ningún icono con ese nombre.</div>
          ) : (
            <>
              <div className="hi-grid">
                {list.slice(0, shown).map((it, i) => (
                  <div key={it.name + it.style + i} className="hi-cell" title={`${it.name} · ${STYLE_LABEL[it.style]} — click: ficha · shift+click: copiar nombre`}
                    onClick={(e) => { if (e.shiftKey) { navigator.clipboard?.writeText(it.name); say(`"${it.name}" copiado`) } else setOpen({ name: it.name, cat: it.category, style: it.style }) }}>
                    <span className="hi-badge">{shortStyle(it.style)}</span>
                    <span className="hi-icon"><img src={CDN(it.name, it.style)} alt={it.name} loading="lazy" onError={(e) => { e.target.style.opacity = 0.15 }} /></span>
                    <span className="hi-name">{it.name}<em>{STYLE_LABEL[it.style]}</em></span>
                  </div>
                ))}
              </div>
              {shown < list.length && <div ref={sentinel} className="hi-sentinel"><button className="sk-ghost" onClick={() => setShown((s) => s + PAGE)}>Cargar más</button></div>}
            </>
          )}
        </div>
      </div>

      {open && <IconModal icon={open} onClose={() => setOpen(null)} say={say} />}
      {toast && <div className="hi-toast">{toast}</div>}
    </div>
  )
}

function Dropdown ({ label, head, items, value, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', h); return () => document.removeEventListener('click', h)
  }, [])
  return (
    <div className="hi-dd" ref={ref}>
      <button className={`hi-dd-trigger${open ? ' open' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}>
        <span>{label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="hi-dd-panel">
          <div className="hi-dd-head">{head}</div>
          {items.map((it) => (
            <button key={it} className={`hi-dd-item${it === value ? ' active' : ''}`} onClick={() => { onPick(it); setOpen(false) }}>
              <span className="hi-dd-check">{it === value ? '✓' : ''}</span><span>{it}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function IconModal ({ icon, onClose, say }) {
  const [style, setStyle] = useState(icon.style)
  const [color, setColor] = useState(null)
  const [strokeWidth, setStrokeWidth] = useState(null)
  const [size, setSize] = useState(null)
  const [raw, setRaw] = useState(null)
  const [base, setBase] = useState({ stroke: null, size: '24' })
  const isBonus = icon.cat === BONUS
  const styles = isBonus ? ['stroke-rounded'] : STYLES.map(([v]) => v)

  useEffect(() => {
    let alive = true
    setRaw(null)
    fetch(CDN(icon.name, style)).then((r) => (r.ok ? r.text() : Promise.reject(r))).then((t) => {
      if (!alive) return
      setRaw(t)
      const sm = t.match(/stroke-width="([\d.]+)"/)
      const zm = t.slice(0, t.indexOf('>')).match(/width="(\d+)"/)
      setBase({ stroke: sm ? sm[1] : null, size: zm ? zm[1] : '24' })
    }).catch(() => { if (alive) setRaw('') })
    return () => { alive = false }
  }, [icon.name, style])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const switchStyle = (v) => { if (v === style) return; setStyle(v); setColor(null); setStrokeWidth(null); setSize(null) }
  const finalSvg = raw ? applyOverrides(raw, { color, strokeWidth, size }) : null
  const previewSrc = finalSvg ? `data:image/svg+xml;utf8,${encodeURIComponent(finalSvg)}` : CDN(icon.name, style)
  const px = Math.max(18, Math.min(Number(size || base.size || 24), 160))

  const copyName = () => { navigator.clipboard?.writeText(icon.name); say(`"${icon.name}" copiado`) }
  const copyUrl = () => { navigator.clipboard?.writeText(CDN(icon.name, style)); say('URL copiada') }
  const copySvg = () => { if (!finalSvg) return say('Cargando el SVG…'); navigator.clipboard?.writeText(finalSvg).then(() => say('SVG copiado')).catch(() => say('No se pudo copiar')) }
  const download = () => {
    if (!finalSvg) return say('Cargando el SVG…')
    const url = URL.createObjectURL(new Blob([finalSvg], { type: 'image/svg+xml' }))
    const a = document.createElement('a'); a.href = url; a.download = `${icon.name}-${style}.svg`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    say('SVG descargado')
  }

  return (
    <div className="hi-modal" onClick={onClose}>
      <div className="hi-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="hi-modal-top">
          <div className="hi-crumb">
            <span>{isBonus ? 'bonus' : icon.cat.replace(/-/g, ' ')}</span><span className="hi-crumb-sep">›</span>
            <span>{STYLE_LABEL[style]}</span><span className="hi-crumb-sep">›</span>
            <span className="cur">{icon.name}</span>
          </div>
          <div className="hi-modal-actions">
            <button className="hi-iconbtn" title="Copiar URL" onClick={copyUrl}>⛓</button>
            <button className="hi-iconbtn" title="Cerrar" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="hi-modal-body">
          <div className="hi-preview"><img src={previewSrc} alt={icon.name} style={{ width: px, height: px }} /></div>
          <div className="hi-modal-info">
            <div className="hi-modal-titlerow">
              <h2>{icon.name}</h2>
              <button className="hi-iconbtn small" title="Copiar nombre" onClick={copyName}>⧉</button>
            </div>
            <div className="hi-modal-meta">{isBonus ? 'Icono bonus · 1 variante' : `${STYLES.length} estilos disponibles`}</div>

            <div className="hi-varhead">Estilo</div>
            <div className="hi-variants">
              {styles.map((v) => (
                <button key={v} className={`hi-variant${v === style ? ' active' : ''}`} title={STYLE_LABEL[v]} onClick={() => switchStyle(v)}>
                  <img src={CDN(icon.name, v)} alt={STYLE_LABEL[v]} loading="lazy" onError={(e) => { e.target.style.opacity = 0.15 }} />
                </button>
              ))}
            </div>

            <div className="hi-toolbar">
              <Dropdown label={`${size || base.size || 24}px`} head="Tamaño" items={SIZES} value={size || base.size || '24'}
                onPick={(v) => setSize(v === base.size ? null : v)} />
              <Dropdown label={base.stroke ? (strokeWidth || base.stroke) : 'Sin trazo'} head="Grosor" items={STROKES} value={strokeWidth || base.stroke || ''}
                onPick={(v) => base.stroke && setStrokeWidth(v === base.stroke ? null : v)} />
              <label className="hi-color">
                <input type="color" value={color || '#141b34'} onChange={(e) => setColor(e.target.value)} />
                <span>{color ? color.toUpperCase() : 'Original'}</span>
              </label>
              {color && <button className="hi-iconbtn" title="Restablecer color" onClick={() => setColor(null)}>↺</button>}
            </div>

            <div className="hi-actiongroup">
              <button className="hi-action" onClick={download}>↓ Descargar SVG</button>
              <span className="hi-action-div" />
              <button className="hi-action" onClick={copySvg}>⧉ Copiar SVG</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
