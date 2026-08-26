// Avatares procedurales por autor, usando el motor de bible-strong-avatar-lab
// (packages/avatar-core, vendorizado en ../vendor/avatar-core). AGPL-3.0.
// Generamos una definición determinista a partir de un seed (el handle del
// autor) y la renderizamos al pose neutro (SVG estático, sin animación).
import { renderAvatarDefinition } from '../vendor/avatar-core/scene'
import { surfacePresets } from '../vendor/avatar-core/surfaces'

const SURFACES = ['sphere', 'mickey', 'cube', 'capsule', 'cylinder', 'cone', 'diamond']
const BODY_COLORS = [
  '#5b7fe5', '#4361ee', '#2fbf71', '#12a5b0', '#a06cff', '#d94f8a',
  '#e05343', '#f4a340', '#e0803a', '#3aa76d', '#8a63d2', '#f2b705'
]

// FNV-1a: hash estable por string.
function fnv (s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export function seededDefinition (seed) {
  const s = seed || '?'
  const n = fnv(s)
  const type = SURFACES[n % SURFACES.length]
  const preset = surfacePresets[type]
  const body = BODY_COLORS[(n >>> 3) % BODY_COLORS.length]
  const eye = {
    width: 17 + ((n >>> 5) % 8),      // 17..24
    height: 40 + ((n >>> 8) % 20),    // 40..59
    x: 0, y: -7, angle: 0
  }
  const spacing = 30 + ((n >>> 12) % 22)  // 30..51
  return {
    schema: 'bible-strong/avatar-definition',
    schemaVersion: 1,
    name: s,
    body: { primary: { ...preset }, nodes: [] },
    colors: { body, eyes: '#141518' },
    expressions: {
      neutral: {
        head: { x: 0, y: 0, z: 0 },
        eyes: { left: { ...eye }, right: { ...eye }, spacing },
        perspective: 1,
        motion: { eyes: 'none', body: 'none' }
      }
    }
  }
}

// Cache: la geometría se calcula una sola vez por seed.
const cache = new Map()
export function seededScene (seed) {
  const key = seed || '?'
  let scene = cache.get(key)
  if (!scene) {
    try { scene = renderAvatarDefinition(seededDefinition(key)) } catch (_) { scene = null }
    cache.set(key, scene)
  }
  return scene
}
