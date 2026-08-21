'use strict'

const THEME_KEY = 'nala-diary-theme'

function applyTheme (theme) {
  document.body.dataset.theme = theme
  localStorage.setItem(THEME_KEY, theme)
}

function escapeHtml (s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
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
  el.innerHTML = ''
  const today = new Date()
  for (let i = 90; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const fecha = d.toISOString().slice(0, 10)
    const count = heatmap[fecha] || 0
    const cell = document.createElement('div')
    cell.className = 'heatmap-cell'
    cell.title = `${fecha}: ${count}`
    if (count > 0) {
      cell.style.background = 'var(--accent)'
      cell.style.opacity = String(Math.min(1, 0.35 + count * 0.2))
    }
    el.appendChild(cell)
  }
}

function renderEntries (entries) {
  const el = document.getElementById('entries')
  el.innerHTML = ''
  const sorted = [...entries].sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora))
  for (const e of sorted.slice(0, 50)) {
    const div = document.createElement('div')
    div.className = 'entry'
    const proyecto = e.proyecto ? e.proyecto.toUpperCase() : 'NOTA'
    div.innerHTML = `
      <div class="entry-meta">${e.hora} · ${escapeHtml(proyecto)}</div>
      <div class="entry-title">${escapeHtml(e.mensaje)}</div>
    `
    el.appendChild(div)
  }
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
  const today = new Date().toISOString().slice(0, 10)
  for (const d of reports.byDay) {
    const bar = document.createElement('div')
    bar.className = 'day-bar' + (d.fecha === today ? ' today' : '')
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
    const data = await window.diary.getData()
    showConnError(false)
    renderStats(data.stats)
    renderHeatmap(data.stats.heatmap)
    renderEntries(data.entries)
    renderReports(data.reports)
  } catch (err) {
    console.error('[diary] no pude cargar los datos:', err)
    showConnError(true)
  }
}

document.getElementById('themeToggle').addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark')
})

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById('tabDiario').classList.toggle('hidden', tab.dataset.tab !== 'diario')
    document.getElementById('tabReportes').classList.toggle('hidden', tab.dataset.tab !== 'reportes')
  })
})

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
  loadAndRender()
})

applyTheme(localStorage.getItem(THEME_KEY) || 'dark')
loadAndRender()
