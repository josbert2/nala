import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, Handle, Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flow.css'

const PREV = 64
const BAR = 72
const STORE = 'nala-flow-graph'

const FOLDER = {
  idle: 'normal', walk: 'caminar', sit: 'respirar-sentada', stretch: 'respirar-sentada-full',
  yawn: 'respirar-sentada-pestañeando', sleep: 'dormida', amasar: 'dormida-2', loaf: 'pan-colita',
  crouch: 'pan-colita-2', groom: 'lamer-pata', olfatear: 'lamer-pata-2', frotar: 'asicalar',
  rascarse: 'rascandose', scratch: 'aruñando-a-dos-patas', dig: 'aruñando-el-piso',
  angry: 'enojada', alert: 'handler-click', blep: 'beso-respirando', eat: 'trabajando'
}
const ANIMS = Object.keys(FOLDER)
const LABEL = {
  idle: 'Normal', walk: 'Caminar', sit: 'Sentada', stretch: 'Sentada full', yawn: 'Parpadeo',
  sleep: 'Dormida', amasar: 'Dormida 2', loaf: 'Pan', crouch: 'Pan 2', groom: 'Lamer pata',
  olfatear: 'Lamer pata 2', frotar: 'Asicalar', rascarse: 'Rascándose', scratch: 'Arañar 2p',
  dig: 'Arañar piso', angry: 'Enojada', alert: 'Alzada', blep: 'Beso', eat: 'Trabajando'
}

// metadata compartida: anim -> { frames, fps, durMs, img }
const META = {}

function keyOutCanvas (g, w, h) {
  const d = g.getImageData(0, 0, w, h); const p = d.data
  for (let i = 0; i < p.length; i += 4) if (p[i] <= 45 && p[i + 1] <= 45 && p[i + 2] <= 45 && p[i] >= p[i + 2]) p[i + 3] = 0
  g.putImageData(d, 0, 0)
}

function loadMeta (anim) {
  if (META[anim]) return Promise.resolve(META[anim])
  const enc = encodeURIComponent(FOLDER[anim])
  return fetch(`/sf-sprite-nala/${enc}/metadata.json`).then((r) => r.json()).then((m) => new Promise((res) => {
    const frames = m.frame_count || 8
    const fps = m.fps || 8
    const img = new Image()
    img.onload = () => { META[anim] = { frames, fps, durMs: Math.round(frames / fps * 1000), img }; res(META[anim]) }
    img.onerror = () => { META[anim] = { frames, fps, durMs: Math.round(frames / fps * 1000), img: null }; res(META[anim]) }
    img.src = `/sf-sprite-nala/${enc}/spritesheet.png`
  }))
}

