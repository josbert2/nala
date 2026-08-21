'use strict'

const THEME_KEY = 'nala-diary-theme'
const HEATMAP_WEEKS = 20
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

let allEntries = []
let currentDate = null
let repoLinks = {}
let spritesLoaded = false
let spriteSourcesLoaded = false

const NOMBRES_SPRITE = {
  idle: 'respirando',
  sit: 'sentada',
  alert: 'alerta',
  walk: 'caminando',
  run: 'corriendo',
  sleep: 'dormida',
  loaf: 'echada (pan)',
  dig: 'escarbando',
  scratch: 'rascando el poste',
  groom: 'acicalandose',
  stretch: 'estirandose',
  fall: 'cayendo',
  climb: 'trepando',
  eat: 'comiendo',
  crouch: 'agazapada',
  stalk: 'acechando',
  rear: 'parada en dos patas',
  angry: 'enojada',
  rascarse: 'rascarse',
  blep: 'lengua afuera',
  frotar: 'frotar',
  olfatear: 'olfatear',
  sacudirse: 'sacudirse',
  amasar: 'amasar',
  startle: 'sobresaltada',
  yawn: 'bostezando',
  pounce: 'saltando (ataque)',
  play: 'jugando',
  slide: 'derrape'
}

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

function renderBoard (cards) {
  for (const columna of ['todo', 'doing', 'done']) {
    const el = document.querySelector(`.cards[data-columna="${columna}"]`)
    el.innerHTML = ''
    const delaColumna = cards.filter((c) => c.columna === columna).sort((a, b) => a.posicion - b.posicion)
    for (const c of delaColumna) {
      const div = document.createElement('div')
      div.className = 'card'
      div.draggable = true
      div.dataset.id = c.id
      div.innerHTML = `
        <span class="card-text">${escapeHtml(c.texto)}</span>
        <button class="card-delete" data-id="${c.id}" title="Borrar">×</button>
      `
      el.appendChild(div)
    }
  }
}

async function reloadBoard () {
  try {
    const cards = await window.diary.getCards()
    renderBoard(cards)
  } catch (err) {
    console.error('[diary] no pude cargar el tablero:', err)
  }
}

let selectedTaskId = null

function fmtDueDate (fechaLimite) {
  if (!fechaLimite) return null
  const hoy = todayUTC()
  const d = new Date(`${fechaLimite}T00:00:00Z`)
  const diffDays = Math.round((d - hoy) / 86400000)
  if (diffDays < 0) return { text: 'vencida', overdue: true }
  if (diffDays === 0) return { text: 'hoy', overdue: false }
  if (diffDays === 1) return { text: 'mañana', overdue: false }
  if (diffDays <= 6) return { text: `en ${diffDays} dias`, overdue: false }
  return { text: fechaLimite, overdue: false }
}

const PRIO_FLAG = { urgente: '⚑', alta: '⚑', media: '⚑', baja: '⚑' }
const ESTADO_PILL = {
  todo: '<span class="status-pill status-todo">PENDIENTE</span>',
  doing: '<span class="status-pill status-doing">EN CURSO</span>',
  done: '<span class="status-pill status-done">COMPLETADO</span>'
}

function renderTasks (tasks) {
  for (const estado of ['todo', 'doing', 'done']) {
    const delEstado = tasks.filter((t) => t.estado === estado).sort((a, b) => a.posicion - b.posicion)
    const el = document.querySelector(`.task-rows[data-estado="${estado}"]`)
    el.innerHTML = ''
    for (const t of delEstado) {
      const row = document.createElement('tr')
      row.className = t.id === selectedTaskId ? 'selected' : ''
      row.dataset.id = t.id
      const due = fmtDueDate(t.fechaLimite)
      row.innerHTML = `
        <td class="task-name-cell">
          <span class="task-name-icon${estado === 'done' ? ' estado-done' : ''}"></span>
          ${escapeHtml(t.titulo)}
        </td>
        <td class="task-due-cell${due && due.overdue ? ' overdue' : ''}">${due ? due.text : '—'}</td>
        <td><span class="prio-flag prio-${t.prioridad}">${PRIO_FLAG[t.prioridad]}</span></td>
        <td>${ESTADO_PILL[estado]}</td>
        <td class="comment-count-cell">💬</td>
      `
      el.appendChild(row)
    }
  }
  document.getElementById('countTodo').textContent = tasks.filter((t) => t.estado === 'todo').length
  document.getElementById('countDoing').textContent = tasks.filter((t) => t.estado === 'doing').length
  document.getElementById('countDone').textContent = tasks.filter((t) => t.estado === 'done').length
}

