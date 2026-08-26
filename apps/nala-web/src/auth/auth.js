// Auth del cliente: guarda token + usuario en localStorage y habla con el
// dev-server (/api/auth/*). Sencillo, para uso local.
const KEY = 'nala-auth'

export function currentUser () {
  try { return JSON.parse(localStorage.getItem(KEY))?.user || null } catch (_) { return null }
}
export function token () {
  try { return JSON.parse(localStorage.getItem(KEY))?.token || null } catch (_) { return null }
}
export function isAuthed () { return !!token() }

function persist (data) { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch (_) {} }

async function post (path, body) {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) return { error: data.error || 'error del servidor' }
    persist({ token: data.token, user: data.user })
    return { ok: true, user: data.user }
  } catch (_) {
    return { error: 'no se pudo conectar' }
  }
}

export const login = (email, password) => post('/api/auth/login', { email, password })
export const register = (email, password) => post('/api/auth/register', { email, password })
export function logout () { try { localStorage.removeItem(KEY) } catch (_) {} }
