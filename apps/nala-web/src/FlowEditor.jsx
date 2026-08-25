import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, Handle, Position
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './flow.css'

const PREV = 64
const STORE = 'nala-flow-graph'

// animación -> carpeta de sf-sprite para el preview del nodo
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

function keyOut (g, w, h) {
  const d = g.getImageData(0, 0, w, h); const p = d.data
  for (let i = 0; i < p.length; i += 4) if (p[i] <= 45 && p[i + 1] <= 45 && p[i + 2] <= 45 && p[i] >= p[i + 2]) p[i + 3] = 0
  g.putImageData(d, 0, 0)
}

// Nodo: preview de la animación (frame 0) + nombre. Handles para conectar.
function AnimNode ({ data }) {
  const ref = useRef(null)
  useEffect(() => {
    const folder = FOLDER[data.anim]
    const im = new Image()
    im.onload = () => {
      const c = ref.current; if (!c) return
      const fw = Math.floor(im.width / (data.frames || 8))
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false
      g.clearRect(0, 0, PREV, PREV)
      g.drawImage(im, 0, 0, fw, im.height, 0, 0, PREV, PREV)
      keyOut(g, PREV, PREV)
    }
    im.src = `/sf-sprite-nala/${encodeURIComponent(folder)}/spritesheet.png`
  }, [data.anim, data.frames])
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
  const seq = ['idle', 'walk', 'sit', 'sleep']
  const nodes = ANIMS.map((anim, i) => ({
    id: anim, type: 'anim', data: { anim },
    position: { x: 40 + (i % 4) * 200, y: 40 + Math.floor(i / 4) * 150 }
  }))
  const edges = []
  for (let i = 0; i < seq.length - 1; i++) {
    edges.push({ id: `${seq[i]}-${seq[i + 1]}`, source: seq[i], target: seq[i + 1], label: '1500 ms', data: { ms: 1500 }, animated: true })
  }
  return { nodes, edges }
}

export default function FlowEditor ({ onClose }) {
  const init = (() => { try { return JSON.parse(localStorage.getItem(STORE)) } catch (_) { return null } })() || defaultGraph()
  const [nodes, setNodes, onNodesChange] = useNodesState(init.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(init.edges)
  const [playing, setPlaying] = useState(false)
  const stopRef = useRef(false)

  const onConnect = useCallback((c) => {
    setEdges((eds) => addEdge({ ...c, label: '1500 ms', data: { ms: 1500 }, animated: true }, eds))
  }, [setEdges])

  const onEdgeDoubleClick = useCallback((_e, edge) => {
    const val = prompt('Tiempo antes de pasar a la siguiente (ms):', edge.data?.ms ?? 1500)
    if (val == null) return
    const ms = Math.max(0, parseInt(val, 10) || 0)
    setEdges((eds) => eds.map((e) => e.id === edge.id ? { ...e, label: `${ms} ms`, data: { ...e.data, ms } } : e))
  }, [setEdges])

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify({
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, data: { anim: n.data.anim }, position: n.position })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, data: e.data, animated: true }))
    }))
  }, [nodes, edges])

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
      window.nala?.sendCommand?.({ type: 'anim', name: cur.data.anim, hold: 60000 })
      const out = edges.find((e) => e.source === cur.id)
      const ms = out?.data?.ms ?? 1500
      await new Promise((r) => setTimeout(r, ms))
      setPlayingNode(cur.id, false)
      if (!out || seen.has(out.id)) break
      seen.add(out.id)
      cur = nodes.find((n) => n.id === out.target)
    }
    setPlaying(false); stopRef.current = false
    window.nala?.sendCommand?.({ type: 'free' })
  }

  return (
    <div className="fe-wrap">
      <div className="fe-bar">
        <strong>Flujo de animaciones</strong>
        <span className="fe-hint">Arrastrá de un nodo a otro para conectar · doble click en una flecha = tiempo</span>
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
          onConnect={onConnect} onEdgeDoubleClick={onEdgeDoubleClick}
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