let currentProjectId = null

async function loadTasks () {
  if (!currentProjectId) return
  try {
    const tasks = await window.diary.getTasks(currentProjectId)
    renderTasks(tasks)
  } catch (err) {
    console.error('[diary] no pude cargar las tareas:', err)
  }
}

let loadedProjects = []

function updateBreadcrumb () {
  const p = loadedProjects.find((pr) => pr.id === currentProjectId)
  document.getElementById('proyectoBreadcrumbName').textContent = p ? p.nombre : '—'
}

function renderProjects (projects) {
  loadedProjects = projects
  const el = document.getElementById('projectSwitcher')
  el.innerHTML = ''
  for (const p of projects) {
    const pill = document.createElement('div')
    pill.className = 'project-pill' + (p.id === currentProjectId ? ' active' : '')
    pill.dataset.id = p.id
    pill.innerHTML = `
      <span class="project-pill-icon">☰</span>
      <span class="project-pill-name">${escapeHtml(p.nombre)}</span>
      <span class="project-pill-count">${p.taskCount}</span>
    `
    pill.addEventListener('click', () => selectProject(p.id))
    el.appendChild(pill)
  }
  updateBreadcrumb()
}

function selectProject (id) {
  currentProjectId = id
  closeTaskDetail()
  document.querySelectorAll('.project-pill').forEach((p) => p.classList.toggle('active', Number(p.dataset.id) === id))
  updateBreadcrumb()
  loadTasks()
}

async function loadProjects () {
  try {
    const projects = await window.diary.getProjects()
    if (!currentProjectId && projects.length) currentProjectId = projects[0].id
    renderProjects(projects)
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude cargar los proyectos:', err)
  }
}

function renderComments (comments) {
  const el = document.getElementById('taskComments')
  el.innerHTML = ''
  if (!comments.length) {
    el.innerHTML = '<div class="empty">Sin comentarios todavia.</div>'
    return
  }
  for (const c of comments) {
    const div = document.createElement('div')
    div.className = 'comment'
    div.innerHTML = `
      <div class="comment-meta">
        <span>${fmtShareDate(c.createdAt)}</span>
        <button class="comment-delete" data-id="${c.id}" title="Borrar">×</button>
      </div>
      <div class="comment-texto">${escapeHtml(c.texto)}</div>
    `
    el.appendChild(div)
  }
}

async function loadComments (taskId) {
  try {
    renderComments(await window.diary.getComments(taskId))
  } catch (err) {
    console.error('[diary] no pude cargar los comentarios:', err)
  }
}

async function openTaskDetail (id) {
  try {
    const task = await window.diary.getTask(id)
    selectedTaskId = task.id
    document.getElementById('taskTitulo').value = task.titulo
    document.getElementById('taskPrioridad').value = task.prioridad
    document.getElementById('taskEstado').value = task.estado
    document.getElementById('taskFecha').value = task.fechaLimite || ''
    document.getElementById('taskDescripcion').value = task.descripcion || ''
    document.getElementById('taskDetail').classList.remove('hidden')
    document.querySelectorAll('.task-rows tr').forEach((r) => r.classList.toggle('selected', Number(r.dataset.id) === id))
    loadComments(id)
  } catch (err) {
    console.error('[diary] no pude abrir la tarea:', err)
  }
}

function closeTaskDetail () {
  selectedTaskId = null
  document.getElementById('taskDetail').classList.add('hidden')
  document.querySelectorAll('.task-rows tr').forEach((r) => r.classList.remove('selected'))
}

async function saveSelectedTask (changes) {
  if (!selectedTaskId) return
  try {
    await window.diary.updateTask(selectedTaskId, changes)
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude guardar la tarea:', err)
  }
}

function isSpriteRowBlank (image, row, frames, cw, ch) {
  const off = document.createElement('canvas')
  off.width = frames * cw
  off.height = ch
  const octx = off.getContext('2d')
  octx.drawImage(image, 0, row * ch, frames * cw, ch, 0, 0, frames * cw, ch)
  const data = octx.getImageData(0, 0, frames * cw, ch).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) return false
  }
  return true
}

