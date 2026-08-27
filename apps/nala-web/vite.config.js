import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { createHmac, scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SKILLS_FILE = resolve(ROOT, 'data', 'skills.json')
const STUDY_FILE = resolve(ROOT, 'data', 'study.json')
const CONTENT_FILE = resolve(ROOT, 'data', 'ui-skills-content.json')
const CATALOG_FILE = resolve(ROOT, 'data', 'skills-catalog.json')
const REPO_ROOT = resolve(ROOT, '..', '..')   // raíz del repo nala
const slugify = (s) => (s || 'skill').toLowerCase().replace(/·/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'skill'

// -------- auth local (usuarios en data/users.json, scrypt + token HMAC) --------
const USERS_FILE = resolve(ROOT, 'data', 'users.json')
const AUTH_SECRET = 'nala-local-auth-v1'   // local; para prod usar una env var
const b64 = (s) => Buffer.from(s).toString('base64url')
const unb64 = (s) => { try { return Buffer.from(s, 'base64url').toString('utf8') } catch { return '' } }
const hashPw = (pw, salt) => scryptSync(String(pw), salt, 32).toString('hex')
const sign = (email) => createHmac('sha256', AUTH_SECRET).update(email).digest('hex')
const makeToken = (email) => `${b64(email)}.${sign(email)}`
const verifyToken = (token) => {
  if (!token || !token.includes('.')) return null
  const [e, sig] = token.split('.')
  const email = unb64(e)
  if (!email) return null
  const expected = sign(email)
  try {
    if (sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return email
  } catch {}
  return null
}
const loadUsers = () => { try { return existsSync(USERS_FILE) ? JSON.parse(readFileSync(USERS_FILE, 'utf8')) : [] } catch { return [] } }
const saveUsers = (u) => { mkdirSync(dirname(USERS_FILE), { recursive: true }); writeFileSync(USERS_FILE, JSON.stringify(u, null, 2) + '\n') }
const readBody = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => { b += c }); req.on('end', () => { try { res(JSON.parse(b || '{}')) } catch { res({}) } }) })
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

// Temas: cada uno matchea por cualquiera de sus palabras clave sobre nombre+desc+url.
const TOPICS = {
  automation: ['automat', 'agent', 'workflow', 'pipeline', 'deploy', 'script', 'bot', 'scrape', 'cron', 'ci/cd'],
  ui: ['ui', 'component', 'button', 'modal', 'dropdown', 'card', 'layout', 'design system', 'tailwind', 'shadcn', 'css', 'toolbar'],
  ux: ['ux', 'usability', 'accessib', 'a11y', 'onboarding', 'feedback', 'interaction', 'user flow', 'copy'],
  frontend: ['frontend', 'react', 'vue', 'svelte', 'next', 'nuxt', 'astro', 'vite', 'typescript', 'javascript', 'tanstack'],
  design: ['design', 'visual', 'typograph', 'color', 'brand', 'aesthetic', 'figma', 'palette'],
  animation: ['animation', 'motion', 'transition', 'gsap', 'three', 'lottie', 'spring', 'framer', 'animate'],
  testing: ['test', 'tdd', 'vitest', 'jest', 'playwright', 'cypress', 'debug', ' qa'],
  ai: ['ai ', 'llm', 'agent', 'prompt', 'rag', 'claude', 'gpt', 'openai', 'anthropic', 'reasoning'],
  backend: ['backend', 'api', 'database', 'sql', 'prisma', 'node', 'server', 'auth', 'postgres'],
  mobile: ['mobile', 'ios', 'android', 'swift', 'react native', 'expo', 'flutter'],
  data: ['data', 'chart', 'dataviz', 'visualiz', 'analytics', 'graph', 'dashboard']
}

