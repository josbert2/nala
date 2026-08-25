import { useState } from 'react'
import NalaStage from './NalaStage.jsx'
import AnimationsDrawer from './AnimationsDrawer.jsx'
import FlowEditor from './FlowEditor.jsx'
import './flow.css'

export default function App () {
  const [flow, setFlow] = useState(false)
  return (
    <>
      <NalaStage />
      <AnimationsDrawer />
      {!flow && <button className="fe-open" onClick={() => setFlow(true)}>⋔ Flujo</button>}
      {flow && <FlowEditor onClose={() => setFlow(false)} />}
    </>
  )
}
