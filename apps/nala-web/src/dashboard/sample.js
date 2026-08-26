// Datos de ejemplo para ver el layout sin servidor. Cuando config/servidor.json
// tenga apiUrl+token, Dashboard intenta el fetch real y esto queda de respaldo.

const PROJECTS = ['nala', 'erp', 'realtes', 'relay', 'cockpit', 'camibot']

function pad (n) { return String(n).padStart(2, '0') }

// Un heatmap determinista de 20 semanas (140 dias) terminando hoy.
export function sampleHeatmap () {
  const map = {}
  const today = new Date()
  for (let i = 0; i < 140; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    // patron pseudo-aleatorio pero estable por fecha
    const seed = (d.getDate() * 7 + d.getMonth() * 13) % 11
    const count = seed > 7 ? seed - 6 : (seed > 4 ? 1 : 0)
    if (count > 0) map[key] = count
  }
  return map
}

export function sampleEntries () {
  const today = new Date()
  const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const msgs = [
    ['nala', 'needs: acelerar decaimiento para que la conducta se note'],
    ['nala', 'debug: panel overlay con estado + pointer + cooldowns'],
    ['nala', 'web: la gata reacciona mas al mouse (solo navegador)'],
    ['erp', 'facturacion: redondeo de IVA en notas de credito'],
    ['relay', 'ws: reconexion con backoff exponencial']
  ]
  return msgs.map(([proyecto, mensaje], i) => ({
    fecha: key,
    hora: `${pad(9 + i * 2)}:${pad((i * 17) % 60)}`,
    proyecto,
    mensaje,
    hash: `abc${i}00`
  }))
}

export function sampleData () {
  const heatmap = sampleHeatmap()
  const totalEntries = Object.values(heatmap).reduce((a, b) => a + b, 0)
  const activeDays = Object.keys(heatmap).length
  return {
    entries: sampleEntries(),
    stats: { totalEntries, activeDays, streak: 6, heatmap },
    reports: {
      byProject: PROJECTS.map((p, i) => ({ proyecto: p, count: 24 - i * 3 })),
      byHour: { manana: 22, tarde: 51, noche: 27 }
    }
  }
}
