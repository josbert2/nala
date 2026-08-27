import { useEffect, useMemo, useState } from 'react'

const AREAS = ['Motion', 'Diseño', 'Frontend', 'Backend', '3D', 'IA', 'Otro']
const AREA_COLOR = { Motion: '#a06cff', Diseño: '#d94f8a', Frontend: '#4361ee', Backend: '#2fbf71', '3D': '#e0803a', IA: '#e05343', Otro: '#8b8983' }
const STATUS = ['activo', 'pausado', 'terminado']

const apiLoad = () => fetch('/api/study').then((r) => (r.ok ? r.json() : [])).catch(() => [])
const apiSave = (t) => fetch('/api/study', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }).catch(() => {})
const progress = (t) => (t.lessons && t.lessons.length ? Math.round(t.lessons.filter((l) => l.done).length / t.lessons.length * 100) : 0)
const colorOf = (t) => t.color || AREA_COLOR[t.area] || '#8b8983'

export default function Study () {
  const [topics, setTopics] = useState(null)
  const [saved, setSaved] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [name, setName] = useState('')
  const [area, setArea] = useState('Motion')
  const [adding, setAdding] = useState(false)

  useEffect(() => { apiLoad().then(setTopics) }, [])
  useEffect(() => {
    if (topics == null) return
    setSaved(false)
    const id = setTimeout(() => { apiSave(topics).then(() => setSaved(true)) }, 400)
    return () => clearTimeout(id)
  }, [topics])

  const patch = (id, up) => setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...up(t) } : t)))
  const add = (e) => {
    e.preventDefault()
    const n = name.trim(); if (!n) return
    setTopics((prev) => [{ id: 'st' + Date.now(), name: n, area, status: 'activo', notes: '', lessons: [], resources: [] }, ...prev])
    setName(''); setAdding(false)
  }
  const remove = (id) => setTopics((prev) => prev.filter((t) => t.id !== id))

  const active = useMemo(() => (topics || []).find((t) => t.id === activeId) || null, [topics, activeId])

  if (topics == null) return <div className="sk-loading">Cargando estudio…</div>

  if (active) return <TopicDetail t={active} patch={patch} onBack={() => setActiveId(null)} />

  return (
    <div className="st">
      <div className="sk-bar" style={{ marginBottom: 18 }}>
        <span className="sk-count">{topics.length} temas · {topics.reduce((a, t) => a + (t.lessons || []).length, 0)} lecciones</span>
        <span className={`sk-saved${saved ? ' ok' : ''}`}>{saved ? 'guardado' : 'guardando…'}</span>
        <button className="sk-ghost" onClick={() => setAdding((v) => !v)}>{adding ? 'Cancelar' : '+ Tema'}</button>
      </div>

      {adding && (
        <form className="sk-add-row" onSubmit={add}>
          <input className="sk-in" autoFocus placeholder="Qué estás estudiando…" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="sk-sel" value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="sk-add" type="submit">Agregar</button>
        </form>
      )}

      {topics.length === 0 ? (
        <div className="sk-empty">Todavía no hay nada. Agregá el primer tema que estés estudiando.</div>
      ) : (
        <div className="st-grid">
          {topics.map((t) => {
            const p = progress(t)
            return (
              <article key={t.id} className="st-card" style={{ '--pc': colorOf(t) }} onClick={() => setActiveId(t.id)}>
                <button className="sk-del" title="Borrar" onClick={(e) => { e.stopPropagation(); remove(t.id) }}>×</button>
                <div className="st-card-top">
                  <span className="st-area" style={{ '--pc': colorOf(t) }}>{t.area}</span>
                  <span className={`st-status st-${t.status}`}>{t.status}</span>
                </div>
                <h3 className="st-card-title">{t.name}</h3>
                <div className="st-progress"><span className="st-progress-fill" style={{ width: p + '%' }} /></div>
                <div className="st-card-meta">
                  <span>{(t.lessons || []).filter((l) => l.done).length}/{(t.lessons || []).length} lecciones</span>
                  <b>{p}%</b>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TopicDetail ({ t, patch, onBack }) {
  const [lesson, setLesson] = useState('')
  const [rTitle, setRTitle] = useState('')
  const [rUrl, setRUrl] = useState('')
  const p = progress(t)

  const toggleLesson = (i) => patch(t.id, (x) => ({ lessons: x.lessons.map((l, j) => (j === i ? { ...l, done: !l.done } : l)) }))
  const addLesson = (e) => { e.preventDefault(); const v = lesson.trim(); if (!v) return; patch(t.id, (x) => ({ lessons: [...x.lessons, { title: v, done: false }] })); setLesson('') }
  const delLesson = (i) => patch(t.id, (x) => ({ lessons: x.lessons.filter((_, j) => j !== i) }))
  const addRes = (e) => { e.preventDefault(); const ti = rTitle.trim(); if (!ti) return; patch(t.id, (x) => ({ resources: [...(x.resources || []), { title: ti, url: rUrl.trim() }] })); setRTitle(''); setRUrl('') }
  const delRes = (i) => patch(t.id, (x) => ({ resources: x.resources.filter((_, j) => j !== i) }))

  return (
    <div className="st-detail">
      <button className="sk-ghost st-back" onClick={onBack}>← Todos los temas</button>

      <div className="st-head" style={{ '--pc': colorOf(t) }}>
        <div>
          <div className="st-head-area"><span className="st-area" style={{ '--pc': colorOf(t) }}>{t.area}</span></div>
          <h2 className="st-head-title">{t.name}</h2>
        </div>
        <select className="sk-sel" value={t.status} onChange={(e) => patch(t.id, () => ({ status: e.target.value }))}>
          {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="st-progress st-progress-lg"><span className="st-progress-fill" style={{ width: p + '%' }} /></div>
      <div className="st-progress-num">{t.lessons.filter((l) => l.done).length}/{t.lessons.length} lecciones · {p}%</div>

      {t.route && (
        <div className="st-route">
          <div className="st-route-head">
            <span className="st-col-h" style={{ margin: 0 }}>Ruta de aprendizaje</span>
            <a className="sk-ghost" href={t.route} target="_blank" rel="noreferrer">Abrir en pantalla completa ↗</a>
          </div>
          <iframe className="st-route-frame" src={t.route} title="Ruta de aprendizaje" loading="lazy" />
        </div>
      )}

      <div className="st-cols">
        <section className="st-col">
          <div className="st-col-h">Lecciones</div>
          <ul className="st-lessons">
            {t.lessons.map((l, i) => (
              <li key={i} className={`st-lesson${l.done ? ' done' : ''}`}>
                <button className="st-check" onClick={() => toggleLesson(i)} aria-label="Marcar">{l.done ? '✓' : ''}</button>
                <span>{l.title}</span>
                <button className="st-lesson-x" onClick={() => delLesson(i)} aria-label="Borrar">×</button>
              </li>
            ))}
          </ul>
          <form className="st-add" onSubmit={addLesson}>
            <input placeholder="+ nueva lección" value={lesson} onChange={(e) => setLesson(e.target.value)} />
          </form>
        </section>

        <section className="st-col">
          <div className="st-col-h">Recursos</div>
          <ul className="st-res">
            {(t.resources || []).map((r, i) => (
              <li key={i} className="st-res-item">
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : <span>{r.title}</span>}
                <button className="st-lesson-x" onClick={() => delRes(i)} aria-label="Borrar">×</button>
              </li>
            ))}
          </ul>
          <form className="st-add st-add-res" onSubmit={addRes}>
            <input placeholder="título" value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
            <input placeholder="url (opcional)" value={rUrl} onChange={(e) => setRUrl(e.target.value)} />
          </form>

          <div className="st-col-h" style={{ marginTop: 18 }}>Notas</div>
          <textarea className="st-notes" placeholder="Tus notas…" value={t.notes || ''} onChange={(e) => patch(t.id, () => ({ notes: e.target.value }))} />
        </section>
      </div>
    </div>
  )
}
