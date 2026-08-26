import { Fragment } from 'react'

// Formato inline: `code`, **bold**, *italic*, [texto](url). Simple pero cubre
// lo que traen las skills.
function inline (text, keyBase) {
  const nodes = []
  let rest = text
  let k = 0
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/
  while (rest.length) {
    const m = rest.match(re)
    if (!m) { nodes.push(rest); break }
    if (m.index > 0) nodes.push(rest.slice(0, m.index))
    const tok = m[0]
    const key = `${keyBase}-${k++}`
    if (tok.startsWith('`')) nodes.push(<code key={key} className="md-code">{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('**')) nodes.push(<strong key={key}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*')) nodes.push(<em key={key}>{tok.slice(1, -1)}</em>)
    else {
      const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)
      nodes.push(<a key={key} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>)
    }
    rest = rest.slice(m.index + tok.length)
  }
  return nodes
}

export default function Markdown ({ text }) {
  if (!text) return null
  const lines = text.replace(/\r/g, '').split('\n')
  const out = []
  let i = 0

  // Frontmatter YAML al inicio → caja meta.
  if (lines[0] === '---') {
    const meta = []
    let j = 1
    while (j < lines.length && lines[j] !== '---') { meta.push(lines[j]); j++ }
    if (j < lines.length) {
      out.push(<pre key="fm" className="md-fm">{meta.join('\n')}</pre>)
      i = j + 1
    }
  }

  let list = null
  const flushList = () => { if (list) { out.push(<ul key={`ul-${i}`} className="md-ul">{list}</ul>); list = null } }

  for (; i < lines.length; i++) {
    const ln = lines[i]

    if (ln.startsWith('```')) {
      flushList()
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++ }
      out.push(<pre key={`code-${i}`} className="md-pre"><code>{code.join('\n')}</code></pre>)
      continue
    }
    const h = ln.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      flushList()
      const lvl = Math.min(h[1].length, 4)
      const Tag = `h${lvl + 1}`
      out.push(<Tag key={`h-${i}`} className={`md-h md-h${lvl}`}>{inline(h[2], `h${i}`)}</Tag>)
      continue
    }
    if (/^(\s*)[-*]\s+/.test(ln)) {
      const item = ln.replace(/^\s*[-*]\s+/, '')
      list = list || []
      list.push(<li key={`li-${i}`}>{inline(item, `li${i}`)}</li>)
      continue
    }
    if (/^\s*>\s?/.test(ln)) {
      flushList()
      out.push(<blockquote key={`q-${i}`} className="md-q">{inline(ln.replace(/^\s*>\s?/, ''), `q${i}`)}</blockquote>)
      continue
    }
    if (/^(---|===|\*\*\*)\s*$/.test(ln)) { flushList(); out.push(<hr key={`hr-${i}`} className="md-hr" />); continue }
    if (ln.trim() === '') { flushList(); continue }

    flushList()
    out.push(<p key={`p-${i}`} className="md-p">{inline(ln, `p${i}`)}</p>)
  }
  flushList()
  return <Fragment>{out}</Fragment>
}