const unent = (s) => (s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&#x2F;/g, '/').replace(/&hellip;/g, '…')
const strip = (s) => unent((s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

// Contenido en vivo de una página del directorio (skills.sh o ui-skills.com).
async function fetchContent (url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } })
  if (!res.ok) return null
  let html = await res.text()
  if (url.includes('ui-skills.com')) {
    html = html.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
    let idx = 0, best = '', needle = '"content":[0,"'
    while ((idx = html.indexOf(needle, idx)) >= 0) {
      let j = idx + needle.length, raw = '', esc = false
      for (; j < html.length; j++) { const c = html[j]; if (esc) { raw += c; esc = false; continue } if (c === '\\') { raw += c; esc = true; continue } if (c === '"') break; raw += c }
      idx = j + 1
      let val = ''; try { val = JSON.parse('"' + raw + '"') } catch { val = raw }
      if (val.length > best.length) best = val
    }
    return best || null
  }
  // skills.sh: convertir el div prose a markdown
  const i = html.search(/<div class="prose prose-invert/)
  if (i < 0) return null
  let j = html.indexOf('>', i) + 1, depth = 1, start = j
  const re = /<\/?div\b[^>]*>/g; re.lastIndex = j; let m
  while ((m = re.exec(html))) { if (m[0].startsWith('</div')) { depth--; if (depth === 0) break } else depth++ }
  let h = html.slice(start, m ? m.index : undefined)
  h = h.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, c) => '\n```\n' + unent(c) + '\n```\n')
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => '\n# ' + strip(t) + '\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => '\n## ' + strip(t) + '\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => '\n### ' + strip(t) + '\n')
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_, t) => '\n#### ' + strip(t) + '\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => '- ' + strip(t) + '\n')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => '`' + strip(t) + '`')
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, t) => '**' + strip(t) + '**')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, u, t) => '[' + strip(t) + '](' + u + ')')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => '\n' + strip(t) + '\n')
    .replace(/<[^>]+>/g, '')
  return unent(h).replace(/\n{3,}/g, '\n\n').trim() || null
}

