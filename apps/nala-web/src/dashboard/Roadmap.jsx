import { AE_ROADMAP } from './roadmaps.js'

const ROADMAPS = { ae: AE_ROADMAP }

function Step ({ s, adv }) {
  return (
    <div className={`rm-kf${adv ? ' adv' : ''}`}>
      <span className="rm-kf-index">{s.n} · {s.tag}</span>
      <h3 className="rm-kf-title">{s.title}</h3>
      <p className="rm-kf-desc">{s.desc}</p>
      {s.micro && (
        <div className="rm-micro">
          <span className="rm-micro-title">{s.micro.title}</span>
          <ul>
            {s.micro.items.map(([b, t], i) => <li key={i}><b>{b}</b> — {t}</li>)}
          </ul>
          <span className="rm-micro-note">{s.micro.note}</span>
        </div>
      )}
      {s.course && <span className="rm-kf-course">→ {s.course}</span>}
    </div>
  )
}

export default function Roadmap ({ id = 'ae' }) {
  const r = ROADMAPS[id]
  if (!r) return null
  return (
    <div className="rm">
      <div className="rm-hero">
        <span className="rm-eyebrow"><span className="rm-dot" /> {r.eyebrow}</span>
        <h2 className="rm-title">{r.title}</h2>
        <p className="rm-lead">{r.lead}</p>
      </div>

      <section className="rm-sec">
        <div className="rm-sec-head"><h3>La ruta</h3><span className="rm-tag">8 etapas</span></div>
        <div className="rm-timeline">{r.steps.map((s) => <Step key={s.n} s={s} />)}</div>
      </section>

      <section className="rm-sec">
        <div className="rm-sec-head"><h3>Nivel avanzado</h3><span className="rm-tag amber">6 etapas</span></div>
        <p className="rm-sub">Lo que separa a alguien que “sabe After Effects” de alguien que cobra tarifas premium por motion branding.</p>
        <div className="rm-timeline adv">{r.advanced.map((s) => <Step key={s.n} s={s} adv />)}</div>
      </section>

      <section className="rm-sec">
        <div className="rm-sec-head"><h3>Canales de YouTube</h3><span className="rm-tag ok">gratis</span></div>
        <div className="rm-grid">
          {r.channels.map((c) => (
            <div key={c.name} className="rm-card">
              <span className="rm-kicker">{c.kicker}</span>
              <h4>{c.name}</h4><p>{c.desc}</p>
              <span className="rm-badge ok">gratis</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rm-sec">
        <div className="rm-sec-head"><h3>Cursos estructurados</h3><span className="rm-tag">pagos</span></div>
        <div className="rm-grid">
          {r.courses.map((c) => (
            <div key={c.name} className="rm-card">
              <span className={`rm-badge${/gratis/.test(c.badge) ? ' ok' : /avanzado/.test(c.badge) ? ' adv' : ' paid'}`}>{c.badge}</span>
              <h4>{c.name}</h4><p>{c.desc}</p>
              <span className="rm-link">{c.link}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rm-sec">
        <div className="rm-sec-head"><h3>Referencias de branding animado</h3><span className="rm-tag">estudia esto</span></div>
        <div className="rm-grid">
          {r.brands.map((b) => (
            <div key={b.key} className="rm-brand">
              <div className={`rm-visual rm-v-${b.key}`}>
                {b.key === 'bk' ? <><span className="rm-flame" /><span className="rm-flame" /><span className="rm-flame" /></>
                  : b.key === 'netflix' ? <><span className="rm-bar" /><span className="rm-bar" /><span className="rm-bar" /></>
                    : <span className="rm-shape" />}
              </div>
              <div className="rm-brand-body">
                <h4>{b.name}</h4><p>{b.desc}</p>
                <span className="rm-brand-search">buscar: {b.search}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rm-sec rm-sec-last">
        <div className="rm-sec-head"><h3>Comunidad y feedback</h3><span className="rm-tag">no aprendas solo</span></div>
        <div className="rm-grid">
          {r.community.map((c) => (
            <div key={c.name} className="rm-card">
              <span className="rm-kicker">{c.kicker}</span>
              <h4>{c.name}</h4><p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="rm-note"><b>// nota</b> — {r.note}</p>
    </div>
  )
}
