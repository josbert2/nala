'use strict'

const THEME_KEY = 'nala-diary-theme'
const HEATMAP_WEEKS = 20
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

let allEntries = []
let currentDate = null
let repoLinks = {}

function applyTheme (theme) {
  document.body.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

function escapeHtml (s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function todayUTC () {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

function isoDate (d) {
  return d.toISOString().slice(0, 10)
}

function shiftDate (fecha, delta) {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return isoDate(d)
}

function fmtDayLabel (fecha) {
  const d = new Date(`${fecha}T00:00:00Z`)
  const txt = `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`
  return fecha === isoDate(todayUTC()) ? `${txt} · HOY` : txt
}

function renderStats (stats) {
  document.getElementById('stats').innerHTML = `
    <div class="stat">${stats.totalEntries} ENTRADAS</div>
    <div class="stat">${stats.activeDays} DIAS</div>
    <div class="stat">🔥 ${stats.streak}</div>
  `
}

function renderHeatmap (heatmap) {
  const el = document.getElementById('heatmap')
  const monthsEl = document.getElementById('heatmapMonths')
  el.innerHTML = ''
  monthsEl.innerHTML = ''

  const today = todayUTC()
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - (HEATMAP_WEEKS * 7 - 1))
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  let lastMonth = -1
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const weekStart = new Date(start)
    weekStart.setUTCDate(weekStart.getUTCDate() + w * 7)
    const label = document.createElement('div')
    if (weekStart.getUTCMonth() !== lastMonth) {
      label.textContent = MESES[weekStart.getUTCMonth()].slice(0, 3)
      lastMonth = weekStart.getUTCMonth()
    }
    monthsEl.appendChild(label)
  }

  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const fecha = isoDate(d)
    const count = heatmap[fecha] || 0
    const cell = document.createElement('div')
    cell.className = 'heatmap-cell'
    cell.title = `${fecha}: ${count}`
    if (d > today) cell.style.visibility = 'hidden'
    else if (count > 0) {
      cell.style.background = 'var(--accent)'
      cell.style.opacity = String(Math.min(1, 0.35 + count * 0.2))
    }
    cell.addEventListener('click', () => { if (d <= today) selectDate(fecha) })
    el.appendChild(cell)
  }
}

