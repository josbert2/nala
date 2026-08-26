import NalaStage from './NalaStage.jsx'
import AnimationsDrawer from './AnimationsDrawer.jsx'
import FlowEditor from './FlowEditor.jsx'
import DebugPanel from './DebugPanel.jsx'
import Dashboard from './dashboard/Dashboard.jsx'
import Login from './auth/Login.jsx'
import Register from './auth/Register.jsx'
import { isAuthed } from './auth/auth.js'
import './flow.css'

// Ruteo simple por path: / = la gata (home), /flow = el editor de flujo,
// /dashboard = el diario de dev (protegido), /login y /register = auth.
export default function App () {
  const path = window.location.pathname

  if (path.startsWith('/login') || path.startsWith('/sign-in')) {
    return <Login />
  }

  if (path.startsWith('/register') || path.startsWith('/sign-up')) {
    return <Register />
  }

  if (path.startsWith('/flow')) {
    return <FlowEditor onClose={() => { window.location.href = '/' }} />
  }

  if (path.startsWith('/dashboard')) {
    if (!isAuthed()) { window.location.href = '/login'; return null }
    return <Dashboard onClose={() => { window.location.href = '/' }} />
  }

  return (
    <>
      <NalaStage />
      <AnimationsDrawer />
      <DebugPanel />
      <a className="fe-open" href="/flow">⋔ Flujo</a>
      <a className="fe-open ds-open" href="/dashboard">▦ Dashboard</a>
    </>
  )
}