function animateSprite (canvas, image, a, cw, ch) {
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  const start = performance.now()

  function frame (now) {
    const elapsed = now - start
    let idx = Math.floor((elapsed / 1000) * a.fps)
    idx = a.loop
      ? ((idx % a.frames) + a.frames) % a.frames
      : Math.max(0, Math.min(idx, a.frames - 1))
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, idx * cw, a.row * ch, cw, ch, 0, 0, canvas.width, canvas.height)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

async function loadSpriteViewer () {
  if (spritesLoaded) return
  spritesLoaded = true
  const status = document.getElementById('spriteStatus')

  const jsonUrl = '../../../assets/sprites/v4/cat.json'
  const pngUrl = '../../../assets/sprites/v4/cat.png'
  const resolvedPath = new URL(pngUrl, document.baseURI).pathname
  document.getElementById('spritePath').textContent = `Leyendo de: ${resolvedPath}`

  try {
    const [meta, image] = await Promise.all([
      fetch(jsonUrl).then((r) => r.json()),
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = pngUrl
      })
    ])

    const cw = meta.cell[0]
    const ch = meta.cell[1]
    const grid = document.getElementById('spriteGrid')
    let mostradas = 0

    for (const [name, a] of Object.entries(meta.animations)) {
      if (isSpriteRowBlank(image, a.row, a.frames, cw, ch)) continue
      mostradas++

      const cell = document.createElement('div')
      cell.className = 'sprite-cell'

      const canvas = document.createElement('canvas')
      canvas.width = cw * 2
      canvas.height = ch * 2
      cell.appendChild(canvas)

      const label = document.createElement('div')
      label.className = 'sprite-name'
      label.textContent = NOMBRES_SPRITE[name] || name
      cell.appendChild(label)

      const info = document.createElement('div')
      info.className = 'sprite-meta'
      info.textContent = `${name} · ${a.frames} frames · ${a.fps}fps`
      cell.appendChild(info)

      grid.appendChild(cell)
      animateSprite(canvas, image, a, cw, ch)
    }

    status.textContent = `${mostradas} de ${Object.keys(meta.animations).length} animaciones tienen arte real`
  } catch (err) {
    console.error('[diary] no pude cargar los sprites:', err)
    status.textContent = 'No pude cargar los sprites.'
  }
}

async function loadSpriteSources () {
  if (spriteSourcesLoaded) return
  spriteSourcesLoaded = true
  const status = document.getElementById('spriteSourcesStatus')
  const grid = document.getElementById('spriteSourcesGrid')
  const baseUrl = '../../../sf-sprite-nala/'
  document.getElementById('spriteSourcesPath').textContent =
    `Leyendo de: ${new URL(baseUrl, document.baseURI).pathname}`

  try {
    const sources = await window.diary.getSpriteSources()
    if (!sources.length) {
      status.textContent = 'No hay carpetas en sf-sprite-nala/.'
      return
    }
    status.textContent = `${sources.length} carpetas`

    for (const { name, metadata } of sources) {
      const fw = metadata.frame_w || 256
      const fh = metadata.frame_h || 256
      const frames = metadata.frame_count || 1
      const fps = metadata.fps || 8
      const src = baseUrl + name.split('/').map(encodeURIComponent).join('/') + '/spritesheet.png'

      const cell = document.createElement('div')
      cell.className = 'sprite-cell'

      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      cell.appendChild(canvas)

      const label = document.createElement('div')
      label.className = 'sprite-name'
      label.textContent = name
      cell.appendChild(label)

      const info = document.createElement('div')
      info.className = 'sprite-meta'
      info.textContent = `${frames} frames · ${fps}fps`
      cell.appendChild(info)

      grid.appendChild(cell)

      const img = new Image()
      img.onload = () => animateSprite(canvas, img, { row: 0, frames, fps, loop: true }, fw, fh)
      img.onerror = () => { info.textContent += ' · no cargo la imagen' }
      img.src = src
    }
  } catch (err) {
    console.error('[diary] no pude cargar sf-sprite-nala:', err)
    status.textContent = 'No pude leer sf-sprite-nala/.'
  }
}

let pickedFilePath = null

function fmtShareDate (createdAt) {
  // createdAt viene 'YYYY-MM-DD HH:MM:SS' de MySQL.
  return createdAt.replace(' ', ' · ').slice(0, 19)
}