function populateProjectFilter () {
  const sel = document.getElementById('projectFilter')
  const previo = sel.value
  const proyectos = [...new Set(allEntries.map((e) => e.proyecto).filter(Boolean))].sort()
  sel.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p.toUpperCase())}</option>`).join('')
  sel.value = proyectos.includes(previo) ? previo : ''
}

function renderEntries () {
  document.getElementById('dayLabel').textContent = fmtDayLabel(currentDate)
  document.getElementById('todayBtn').classList.toggle('hidden', currentDate === isoDate(todayUTC()))

  const proyectoFiltro = document.getElementById('projectFilter').value
  const el = document.getElementById('entries')
  el.innerHTML = ''

  const delDia = allEntries
    .filter((e) => e.fecha === currentDate && (!proyectoFiltro || e.proyecto === proyectoFiltro))
    .sort((a, b) => b.hora.localeCompare(a.hora))

  if (!delDia.length) {
    el.innerHTML = '<div class="empty">Sin entradas ese dia.</div>'
    return
  }

  for (const e of delDia) {
    const div = document.createElement('div')
    div.className = 'entry'
    const proyecto = e.proyecto ? e.proyecto.toUpperCase() : 'NOTA'
    const repoUrl = e.proyecto && repoLinks[e.proyecto]
    const link = repoUrl && e.hash
      ? `<button class="gh-link" data-url="${escapeHtml(repoUrl)}/commit/${escapeHtml(e.hash)}">Ver en GitHub</button>`
      : ''
    div.innerHTML = `
      <div class="entry-meta">${e.hora} · ${escapeHtml(proyecto)}${link}</div>
      <div class="entry-title">${escapeHtml(e.mensaje)}</div>
    `
    el.appendChild(div)
  }
}

function selectDate (fecha) {
  currentDate = fecha
  renderEntries()
}

function renderReports (reports) {
  document.getElementById('weeklySummary').textContent = reports.weeklySummary

  const byProjectEl = document.getElementById('byProject')
  byProjectEl.innerHTML = ''
  const maxCount = Math.max(1, ...reports.byProject.map((p) => p.count))
  for (const p of reports.byProject) {
    const row = document.createElement('div')
    row.className = 'bar-row'
    row.innerHTML = `
      <span class="bar-label">${escapeHtml(p.proyecto)}</span>
      <div class="bar" style="width:${Math.round((p.count / maxCount) * 100)}px"></div>
      <span>${p.count}</span>
    `
    byProjectEl.appendChild(row)
  }

  const byDayEl = document.getElementById('byDay')
  byDayEl.innerHTML = ''
  const maxDay = Math.max(1, ...reports.byDay.map((d) => d.count))
  const hoy = isoDate(todayUTC())
  for (const d of reports.byDay) {
    const bar = document.createElement('div')
    bar.className = 'day-bar' + (d.fecha === hoy ? ' today' : '')
    bar.style.height = `${Math.round((d.count / maxDay) * 100)}%`
    bar.title = `${d.fecha}: ${d.count}`
    byDayEl.appendChild(bar)
  }

  const total = reports.byHour.manana + reports.byHour.tarde + reports.byHour.noche
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  document.getElementById('byHour').innerHTML = `
    🌅 mañana ${pct(reports.byHour.manana)}%<br>
    🌤️ tarde ${pct(reports.byHour.tarde)}%<br>
    🌙 noche ${pct(reports.byHour.noche)}%
  `
}

function showConnError (show) {
  document.getElementById('connError').classList.toggle('hidden', !show)
}

async function loadAndRender () {
  try {
    const [data, links] = await Promise.all([window.diary.getData(), window.diary.getRepoLinks()])
    showConnError(false)
    allEntries = data.entries
    repoLinks = links
    if (!currentDate) currentDate = isoDate(todayUTC())
    renderStats(data.stats)
    renderHeatmap(data.stats.heatmap)
    populateProjectFilter()
    renderEntries()
    renderReports(data.reports)
  } catch (err) {
    console.error('[diary] no pude cargar los datos:', err)
    showConnError(true)
  }
}

document.getElementById('closeBtn').addEventListener('click', () => window.close())

document.getElementById('entries').addEventListener('click', (e) => {
  const btn = e.target.closest('.gh-link')
  if (btn) window.diary.openExternal(btn.dataset.url)
})

document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark')
})

document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-view]').forEach((n) => n.classList.remove('active'))
    item.classList.add('active')
    document.getElementById('viewDiario').classList.toggle('hidden', item.dataset.view !== 'diario')
    document.getElementById('viewReportes').classList.toggle('hidden', item.dataset.view !== 'reportes')
  })
})

document.getElementById('prevDay').addEventListener('click', () => selectDate(shiftDate(currentDate, -1)))
document.getElementById('nextDay').addEventListener('click', () => {
  const next = shiftDate(currentDate, 1)
  if (next <= isoDate(todayUTC())) selectDate(next)
})
document.getElementById('todayBtn').addEventListener('click', () => selectDate(isoDate(todayUTC())))
document.getElementById('projectFilter').addEventListener('change', renderEntries)

document.getElementById('noteForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('noteInput')
  const mensaje = input.value.trim()
  if (!mensaje) return
  try {
    await window.diary.addNote({ mensaje })
    input.value = ''
  } catch (err) {
    console.error('[diary] no pude guardar la nota:', err)
    showConnError(true)
    return
  }
  currentDate = isoDate(todayUTC())
  loadAndRender()
})

applyTheme(localStorage.getItem(THEME_KEY) || 'light')
loadAndRender()
