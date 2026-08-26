import { useEffect, useId, useMemo, useState } from 'react'
import Markdown from './Markdown.jsx'
import { seededScene } from './authorAvatar.js'

const AV = ['#4361ee', '#2fbf71', '#f4a340', '#e0803a', '#a06cff', '#12a5b0', '#e05343', '#d94f8a', '#3aa76d', '#8a63d2']
const hashN = (s) => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
const avColor = (a) => AV[hashN(a || '?') % AV.length]

// Avatar procedural (bible-strong-avatar-lab) determinista por handle.
function Avatar ({ author, owner, size = 20 }) {
  const uid = useId().replace(/[^a-z0-9]/gi, '')
  const scene = seededScene(owner || author || '?')
  if (!scene || !scene.geometry) {
    return <span className="sk-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.5), background: avColor(author) }}>{(author || '?')[0].toUpperCase()}</span>
  }
  const g = scene.geometry, c = scene.colors, clip = `avclip-${uid}`
  return (
    <svg className="sk-av-svg" width={size} height={size} viewBox="-150 -150 300 300" role="img" aria-label={author || owner}>
      <defs><clipPath id={clip}><path d={g.headPath} /></clipPath></defs>
      {g.backPaths.map((d, i) => (d ? <path key={`b${i}`} d={d} fill={c.body} /> : null))}
      <path d={g.headPath} fill={c.body} />
      <g clipPath={`url(#${clip})`}>
        <path d={g.leftPath} fill={c.eyes} opacity={g.leftVisible ? 1 : 0} />
        <path d={g.rightPath} fill={c.eyes} opacity={g.rightVisible ? 1 : 0} />
      </g>
      {g.frontPaths.map((d, i) => (d ? <path key={`f${i}`} d={d} fill={c.body} /> : null))}
    </svg>
  )
}

