import { Check, ChevronLeft, LoaderCircle, LockKeyhole, MailCheck } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { Link } from 'react-router-dom'
import { registerUser } from '../api'
import { Logo } from '../components/Logo'
import { Notice } from '../components/Common'

export function RegisterPage() {
  const auth = useAuth()
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [registeredEmail, setRegisteredEmail] = useState<string>()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    try {
      const result = await registerUser(values)
      setRegisteredEmail(result.email)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-aside">
        <Logo />
        <div><span className="eyebrow light">Welcome to AtlasPay</span><h1>A better way to look after your money.</h1><p>Simple tools, clear information, and security that stays out of your way.</p></div>
        <ul><li><Check /> Create accounts in AMD, USD, or EUR</li><li><Check /> Move money with real-time balances</li><li><Check /> Choose exactly which alerts you receive</li></ul>
        <small><LockKeyhole /> Your sign-in is protected by Keycloak</small>
      </section>
      <main className="auth-main">
        <Link to="/" className="back-link"><ChevronLeft size={18} /> Back</Link>
        {!registeredEmail ? (
          <div className="auth-card">
            <span className="eyebrow">Personal banking</span><h2>Open your AtlasPay account</h2><p>Tell us a little about yourself. It only takes a minute.</p>
            {error && <Notice>{error}</Notice>}
            <form onSubmit={submit}>
              <div className="form-row"><label>First name<input required autoComplete="given-name" value={values.firstName} onChange={(e) => setValues({ ...values, firstName: e.target.value })} /></label><label>Last name<input required autoComplete="family-name" value={values.lastName} onChange={(e) => setValues({ ...values, lastName: e.target.value })} /></label></div>
              <label>Email address<input required type="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} /></label>
              <p className="form-hint">We’ll email you a secure link to verify your address and choose a password.</p>
              <button className="button primary full" disabled={submitting}>{submitting && <LoaderCircle className="spin" />} Create account</button>
            </form>
            <p className="auth-switch">Already activated? <button className="inline-button" onClick={() => void auth.signinRedirect()}>Sign in</button></p>
          </div>
        ) : (
          <div className="auth-card activation-card">
            <span className="activation-icon"><MailCheck /></span><span className="eyebrow">One more step</span><h2>Check your inbox</h2><p>We sent an activation link to <strong>{registeredEmail}</strong>. Verify your email and choose a password in Keycloak, then come back to sign in.</p>
            <button className="button primary full" onClick={() => void auth.signinRedirect()}>Continue to sign in</button><Link to="/" className="button ghost full">Return home</Link>
          </div>
        )}
      </main>
    </div>
  )
}
