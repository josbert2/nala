import { useEffect, useMemo, useState } from 'react'
import './dashboard.css'
import { sampleData } from './sample.js'
import Skills from './Skills.jsx'
import Study from './Study.jsx'
import NalaStage from '../NalaStage.jsx'
import { currentUser, logout } from '../auth/auth.js'

// Icono de linea reutilizable (viewBox 24, stroke currentColor).
const Icon = ({ d, size = 16 }) => (
  <svg className="ds-ico" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
)
const ICON = {
  home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>,
  chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M21 20H3" /></>,
  plan: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16" /><path d="M9 4v16" /></>,
  apps: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  pin: <><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3H7l3-3-1-6Z" /></>,
  cat: <><path d="M4 5l3 3M20 5l-3 3" /><path d="M5 8c0 6 3 11 7 11s7-5 7-11" /><circle cx="9.5" cy="12" r=".8" fill="currentColor" /><circle cx="14.5" cy="12" r=".8" fill="currentColor" /></>,
  skill: <><path d="m12 3 2.5 5.2 5.5.8-4 3.9.9 5.6L12 21l-4.9 2.5.9-5.6-4-3.9 5.5-.8Z" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M19 17H6a2 2 0 0 0-2 2" /></>
}

const NAV = [
  { id: 'diario', label: 'Home', icon: ICON.home },
  { id: 'reportes', label: 'Analytics', icon: ICON.chart },
  { id: 'skills', label: 'Skills', icon: ICON.skill },
  { id: 'estudio', label: 'Estudio', icon: ICON.book },
  { id: 'proyectos', label: 'Apps', icon: ICON.apps }
]

// Tools: iconos de cuadradito con gradiente, como en la referencia.
const TOOLS = [
  { id: 'tablero', label: 'Tablero', from: '#ff7a59', to: '#ff4d6d' },
  { id: 'sprites', label: 'Sprites', from: '#4cc9f0', to: '#4361ee' },
  { id: 'compartir', label: 'Compartir', from: '#2fbf71', to: '#12a150' },
  { id: 'flujo', label: 'Flujo', from: '#a06cff', to: '#7b2ff7' }
]

function meses (heatmap) {
  // Convierte el mapa fecha->count a una grilla de 20 semanas x 7 dias.
  const days = Object.keys(heatmap)
  const max = 20 * 7
  const today = new Date()
  const cells = []
  for (let i = max - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    cells.push({ key, count: heatmap[key] || 0 })
  }
  return cells
}

// Lee el estado vivo del engine (lo expone main.js en /web). ~2 Hz alcanza.
function useNalaLive () {
  const [live, setLive] = useState(null)
  useEffect(() => {
    let alive = true
    const tick = () => { if (alive) setLive(window.__nalaDebug ? window.__nalaDebug() : null) }
    const id = setInterval(tick, 500)
    tick()
    return () => { alive = false; clearInterval(id) }
  }, [])
  return live
}

// Manda un comando al engine (mismo canal que el drawer de animaciones).
function tell (cmd) { if (window.nala && window.nala.sendCommand) window.nala.sendCommand(cmd) }

const ACTIONS = [
  { label: 'Que venga', cmd: { type: 'come' } },
  { label: 'Comida', cmd: { type: 'feed' } },
  { label: 'Agua', cmd: { type: 'water' } },
  { label: 'Alzada', cmd: { type: 'anim', name: 'rear', hold: 4000 } },
  { label: 'Dormir', cmd: { type: 'sleep' } }
]

// Ruteo real del dashboard: cada vista tiene su slug bajo /dashboard.
const VIEW_TO_SLUG = { diario: '', reportes: 'analytics', skills: 'skills', estudio: 'estudio', proyectos: 'apps', tablero: 'tablero', sprites: 'sprites', compartir: 'compartir' }
const SLUG_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_SLUG).map(([v, s]) => [s, v]))
const viewFromPath = () => {
  const seg = window.location.pathname.replace(/^\/dashboard\/?/, '').split('/')[0]
  return SLUG_TO_VIEW[seg] || 'diario'
}

