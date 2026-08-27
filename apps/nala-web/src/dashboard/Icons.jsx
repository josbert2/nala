import { useMemo, useState } from 'react'
import ICONS from './hugeicons.json'

const STYLES = [
  'stroke-standard', 'stroke-rounded', 'stroke-sharp',
  'solid-standard', 'solid-rounded', 'solid-sharp',
  'bulk-rounded', 'duotone-rounded', 'duotone-standard', 'twotone-rounded'
]
const cdn = (name, style) => `https://cdn.hugeicons.com/icons/${name}-${style}.svg`

export default function Icons () {
  const cats = ICONS.categorias
  const catNames = useMemo(() => Object.keys(cats), [cats])
  const [cat, setCat] = useState(catNames[0])
  const [style, setStyle] = useState('stroke-standard')
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState('')

  const all = useMemo(() => catNames.flatMap((c) => cats[c]), [catNames, cats])
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (n) return [...new Set(all.filter((x) => x.includes(n)))].slice(0, 200)
    return cats[cat] || []
  }, [q, cat, all, cats])

  const copy = (name) => {
    navigator.clipboard?.writeText(name).then(() => { setCopied(name); setTimeout(() => setCopied(''), 1000) }).catch(() => {})
  }

  return (
    <div className="hi">
      <div className="sk-controls">
        <div className="sk-bar">
          <div className="sk-search-wrap">
            <svg className="sk-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input className="sk-search" placeholder="Buscar iconos…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="sk-search-x" aria-label="Limpiar" onClick={() => setQ('')}>×</button>}
          </div>
          <span className="sk-count">{ICONS.meta.total_iconos_unicos.toLocaleString('es')} iconos · {catNames.length} categorías</span>
        </div>

        <div className="sk-pills">
          {STYLES.map((s) => (
            <button key={s} className={`sk-pill${style === s ? ' on' : ''}`} onClick={() => setStyle(s)}>{s.replace(/-/g, ' ')}</button>
          ))}
        </div>

        {!q && (
          <div className="sk-sections hi-cats">
            {catNames.map((c) => (
              <button key={c} className={`sk-section${cat === c ? ' on' : ''}`} onClick={() => setCat(c)}>
                {c.replace(/-/g, ' ')}<span className="sk-section-n">{cats[c].length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="sk-meta">{q ? `${list.length} resultados` : `${(cats[cat] || []).length} en ${cat.replace(/-/g, ' ')}`} · estilo {style.replace(/-/g, ' ')}</div>
      </div>

      <div className="hi-grid">
        {list.map((n) => (
          <button key={n} className="hi-cell" onClick={() => copy(n)} title={`${n} — click para copiar`}>
            <span className="hi-icon"><img src={cdn(n, style)} alt={n} loading="lazy" width="28" height="28" /></span>
            <span className="hi-name">{copied === n ? '✓ copiado' : n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