function AnimNode ({ data }) {
  const ref = useRef(null)
  useEffect(() => {
    let raf = 0, start = performance.now()
    loadMeta(data.anim).then((m) => {
      if (!m.img) return
      const fw = Math.floor(m.img.width / m.frames)
      const tick = (now) => {
        const c = ref.current; if (!c) return
        const f = Math.floor((now - start) / 1000 * m.fps) % m.frames
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false
        g.clearRect(0, 0, PREV, PREV)
        g.drawImage(m.img, f * fw, 0, fw, m.img.height, 0, 0, PREV, PREV)
        keyOutCanvas(g, PREV, PREV)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [data.anim])
  return (
    <div className={`fn-node${data.playing ? ' fn-playing' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <canvas ref={ref} width={PREV} height={PREV} />
      <div className="fn-name">{LABEL[data.anim] || data.anim}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
const nodeTypes = { anim: AnimNode }

function defaultGraph () {
  const seq = ['idle', 'walk', 'sit', 'groom', 'loaf', 'sleep']
  const nodes = ANIMS.map((anim, i) => ({
    id: anim, type: 'anim', data: { anim },
    position: { x: 40 + (i % 5) * 190, y: 40 + Math.floor(i / 5) * 150 }
  }))
  const edges = []
  for (let i = 0; i < seq.length - 1; i++) {
    edges.push({ id: `${seq[i]}-${seq[i + 1]}`, source: seq[i], target: seq[i + 1], animated: true })
  }
  return { nodes, edges }
}

export default function FlowEditor ({ onClose }) {
  const init = (() => { try { return JSON.parse(localStorage.getItem(STORE)) } catch (_) { return null } })() || defaultGraph()
  const [nodes, setNodes, onNodesChange] = useNodesState(init.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState((init.edges || []).map((e) => ({ ...e, label: undefined, animated: true })))
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(null)   // anim que suena ahora, para el preview de la barra
  const stopRef = useRef(false)
  const barRef = useRef(null)

  const onConnect = useCallback((c) => setEdges((eds) => addEdge({ ...c, animated: true }, eds)), [setEdges])

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify({
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: { anim: n.data.anim }, position: n.position })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
    }))
  }, [nodes, edges])

  // Preview de la barra: dibuja la animación actual mientras reproduce.
  useEffect(() => {
    if (!current) return
    let raf = 0; const start = performance.now()
    loadMeta(current).then((m) => {
      if (!m.img) return
      const fw = Math.floor(m.img.width / m.frames)
      const tick = (now) => {
        const c = barRef.current; if (!c) return
        const f = Math.floor((now - start) / 1000 * m.fps) % m.frames
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false
        g.clearRect(0, 0, BAR, BAR)
        g.drawImage(m.img, f * fw, 0, fw, m.img.height, 0, 0, BAR, BAR)
        keyOutCanvas(g, BAR, BAR)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [current])

  const setPlayingNode = (id, on) => setNodes((ns) => ns.map((n) => n.id === id ? { ...n, data: { ...n.data, playing: on } } : n))

  const play = async () => {
    if (playing) { stopRef.current = true; return }
    const targets = new Set(edges.map((e) => e.target))
    let cur = nodes.find((n) => !targets.has(n.id)) || nodes[0]
    if (!cur) return
    setPlaying(true); stopRef.current = false
    const seen = new Set()
    while (cur && !stopRef.current) {
      setPlayingNode(cur.id, true)
      setCurrent(cur.data.anim)
      window.nala?.sendCommand?.({ type: 'anim', name: cur.data.anim, hold: 60000 })
      const m = await loadMeta(cur.data.anim)
      // dura lo que dura la animacion de verdad (minimo 1s para que se aprecie)
      await new Promise((r) => setTimeout(r, Math.max(m.durMs || 1200, 1000)))
      setPlayingNode(cur.id, false)
      const out = edges.find((e) => e.source === cur.id)
      if (!out || seen.has(out.id)) break
      seen.add(out.id)
      cur = nodes.find((n) => n.id === out.target)
    }
    setPlaying(false); stopRef.current = false; setCurrent(null)
    window.nala?.sendCommand?.({ type: 'free' })
  }

  return (
    <div className="fe-wrap">
      <div className="fe-bar">
        {playing
          ? <canvas className="fe-prev" ref={barRef} width={BAR} height={BAR} />
          : <span className="fe-prev fe-prev-off">🐱</span>}
        <div className="fe-title-wrap">
          <strong>Flujo de animaciones</strong>
          <span className="fe-hint">Conectá los nodos en el orden que quieras · cada uno dura lo que dura su animación</span>
        </div>
        <div className="fe-actions">
          <button className={`fe-btn${playing ? ' fe-stop' : ''}`} onClick={play}>{playing ? '■ Detener' : '▶ Reproducir'}</button>
          <button className="fe-btn" onClick={() => { localStorage.removeItem(STORE); const g = defaultGraph(); setNodes(g.nodes); setEdges(g.edges) }}>Reiniciar</button>
          <button className="fe-btn fe-close" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="fe-canvas">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes} fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} color="#e0d6c6" />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  )
}