function skillsApi () {
  return {
    name: 'nala-skills-api',
    configureServer (server) {
      // -------- auth: register / login / me --------
      server.middlewares.use('/api/auth/register', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; res.end('{"error":"usar POST"}'); return }
        const { email, password } = await readBody(req)
        const mail = String(email || '').trim().toLowerCase()
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { res.statusCode = 400; res.end('{"error":"correo inválido"}'); return }
        if (String(password || '').length < 6) { res.statusCode = 400; res.end('{"error":"la contraseña necesita 6+ caracteres"}'); return }
        const users = loadUsers()
        if (users.some((u) => u.email === mail)) { res.statusCode = 409; res.end('{"error":"ese correo ya está registrado"}'); return }
        const salt = randomBytes(16).toString('hex')
        users.push({ email: mail, salt, hash: hashPw(password, salt), createdAt: new Date().toISOString() })
        saveUsers(users)
        res.end(JSON.stringify({ token: makeToken(mail), user: { email: mail } }))
      })

      server.middlewares.use('/api/auth/login', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; res.end('{"error":"usar POST"}'); return }
        const { email, password } = await readBody(req)
        const mail = String(email || '').trim().toLowerCase()
        const user = loadUsers().find((u) => u.email === mail)
        const ok = user && hashPw(password, user.salt) === user.hash
        if (!ok) { res.statusCode = 401; res.end('{"error":"correo o contraseña incorrectos"}'); return }
        res.end(JSON.stringify({ token: makeToken(mail), user: { email: mail } }))
      })

      server.middlewares.use('/api/auth/me', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || new URL(req.url, 'http://x').searchParams.get('token')
        const email = verifyToken(token)
        if (!email) { res.statusCode = 401; res.end('{"error":"no autenticado"}'); return }
        res.end(JSON.stringify({ user: { email } }))
      })

      // -------- persistencia de las skills del usuario (data/skills.json) --------
      server.middlewares.use('/api/skills', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          try { res.end(existsSync(SKILLS_FILE) ? readFileSync(SKILLS_FILE, 'utf8') : '[]') } catch { res.end('[]') }
          return
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          let body = ''
          req.on('data', (c) => { body += c })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '[]')
              if (!Array.isArray(data)) throw new Error('se esperaba un array')
              mkdirSync(dirname(SKILLS_FILE), { recursive: true })
              writeFileSync(SKILLS_FILE, JSON.stringify(data, null, 2) + '\n')
              res.statusCode = 204; res.end()
            } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
          })
          return
        }
        res.statusCode = 405; res.end('{"error":"método no soportado"}')
      })

      // -------- base de estudio (data/study.json) --------
      server.middlewares.use('/api/study', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          try { res.end(existsSync(STUDY_FILE) ? readFileSync(STUDY_FILE, 'utf8') : '[]') } catch { res.end('[]') }
          return
        }
        if (req.method === 'PUT' || req.method === 'POST') {
          let body = ''
          req.on('data', (c) => { body += c })
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '[]')
              if (!Array.isArray(data)) throw new Error('se esperaba un array')
              mkdirSync(dirname(STUDY_FILE), { recursive: true })
              writeFileSync(STUDY_FILE, JSON.stringify(data, null, 2) + '\n')
              res.statusCode = 204; res.end()
            } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
          })
          return
        }
        res.statusCode = 405; res.end('{"error":"método no soportado"}')
      })

      // -------- catálogo completo con búsqueda + paginado (server-side) --------
      let catalog = null
      server.middlewares.use('/api/catalog', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          if (!catalog) catalog = existsSync(CATALOG_FILE) ? JSON.parse(readFileSync(CATALOG_FILE, 'utf8')) : []
          const p = new URL(req.url, 'http://x').searchParams
          const q = (p.get('q') || '').trim().toLowerCase()
          const source = (p.get('source') || '').trim()
          const topic = (p.get('topic') || '').trim()
          const page = Math.max(0, parseInt(p.get('page') || '0', 10))
          const size = Math.min(120, Math.max(1, parseInt(p.get('size') || '60', 10)))
          let items = catalog
          if (source && source !== 'all') items = items.filter((s) => s.source === source)
          if (topic && topic !== 'all' && TOPICS[topic]) {
            const kws = TOPICS[topic]
            items = items.filter((s) => {
              const hay = `${s.name} ${s.desc || ''} ${s.url}`.toLowerCase()
              return kws.some((k) => hay.includes(k))
            })
          }
          if (q) {
            const qh = q.replace(/\s+/g, '-')   // "typescript magician" -> matchea el slug
            items = items.filter((s) =>
              s.name.toLowerCase().includes(q) || (s.owner || '').toLowerCase().includes(q) ||
              (s.desc || '').toLowerCase().includes(q) || s.url.toLowerCase().includes(q) || s.url.toLowerCase().includes(qh))
          }
          const total = items.length
          res.end(JSON.stringify({ total, page, size, items: items.slice(page * size, page * size + size) }))
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
      })

      // -------- conteos por fuente (para las secciones) --------
      server.middlewares.use('/api/catalog-counts', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          if (!catalog) catalog = existsSync(CATALOG_FILE) ? JSON.parse(readFileSync(CATALOG_FILE, 'utf8')) : []
          const by = { all: catalog.length }
          for (const s of catalog) { const k = s.source || 'github'; by[k] = (by[k] || 0) + 1 }
          res.end(JSON.stringify(by))
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
      })

      // -------- instalar una skill en .claude/skills (para Claude Code) --------
      let contentCache = null
      server.middlewares.use('/api/install', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        if (req.method !== 'POST') { res.statusCode = 405; res.end('{"error":"usar POST"}'); return }
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', async () => {
          try {
            const { url, name, target } = JSON.parse(body || '{}')
            if (!url) { res.statusCode = 400; res.end('{"error":"falta url"}'); return }
            if (!contentCache) contentCache = existsSync(CONTENT_FILE) ? JSON.parse(readFileSync(CONTENT_FILE, 'utf8')) : {}
            let content = contentCache[url]
            if (!content && /^https:\/\/www\.(skills\.sh|ui-skills\.com)\//.test(url)) {
              content = await fetchContent(url); if (content) contentCache[url] = content
            }
            if (!content) { res.statusCode = 404; res.end('{"error":"sin contenido para instalar"}'); return }
            const base = target === 'global' ? homedir() : REPO_ROOT
            const slug = slugify(name || url.split('/').pop())
            const dir = join(base, '.claude', 'skills', slug)
            mkdirSync(dir, { recursive: true })
            const file = join(dir, 'SKILL.md')
            // Asegura frontmatter con name/description para que Claude la liste.
            let out = content
            if (!/^---\n/.test(out)) out = `---\nname: ${slug}\ndescription: ${(name || slug)}\n---\n\n` + out
            writeFileSync(file, out)
            res.end(JSON.stringify({ ok: true, path: file, dir, scope: target === 'global' ? 'global' : 'proyecto' }))
          } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
        })
      })

      // -------- contenido por url; si no está cacheado, lo trae en vivo --------
      server.middlewares.use('/api/skill-content', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        try {
          if (!contentCache) contentCache = existsSync(CONTENT_FILE) ? JSON.parse(readFileSync(CONTENT_FILE, 'utf8')) : {}
          const url = new URL(req.url, 'http://x').searchParams.get('url')
          if (!url) { res.statusCode = 400; res.end('{"error":"falta url"}'); return }
          let content = contentCache[url]
          if (!content && /^https:\/\/www\.(skills\.sh|ui-skills\.com)\//.test(url)) {
            content = await fetchContent(url)
            if (content) { contentCache[url] = content }  // cachea en memoria
          }
          if (!content) { res.statusCode = 404; res.end('{"error":"sin contenido"}'); return }
          res.end(JSON.stringify({ content }))
        } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: String(e && e.message || e) })) }
      })
    }
  }
}

// El engine (canvas) y los assets se reusan por symlink desde el proyecto
// Electron. preserveSymlinks mantiene las rutas dentro del app.
export default defineConfig({
  plugins: [react(), skillsApi()],
  resolve: { preserveSymlinks: true },
  server: { fs: { allow: ['..', '../..'] }, host: true }
})