async function renderShares (shares) {
  const el = document.getElementById('shares')
  el.innerHTML = ''
  if (!shares.length) {
    el.innerHTML = '<div class="empty">Todavia no compartiste nada.</div>'
    return
  }

  for (const s of shares) {
    const div = document.createElement('div')
    div.className = 'share'

    const meta = document.createElement('div')
    meta.className = 'share-meta'
    meta.innerHTML = `<span>${fmtShareDate(s.createdAt)} · ${s.tipo.toUpperCase()}</span>
      <button class="share-delete" data-id="${s.id}" title="Borrar">×</button>`
    div.appendChild(meta)

    if (s.texto) {
      const texto = document.createElement('div')
      texto.className = 'share-texto'
      texto.textContent = s.texto
      div.appendChild(texto)
    }

    if (s.filename) {
      const media = document.createElement('div')
      media.className = 'share-media'
      if (s.tipo === 'imagen') {
        const img = document.createElement('img')
        window.diary.getShareFile(s.id).then(({ mime, base64 }) => { img.src = `data:${mime};base64,${base64}` })
        media.appendChild(img)
      } else if (s.tipo === 'audio' || s.tipo === 'video') {
        const player = document.createElement(s.tipo === 'audio' ? 'audio' : 'video')
        player.controls = true
        const btn = document.createElement('button')
        btn.className = 'share-file-link'
        btn.textContent = `▶ cargar ${s.filename}`
        btn.addEventListener('click', async () => {
          const { mime, base64 } = await window.diary.getShareFile(s.id)
          player.src = `data:${mime};base64,${base64}`
          btn.remove()
          media.insertBefore(player, media.firstChild)
          player.play()
        })
        media.appendChild(btn)
      } else {
        const link = document.createElement('span')
        link.className = 'share-file-link'
        link.textContent = `⬇ descargar ${s.filename}`
        link.addEventListener('click', () => window.diary.saveShareFile(s.id, s.filename))
        media.appendChild(link)
      }
      div.appendChild(media)
    }

    el.appendChild(div)
  }
}

async function loadShares () {
  try {
    const shares = await window.diary.getShares()
    renderShares(shares)
  } catch (err) {
    console.error('[diary] no pude cargar lo compartido:', err)
  }
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
    reloadBoard()
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

const VIEWS = ['diario', 'tablero', 'reportes', 'sprites', 'compartir', 'proyectos']
document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item[data-view]').forEach((n) => n.classList.remove('active'))
    item.classList.add('active')
    for (const v of VIEWS) {
      document.getElementById(`view${v[0].toUpperCase()}${v.slice(1)}`).classList.toggle('hidden', item.dataset.view !== v)
    }
    if (item.dataset.view === 'sprites') { loadSpriteViewer(); loadSpriteSources() }
    if (item.dataset.view === 'compartir') loadShares()
    if (item.dataset.view === 'proyectos') loadProjects()
  })
})

document.querySelectorAll('.tab[data-spritetab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab[data-spritetab]').forEach((t) => t.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById('spriteTabProcesadas').classList.toggle('hidden', tab.dataset.spritetab !== 'procesadas')
    document.getElementById('spriteTabFuentes').classList.toggle('hidden', tab.dataset.spritetab !== 'fuentes')
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

document.querySelectorAll('.card-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector('input')
    const texto = input.value.trim()
    if (!texto) return
    try {
      await window.diary.createCard({ texto, columna: form.dataset.columna })
      input.value = ''
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude crear la tarjeta:', err)
    }
  })
})

document.querySelectorAll('.cards').forEach((col) => {
  col.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.card')
    if (!card) return
    e.dataTransfer.setData('text/plain', card.dataset.id)
    card.classList.add('dragging')
  })
  col.addEventListener('dragend', (e) => {
    const card = e.target.closest('.card')
    if (card) card.classList.remove('dragging')
  })
  col.addEventListener('dragover', (e) => {
    e.preventDefault()
    col.classList.add('drag-over')
  })
  col.addEventListener('dragleave', () => col.classList.remove('drag-over'))
  col.addEventListener('drop', async (e) => {
    e.preventDefault()
    col.classList.remove('drag-over')
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    const posicion = col.querySelectorAll('.card').length
    try {
      await window.diary.updateCard(id, { columna: col.dataset.columna, posicion })
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude mover la tarjeta:', err)
    }
  })
  col.addEventListener('click', async (e) => {
    const btn = e.target.closest('.card-delete')
    if (!btn) return
    try {
      await window.diary.deleteCard(btn.dataset.id)
      reloadBoard()
    } catch (err) {
      console.error('[diary] no pude borrar la tarjeta:', err)
    }
  })
})

function setPickedFile (filePath) {
  pickedFilePath = filePath
  document.getElementById('pickedFileName').textContent = filePath ? `Elegido: ${filePath.split('/').pop()}` : ''
}

