import NalaStage from './NalaStage.jsx'
import AnimationsDrawer from './AnimationsDrawer.jsx'
import FlowEditor from './FlowEditor.jsx'
import './flow.css'

// Ruteo simple por path: / = la gata (home), /flow = el editor de flujo.
export default function App () {
  const path = window.location.pathname

  if (path.startsWith('/flow')) {
    return <FlowEditor onClose={() => { window.location.href = '/' }} />
  }

  return (
    <>
      <NalaStage />
      <AnimationsDrawer />
      <a className="fe-open" href="/flow">⋔ Flujo</a>
    </>
  )
}