const withAccount = (cmd, account) => {
  if (!cmd || !account) return cmd
  return cmd.replace(/github\.com\/[^/\s]+\//, `github.com/${account.trim().replace(/^@/, '')}/`)
}

// Catálogo de fuentes (cada una es una "sección").
const SOURCES = {
  'ui-skills': { label: 'ui-skills', color: '#4361ee' },
  'skills.sh': { label: 'skills.sh', color: '#2fbf71' },
  'design-md': { label: 'design.md', color: '#e0803a' },
  superpowers: { label: 'superpowers', color: '#a06cff' },
  impeccable: { label: 'impeccable', color: '#d94f8a' },
  transitions: { label: 'transitions', color: '#12a5b0' },
  agentation: { label: 'agentation', color: '#e05343' },
  emilkowalski: { label: 'emilkowalski', color: '#f4a340' },
  github: { label: 'github', color: '#1c1c1c' }
}
const SECTIONS = [
  { id: 'all', label: 'Todas' },
  { id: 'ui-skills', label: 'ui-skills' },
  { id: 'skills.sh', label: 'skills.sh' },
  { id: 'design-md', label: 'design.md' },
  { id: 'superpowers', label: 'superpowers' },
  { id: 'impeccable', label: 'impeccable' },
  { id: 'transitions', label: 'transitions' },
  { id: 'agentation', label: 'agentation' },
  { id: 'emilkowalski', label: 'emilkowalski' }
]
function sourceOf (s) {
  const v = s.source || (/ui-skills\.com/.test(s.url) ? 'ui-skills' : /skills\.sh/.test(s.url) ? 'skills.sh' : /github\.com/.test(s.url) ? 'github' : '')
  return SOURCES[v] || null
}

const TOPICS = ['all', 'automation', 'ui', 'ux', 'frontend', 'design', 'animation', 'testing', 'ai', 'backend', 'mobile', 'data']
const TOPIC_LABEL = { all: 'Todos', automation: 'automation', ui: 'ui', ux: 'ux', frontend: 'frontend', design: 'design', animation: 'animation', testing: 'testing', ai: 'ai', backend: 'backend', mobile: 'mobile', data: 'data' }

// Keywords por tema (espejo del server) para pintar chips de tema en cada card.
const TOPIC_KW = {
  automation: ['automat', 'workflow', 'pipeline', 'deploy', 'scrape', 'cron', 'bot'],
  ui: ['ui', 'component', 'button', 'modal', 'dropdown', 'card', 'layout', 'tailwind', 'shadcn', 'toolbar'],
  ux: ['ux', 'usability', 'accessib', 'a11y', 'onboarding', 'feedback', 'interaction'],
  frontend: ['frontend', 'react', 'vue', 'svelte', 'next', 'nuxt', 'astro', 'vite', 'typescript'],
  design: ['design', 'visual', 'typograph', 'color', 'brand', 'figma', 'palette'],
  animation: ['animation', 'motion', 'transition', 'gsap', 'three', 'lottie', 'framer', 'animate'],
  testing: ['test', 'tdd', 'vitest', 'jest', 'playwright', 'cypress', 'debug'],
  ai: ['llm', 'prompt', 'rag', 'claude', 'gpt', 'openai', 'anthropic', 'reasoning'],
  backend: ['backend', 'api', 'database', 'sql', 'prisma', 'server', 'auth', 'postgres'],
  mobile: ['mobile', 'ios', 'android', 'swift', 'react native', 'expo', 'flutter'],
  data: ['dataviz', 'visualiz', 'analytics', 'chart', 'graph', 'dashboard']
}
const TOPIC_COLOR = {
  automation: '#e0803a', ui: '#4361ee', ux: '#12a5b0', frontend: '#7b8cff', design: '#a06cff',
  animation: '#d94f8a', testing: '#2fbf71', ai: '#e05343', backend: '#3aa76d', mobile: '#f4a340', data: '#8a63d2'
}
function topicsOf (s) {
  const hay = `${s.name} ${s.desc || ''} ${s.url || ''}`.toLowerCase()
  const out = []
  for (const [t, kws] of Object.entries(TOPIC_KW)) {
    if (kws.some((k) => hay.includes(k))) out.push(t)
    if (out.length >= 3) break
  }
  return out
}

export default function Skills () {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [cat, setCat] = useState({ total: 0, items: [], loading: true })
  const [saved, setSaved] = useState([])
  const [showSaved, setShowSaved] = useState(false)
  const [section, setSection] = useState('all')
  const [topic, setTopic] = useState('all')
  const [counts, setCounts] = useState({})
  const [tagFilter, setTagFilter] = useState(null)
  const [open, setOpen] = useState(null)
  const [account, setAccount] = useState(() => { try { return localStorage.getItem('nala-gh-account') || '' } catch (_) { return '' } })

  useEffect(() => { try { localStorage.setItem('nala-gh-account', account) } catch (_) {} }, [account])

  // Colección guardada (persistida en data/skills.json).
  useEffect(() => {
    fetch('/api/skills').then((r) => (r.ok ? r.json() : [])).then((d) => setSaved(Array.isArray(d) ? d : [])).catch(() => {})
    fetch('/api/catalog-counts').then((r) => (r.ok ? r.json() : {})).then(setCounts).catch(() => {})
  }, [])
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k' : String(n))
  const savedUrls = useMemo(() => new Set(saved.map((s) => s.url)), [saved])
  const persist = (next) => {
    setSaved(next)
    fetch('/api/skills', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }).catch(() => {})
  }
  const toggleSave = (s) => {
    if (savedUrls.has(s.url)) persist(saved.filter((x) => x.url !== s.url))
    else persist([{ id: 'sv' + hashN(s.url), name: s.name, author: s.author, owner: s.owner, desc: s.desc, url: s.url, install: s.install, source: s.source, tags: [] }, ...saved])
  }
  const setTags = (url, tags) => persist(saved.map((s) => (s.url === url ? { ...s, tags } : s)))
  const allTags = useMemo(() => {
    const t = new Set()
    saved.forEach((s) => (s.tags || []).forEach((x) => t.add(x)))
    return [...t].sort()
  }, [saved])

  // Búsqueda en el catálogo (server-side, con debounce).
  useEffect(() => {
    if (showSaved) return
    let alive = true
    setCat((c) => ({ ...c, loading: true }))
    const t = setTimeout(() => {
      fetch(`/api/catalog?q=${encodeURIComponent(q)}&source=${section}&topic=${topic}&page=${page}&size=60`)
        .then((r) => r.json())
        .then((d) => { if (alive) setCat({ total: d.total, items: d.items, loading: false }) })
        .catch(() => { if (alive) setCat({ total: 0, items: [], loading: false }) })
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [q, page, section, topic, showSaved])

  useEffect(() => { setPage(0) }, [q, section, topic, showSaved])

  const savedFiltered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return saved.filter((s) =>
      (!n || `${s.name} ${s.owner || ''} ${s.desc || ''} ${(s.tags || []).join(' ')}`.toLowerCase().includes(n)) &&
      (!tagFilter || (s.tags || []).includes(tagFilter)))
  }, [saved, q, tagFilter])

  const items = showSaved ? savedFiltered : cat.items
  const total = showSaved ? savedFiltered.length : cat.total
  const pages = showSaved ? 1 : Math.ceil(cat.total / 60)

  return (
    <div className="sk">
      <div className="sk-hero">
        <h2 className="sk-hero-title">El directorio de skills</h2>
        <p className="sk-hero-sub">
          Buscá entre {showSaved ? saved.length : '20.000+'} skills para agentes (ui-skills.com + skills.sh).
          Guardá las que te sirven en tu colección — se guardan en el proyecto.
        </p>
      </div>

      <div className="sk-controls">
        <div className="sk-bar">
          <div className="sk-search-wrap">
            <svg className="sk-search-ico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input className="sk-search" placeholder="Buscar en el catálogo…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button className="sk-search-x" aria-label="Limpiar" onClick={() => setQ('')}>×</button>}
          </div>
          <input className="sk-acct" placeholder="tu cuenta GitHub" value={account} onChange={(e) => setAccount(e.target.value)} title="Reescribe el owner del comando de install" />
          <button className={`sk-toggle${showSaved ? ' on' : ''}`} onClick={() => setShowSaved((v) => !v)}>
            {showSaved ? '★' : '☆'} Guardadas <b>{saved.length}</b>
          </button>
        </div>

        {!showSaved && (
          <div className="sk-sections">
            {SECTIONS.map((s) => (
              <button key={s.id} className={`sk-section${section === s.id ? ' on' : ''}`}
                style={s.id !== 'all' ? { '--src': (SOURCES[s.id] || {}).color } : undefined}
                onClick={() => setSection(s.id)}>
                {s.label}{counts[s.id] != null && <span className="sk-section-n">{fmt(counts[s.id])}</span>}
              </button>
            ))}
          </div>
        )}

        {!showSaved && (
          <div className="sk-pills">
            {TOPICS.map((t) => (
              <button key={t} className={`sk-pill${topic === t ? ' on' : ''}`} onClick={() => setTopic(t)}>{TOPIC_LABEL[t]}</button>
            ))}
          </div>
        )}

        {showSaved && allTags.length > 0 && (
          <div className="sk-tagbar">
            <button className={`sk-tag${!tagFilter ? ' on' : ''}`} onClick={() => setTagFilter(null)}>todas</button>
            {allTags.map((t) => (
              <button key={t} className={`sk-tag${tagFilter === t ? ' on' : ''}`} onClick={() => setTagFilter(tagFilter === t ? null : t)}>#{t}</button>
            ))}
          </div>
        )}

        <div className="sk-meta">
          {showSaved ? `${total} guardadas` : cat.loading ? 'Buscando…' : `${total.toLocaleString('es')} resultados`}
        </div>
      </div>

      {cat.loading && !showSaved ? (
        <div className="sk-grid">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="sk-skel" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="sk-empty">Nada por acá. Probá otra búsqueda o cambiá de sección.</div>
      ) : (
        <div className="sk-grid">
          {items.map((s) => (
            <article key={s.url} className="sk-card" onClick={() => setOpen(s)} title="Ver contenido">
              <button className={`sk-star${savedUrls.has(s.url) ? ' on' : ''}`} title={savedUrls.has(s.url) ? 'Quitar' : 'Guardar'} onClick={(e) => { e.stopPropagation(); toggleSave(s) }}>{savedUrls.has(s.url) ? '★' : '☆'}</button>
              <span className="sk-card-title">{s.name}</span>
              {s.desc && <p className="sk-card-desc">{s.desc}</p>}
              {(s.tags && s.tags.length > 0) && (
                <div className="sk-card-tags">{s.tags.map((t) => <span key={t} className="sk-tagchip">#{t}</span>)}</div>
              )}
              <div className="sk-card-topics">
                {topicsOf(s).map((t) => (
                  <button key={t} className="sk-topicchip" style={{ '--tc': TOPIC_COLOR[t] }}
                    onClick={(e) => { e.stopPropagation(); setShowSaved(false); setTopic(t) }}>{t}</button>
                ))}
              </div>
              <div className="sk-card-foot">
                <Avatar author={s.author} owner={s.owner} />
                <span className="sk-author">{s.owner || s.author || '—'}</span>
                {sourceOf(s) && <span className="sk-src" style={{ '--src': sourceOf(s).color }}>{sourceOf(s).label}</span>}
                {s.url && <a className="sk-ext" href={s.url} target="_blank" rel="noreferrer" title="Ver en el sitio" onClick={(e) => e.stopPropagation()}>↗</a>}
              </div>
            </article>
          ))}
        </div>
      )}

      {!showSaved && pages > 1 && (
        <div className="sk-pager">
          <button className="sk-ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Anterior</button>
          <span className="sk-pager-info">Página {page + 1} de {pages.toLocaleString('es')}</span>
          <button className="sk-ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
        </div>
      )}

      {open && (
        <SkillDrawer
          skill={open}
          account={account}
          saved={savedUrls.has(open.url)}
          tags={(saved.find((s) => s.url === open.url) || {}).tags || []}
          onToggleSave={() => toggleSave(open)}
          onSetTags={(t) => setTags(open.url, t)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function InstallBox ({ cmd }) {
  const [copied, setCopied] = useState(false)
  const copy = () => navigator.clipboard?.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) }).catch(() => {})
  return (
    <div className="sk-install">
      <div className="sk-install-label">Install</div>
      <div className="sk-install-box">
        <code>{cmd}</code>
        <button className="sk-copy" onClick={copy} title="Copiar">{copied ? '✓' : '⧉'}</button>
      </div>
    </div>
  )
}

function TagEditor ({ tags, onSetTags }) {
  const [val, setVal] = useState('')
  const add = (e) => {
    e.preventDefault()
    const t = val.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')
    if (t && !tags.includes(t)) onSetTags([...tags, t])
    setVal('')
  }
  return (
    <div className="sk-tageditor">
      <span className="sk-tageditor-label">Tags</span>
      <div className="sk-tageditor-row">
        {tags.map((t) => (
          <span key={t} className="sk-tagchip on">#{t}<button onClick={() => onSetTags(tags.filter((x) => x !== t))}>×</button></span>
        ))}
        <form onSubmit={add} className="sk-tageditor-form">
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="+ tag" />
        </form>
      </div>
    </div>
  )
}

function SkillDrawer ({ skill, account, saved, tags, onToggleSave, onSetTags, onClose }) {
  const [content, setContent] = useState(null)
  const [err, setErr] = useState(false)
  const install = withAccount(skill.install, account)

  useEffect(() => {
    setContent(null); setErr(false)
    if (!skill.url) { setContent(skill.desc || '_Sin contenido._'); return }
    let alive = true
    fetch('/api/skill-content?url=' + encodeURIComponent(skill.url))
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (alive) setContent(d.content) })
      .catch(() => { if (alive) setErr(true) })
    return () => { alive = false }
  }, [skill])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sk-drawer-wrap" onClick={onClose}>
      <aside className="sk-drawer" onClick={(e) => e.stopPropagation()}>
        <header className="sk-drawer-head">
          <div className="sk-drawer-id">
            <Avatar author={skill.author} owner={skill.owner} size={30} />
            <div>
              <div className="sk-drawer-title">{skill.name}</div>
              <div className="sk-drawer-author">{skill.owner || skill.author}</div>
            </div>
          </div>
          <div className="sk-drawer-actions">
            <button className={`sk-toggle${saved ? ' on' : ''}`} onClick={onToggleSave}>{saved ? '★ Guardada' : '☆ Guardar'}</button>
            {skill.url && <a className="sk-ghost" href={skill.url} target="_blank" rel="noreferrer">sitio ↗</a>}
            <button className="sk-drawer-x" onClick={onClose} title="Cerrar (Esc)">×</button>
          </div>
        </header>
        <div className="sk-drawer-body">
          {install && <InstallBox cmd={install} />}
          {saved && <TagEditor tags={tags} onSetTags={onSetTags} />}
          {skill.desc && <p className="sk-drawer-desc">{skill.desc}</p>}
          {err ? <div className="sk-empty">No se pudo cargar el contenido.</div>
            : content == null ? <div className="sk-empty">Cargando contenido…</div>
              : <Markdown text={content} />}
        </div>
      </aside>
    </div>
  )
}
