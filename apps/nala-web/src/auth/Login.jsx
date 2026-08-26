import { useState } from 'react'
import './login.css'
import { login } from './auth.js'

const GitHubIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5Z" />
  </svg>
)
const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.2 6.9 8.9 4.8 12 4.8Z" />
  </svg>
)
const Arch = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 301 461" aria-hidden="true">
    <path fill="currentColor" stroke="currentColor" strokeWidth="1"
      d="m4.705 141.252 36.53-37.442a6.002 6.002 0 0 1 4.294-1.81h102.409a6.002 6.002 0 0 0 4.334-1.851l91.581-95.673a6 6 0 0 1 4.334-1.851H292a6 6 0 0 1 6 6V452a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V145.442a6 6 0 0 1 1.705-4.19Z" />
  </svg>
)

export default function Login () {
  const [step, setStep] = useState('email')   // email -> password (como Clerk)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (step === 'email') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError('Ingresá un correo válido'); return }
      setStep('password')
      return
    }
    setBusy(true)
    const r = await login(email, password)
    setBusy(false)
    if (r.ok) window.location.href = '/dashboard'
    else setError(r.error || 'no se pudo iniciar sesión')
  }
  const edit = () => { setStep('email'); setPassword(''); setError('') }
  const oauth = () => setError('El inicio con GitHub/Google no está disponible en modo local — usá tu correo.')

  return (
    <div className="lg-wrap">
      <div className="lg-col">
        <main className="lg-main">
          <div className="lg-cardwrap">
            <div className="lg-card">
              <div className="lg-header">
                <div className="lg-logoBox"><span className="lg-logo" /></div>
                <h1 className="lg-title">Iniciá sesión en Nala</h1>
                <p className="lg-sub">¡Bienvenido de nuevo! Ingresá para continuar</p>
              </div>

              {step === 'email' && (
                <>
                  <div className="lg-social">
                    <button type="button" className="lg-oauth" onClick={oauth}><GitHubIcon /><span>GitHub</span></button>
                    <button type="button" className="lg-oauth" onClick={oauth}><GoogleIcon /><span>Google</span></button>
                  </div>
                  <div className="lg-divider"><span>o</span></div>
                </>
              )}

              <form className="lg-form" onSubmit={submit}>
                {step === 'email' ? (
                  <>
                    <label className="lg-label" htmlFor="lg-email">Correo electrónico</label>
                    <input id="lg-email" className="lg-input" type="email" autoComplete="email" required autoFocus
                      placeholder="Ingresá tu correo" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </>
                ) : (
                  <>
                    <div className="lg-identifier">
                      <span className="lg-identifier-mail">{email}</span>
                      <button type="button" className="lg-identifier-edit" onClick={edit}>Editar</button>
                    </div>
                    <label className="lg-label" htmlFor="lg-pass">Contraseña</label>
                    <input id="lg-pass" className="lg-input" type="password" autoComplete="current-password" required autoFocus
                      placeholder="Ingresá tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </>
                )}
                {error && <p className="lg-error">{error}</p>}
                <button className="lg-continue" type="submit" disabled={busy}>
                  <span>{busy ? 'Ingresando…' : 'Continuar'}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M9.5 8.25 6 6v4.5l3.5-2.25Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>

              <a className="lg-passkey" href="#" onClick={(e) => e.preventDefault()}>Usar passkey</a>

              <div className="lg-footer">
                <p className="lg-footer-action">¿No tenés cuenta? <a href="/register">Registrate</a></p>
                <div className="lg-secured"><span>Protegido por</span><b>Nala</b></div>
              </div>
            </div>
          </div>

          <div className="lg-deco" aria-hidden="true">
            <Arch className="lg-arch lg-arch-l" />
            <Arch className="lg-arch lg-arch-r" />
            <div className="lg-topline-wrap">
              <svg className="lg-topline" fill="none" viewBox="0 0 1216 111" aria-hidden="true">
                <path d="M0 110h347.654a7.999 7.999 0 0 0 5.696-2.383L455.9 3.633a8.001 8.001 0 0 1 5.696-2.383h292.308c2.141 0 4.192.858 5.696 2.383l102.55 103.984a7.999 7.999 0 0 0 5.696 2.383H1216" />
              </svg>
            </div>
          </div>
        </main>

        <footer className="lg-page-foot">
          <p>© 2026 Nala</p>
          <ul>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Soporte</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Privacidad</a></li>
            <li><a href="#" onClick={(e) => e.preventDefault()}>Términos</a></li>
          </ul>
        </footer>
      </div>
    </div>
  )
}