const dropZone = document.getElementById('dropZone')
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over') })
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'))
dropZone.addEventListener('drop', (e) => {
  e.preventDefault()
  dropZone.classList.remove('drag-over')
  const file = e.dataTransfer.files[0]
  if (!file) return
  setPickedFile(window.diary.pathForFile(file))
})

document.getElementById('pickFileBtn').addEventListener('click', async () => {
  const filePath = await window.diary.pickShareFile()
  if (filePath) setPickedFile(filePath)
})

document.getElementById('shareForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('shareInput')
  const texto = input.value.trim()
  if (!texto && !pickedFilePath) return
  try {
    if (pickedFilePath) await window.diary.createShareFile(pickedFilePath, texto || null)
    else await window.diary.createShare(texto)
    input.value = ''
    setPickedFile(null)
    loadShares()
  } catch (err) {
    console.error('[diary] no pude compartir:', err)
  }
})

document.getElementById('shares').addEventListener('click', async (e) => {
  const btn = e.target.closest('.share-delete')
  if (!btn) return
  try {
    await window.diary.deleteShare(btn.dataset.id)
    loadShares()
  } catch (err) {
    console.error('[diary] no pude borrar lo compartido:', err)
  }
})

document.querySelectorAll('.task-form').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = form.querySelector('input')
    const titulo = input.value.trim()
    if (!titulo) return
    try {
      await window.diary.createTask({ proyectoId: currentProjectId, titulo, estado: form.dataset.estado })
      input.value = ''
      loadTasks()
      loadProjects()
    } catch (err) {
      console.error('[diary] no pude crear la tarea:', err)
    }
  })
})

document.getElementById('addProjectForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const input = document.getElementById('addProjectInput')
  const nombre = input.value.trim()
  if (!nombre) return
  try {
    const project = await window.diary.createProject(nombre)
    input.value = ''
    currentProjectId = project.id
    loadProjects()
  } catch (err) {
    console.error('[diary] no pude crear el proyecto:', err)
  }
})

document.getElementById('topAddTaskBtn').addEventListener('click', () => {
  document.querySelector('.add-task-row[data-estado="todo"] input').focus()
})

document.querySelectorAll('.task-rows').forEach((col) => {
  col.addEventListener('click', (e) => {
    const row = e.target.closest('tr')
    if (row) openTaskDetail(Number(row.dataset.id))
  })
})

document.querySelectorAll('.task-group-header').forEach((header) => {
  header.addEventListener('click', () => {
    header.closest('.task-group').classList.toggle('collapsed')
  })
})

document.getElementById('taskDetailClose').addEventListener('click', closeTaskDetail)

document.getElementById('taskTitulo').addEventListener('change', (e) => saveSelectedTask({ titulo: e.target.value.trim() }))
document.getElementById('taskPrioridad').addEventListener('change', (e) => saveSelectedTask({ prioridad: e.target.value }))
document.getElementById('taskEstado').addEventListener('change', (e) => saveSelectedTask({ estado: e.target.value }))
document.getElementById('taskFecha').addEventListener('change', (e) => saveSelectedTask({ fechaLimite: e.target.value || null }))
document.getElementById('taskDescripcion').addEventListener('change', (e) => saveSelectedTask({ descripcion: e.target.value }))

document.getElementById('taskDelete').addEventListener('click', async () => {
  if (!selectedTaskId) return
  try {
    await window.diary.deleteTask(selectedTaskId)
    closeTaskDetail()
    loadTasks()
  } catch (err) {
    console.error('[diary] no pude borrar la tarea:', err)
  }
})

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  if (!selectedTaskId) return
  const input = document.getElementById('commentInput')
  const texto = input.value.trim()
  if (!texto) return
  try {
    await window.diary.addComment(selectedTaskId, texto)
    input.value = ''
    loadComments(selectedTaskId)
  } catch (err) {
    console.error('[diary] no pude agregar el comentario:', err)
  }
})

document.getElementById('taskComments').addEventListener('click', async (e) => {
  const btn = e.target.closest('.comment-delete')
  if (!btn || !selectedTaskId) return
  try {
    await window.diary.deleteComment(selectedTaskId, btn.dataset.id)
    loadComments(selectedTaskId)
  } catch (err) {
    console.error('[diary] no pude borrar el comentario:', err)
  }
})

applyTheme(localStorage.getItem(THEME_KEY) || 'light')
loadAndRender()