export default function Dashboard ({ onClose }) {
  const [view, setViewState] = useState(viewFromPath)
  const [data, setData] = useState(() => sampleData())
  const live = useNalaLive()

  // Navegación con URL real (History API), sin recargar.
  const go = (id) => {
    const slug = VIEW_TO_SLUG[id] || ''
    const path = '/dashboard' + (slug ? '/' + slug : '')
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setViewState(id)
  }
  useEffect(() => {
    const onPop = () => setViewState(viewFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Intenta datos reales; si no hay servidor, se queda con los de ejemplo.
  useEffect(() => {
    let alive = true
    fetch('/config/servidor.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (cfg) => {
        if (!cfg || !cfg.apiUrl) return
        const h = { Authorization: `Bearer ${cfg.apiToken}` }
        const [ents, stats, reports] = await Promise.all([
          fetch(`${cfg.apiUrl}/api/entries`, { headers: h }).then((r) => r.json()),
          fetch(`${cfg.apiUrl}/api/stats`, { headers: h }).then((r) => r.json()),
          fetch(`${cfg.apiUrl}/api/reports`, { headers: h }).then((r) => r.json())
        ])
        if (alive) setData({ entries: ents.entries || ents, stats, reports })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const cells = useMemo(() => meses(data.stats.heatmap || {}), [data])
  const maxCount = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells])
  const navLabel = (PAGE[view] || ['Home'])[0]

  return (
    <div className="ds">
      {/* ---------------------------------------------------------- sidebar */}
      <aside className="ds-side">
        <div className="ds-brand">
          <span className="ds-brand-badge" />
          <span className="ds-brand-name">Nala</span>
          <Icon d={<path d="m6 9 6 6 6-6" />} size={14} />
          <button className="ds-brand-panel" onClick={onClose} title="Volver a la gata">
            <Icon d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>} size={15} />
          </button>
        </div>

        <button className="ds-search">
          <Icon d={ICON.search} size={14} />
          <span>Quick actions</span>
          <kbd>K</kbd>
        </button>

        <nav className="ds-nav">
          {NAV.map((n) => (
            <button key={n.id} className={`ds-nav-item${view === n.id ? ' active' : ''}`} onClick={() => go(n.id)}>
              <Icon d={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="ds-group">Tools</div>
        <nav className="ds-nav">
          {TOOLS.map((t) => (
            <button key={t.id} className={`ds-nav-item${view === t.id ? ' active' : ''}`}
              onClick={() => (t.id === 'flujo' ? (window.location.href = '/flow') : go(t.id))}>
              <span className="ds-tool-ico" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="ds-group">Pinned</div>
        <nav className="ds-nav">
          <button className="ds-nav-item" onClick={() => tell({ type: 'anim', name: 'rear', hold: 4000 })}>
            <Icon d={ICON.pin} /><span>Alzar la gata</span>
          </button>
          <button className="ds-nav-item" onClick={() => tell({ type: 'come' })}>
            <Icon d={ICON.cat} /><span>Que venga</span>
          </button>
        </nav>

        <div className="ds-group">Chat</div>
        <nav className="ds-nav ds-chat">
          {data.entries.slice(0, 4).map((e, i) => (
            <button key={i} className="ds-nav-item ds-chat-item"><span>{e.mensaje}</span></button>
          ))}
        </nav>

        <div className="ds-side-bottom">
          <div className="ds-account">
            <span className="ds-account-mail">{currentUser()?.email || 'invitado'}</span>
            <button className="ds-logout" onClick={() => { logout(); window.location.href = '/login' }}>Salir</button>
          </div>
          <div className="ds-plan">
            <span className="ds-plan-left"><Icon d={ICON.plan} size={14} /> 14 días</span>
            <button className="ds-upgrade">Upgrade</button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------- main */}
      <main className="ds-main">
        <header className="ds-crumb">
          <Icon d={ICON.apps} size={15} />
          <span className="ds-crumb-muted">Diario</span>
          <span className="ds-crumb-sep">/</span>
          <span>{navLabel}</span>
        </header>

        <div className="ds-body">
          {view !== 'skills' && <PageHead view={view} />}
          {view === 'skills' ? (
            <Skills />
          ) : view === 'estudio' ? (
            <Study />
          ) : view === 'reportes' ? (
            <><NalaLive live={live} /><Reportes data={data} /></>
          ) : view === 'proyectos' ? (
            <><NalaLive live={live} /><Proyectos data={data} /></>
          ) : view === 'diario' ? (
            <><NalaLive live={live} /><Diario data={data} cells={cells} maxCount={maxCount} /></>
          ) : (
            <div className="ds-soon">Próximamente.</div>
          )}
        </div>
      </main>

      {/* La gata recorre el dashboard por encima; el canvas no bloquea la UI. */}
      <div className="ds-pet"><NalaStage /></div>
    </div>
  )
}

const PAGE = {
  diario: ['Home', 'Tu actividad de desarrollo y Nala en vivo'],
  reportes: ['Analytics', 'Commits por proyecto y horarios más activos'],
  proyectos: ['Apps', 'Los proyectos que seguís'],
  skills: ['Skills', 'Tu stack, guardado en el proyecto'],
  estudio: ['Estudio', 'Tu base de lo que estás aprendiendo'],
  tablero: ['Tablero', 'Próximamente'],
  sprites: ['Sprites', 'Próximamente'],
  compartir: ['Compartir', 'Próximamente']
}
function PageHead ({ view }) {
  const [title, sub] = PAGE[view] || PAGE.diario
  return (
    <div className="ds-page-head">
      <h1 className="ds-page-title">{title}</h1>
      <p className="ds-page-sub">{sub}</p>
    </div>
  )
}

function Stat ({ n, label }) {
  return <div className="ds-stat"><b>{n}</b><span>{label}</span></div>
}

// Estado vivo de la gata + botones que le mandan comandos al engine.
function NalaLive ({ live }) {
  return (
    <div className="ds-live">
      <div className="ds-live-head">
        <span className="ds-live-badge" data-on={live ? '1' : '0'} />
        <b>Nala</b>
        <span className="ds-live-state">{live ? (live.label || 'tranquila') : 'conectando…'}</span>
        {live && <span className="ds-live-anim">mira {live.facing > 0 ? 'derecha' : 'izquierda'}</span>}
      </div>
      {live && (
        <div className="ds-live-needs">
          {live.needs.map((n) => (
            <span key={n.id} className="ds-live-need" title={n.label}>
              <span className="ds-live-need-track">
                <span className="ds-live-need-fill" data-low={n.value < 0.35 ? '1' : '0'} style={{ width: Math.round(n.value * 100) + '%' }} />
              </span>
              <em>{n.label}</em>
            </span>
          ))}
        </div>
      )}
      <div className="ds-live-actions">
        {ACTIONS.map((a) => (
          <button key={a.label} className="ds-act" onClick={() => tell(a.cmd)}>{a.label}</button>
        ))}
      </div>
    </div>
  )
}

function Diario ({ data, cells, maxCount }) {
  const s = data.stats
  return (
    <>
      <div className="ds-stats">
        <Stat n={s.totalEntries} label="ENTRADAS" />
        <Stat n={s.activeDays} label="DÍAS" />
        <Stat n={`🔥 ${s.streak}`} label="RACHA" />
      </div>

      <div className="ds-label">Actividad</div>
      <div className="ds-heat">
        {cells.map((c, i) => {
          const op = c.count ? Math.min(1, 0.35 + (c.count / maxCount) * 0.65) : 0
          return <span key={i} className="ds-heat-cell" title={`${c.key}: ${c.count}`}
            style={op ? { background: 'var(--ds-accent)', opacity: op } : undefined} />
        })}
      </div>

      <div className="ds-label">Hoy</div>
      <div className="ds-entries">
        {data.entries.map((e, i) => (
          <div key={i} className="ds-entry">
            <div className="ds-entry-meta">{e.hora} · <span className="ds-tag">{e.proyecto}</span></div>
            <div className="ds-entry-msg">{e.mensaje}</div>
          </div>
        ))}
      </div>
    </>
  )
}

function Reportes ({ data }) {
  const byProject = data.reports?.byProject || []
  const max = Math.max(1, ...byProject.map((p) => p.count))
  const h = data.reports?.byHour || { manana: 0, tarde: 0, noche: 0 }
  return (
    <>
      <div className="ds-label">Commits por proyecto</div>
      <div className="ds-bars">
        {byProject.map((p) => (
          <div key={p.proyecto} className="ds-bar-row">
            <span className="ds-bar-name">{p.proyecto}</span>
            <span className="ds-bar-track"><span className="ds-bar-fill" style={{ width: `${(p.count / max) * 100}%` }} /></span>
            <span className="ds-bar-num">{p.count}</span>
          </div>
        ))}
      </div>
      <div className="ds-label">Horarios</div>
      <div className="ds-hours">
        <div className="ds-hour"><b>🌅 {h.manana}%</b><span>mañana</span></div>
        <div className="ds-hour"><b>🌤️ {h.tarde}%</b><span>tarde</span></div>
        <div className="ds-hour"><b>🌙 {h.noche}%</b><span>noche</span></div>
      </div>
    </>
  )
}

function Proyectos ({ data }) {
  const byProject = data.reports?.byProject || []
  return (
    <>
      <div className="ds-label">Proyectos</div>
      <div className="ds-cards">
        {byProject.map((p) => (
          <div key={p.proyecto} className="ds-card">
            <span className="ds-card-dot" />
            <b>{p.proyecto}</b>
            <span className="ds-card-sub">{p.count} commits</span>
          </div>
        ))}
      </div>
    </>
  )
}
