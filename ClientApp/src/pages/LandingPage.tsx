import { ArrowUpRight, BadgeCheck, BellRing, CreditCard, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useAuth } from 'react-oidc-context'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function LandingPage() {
  const auth = useAuth()
  return (
    <div className="landing">
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <nav className="landing-nav glass-nav"><Logo /><div><Link to="/register" className="text-link">Open an account</Link><button className="button primary" onClick={() => void auth.signinRedirect()}>Sign in</button></div></nav>
      <main className="hero">
        <section className="hero-copy">
          <span className="hero-pill"><Sparkles size={15} /> A clearer way to bank</span>
          <h1>Everyday money,<br /><em>beautifully simple.</em></h1>
          <p>Accounts, transfers, and alerts in one calm, secure place. AtlasPay gives you a clear view of your finances without the clutter.</p>
          <div className="hero-actions"><Link to="/register" className="button primary large">Get started <ArrowUpRight size={18} /></Link><button className="button ghost large" onClick={() => void auth.signinRedirect()}>I have an account</button></div>
          <div className="trust-row"><span><ShieldCheck /> Keycloak secured</span><span><BadgeCheck /> Ownership protected</span></div>
        </section>
        <section className="hero-visual" aria-label="AtlasPay account preview">
          <div className="glow-orb" />
          <div className="glass-chip glass-chip-left"><ShieldCheck /><span><small>Protected</small><strong>Secure session</strong></span></div>
          <div className="glass-chip glass-chip-right"><Zap /><span><small>Fast access</small><strong>One clear view</strong></span></div>
          <div className="preview-window liquid-glass">
            <div className="preview-top"><Logo /><span className="avatar">AT</span></div>
            <p className="preview-label">Total balance</p><strong className="preview-balance">$24,680.50</strong><span className="positive">+2.8% this month</span>
            <div className="preview-card"><div><span>AtlasPay</span><CreditCard /></div><strong>•••• 4821</strong><small>Everyday account</small></div>
            <div className="preview-activity"><div><span className="activity-icon"><BellRing /></span><div><strong>Transfer completed</strong><small>Today, 09:42</small></div></div><b>− $125.00</b></div>
          </div>
        </section>
      </main>
      <footer className="landing-features liquid-glass"><div><span><ShieldCheck /></span><strong>Secure by design</strong><p>OAuth 2.0 with PKCE and short-lived access tokens.</p></div><div><span><BellRing /></span><strong>Always in control</strong><p>Account-level alerts and clear transaction history.</p></div><div><span><Zap /></span><strong>Built for real life</strong><p>Responsive banking that works wherever you are.</p></div></footer>
    </div>
  )
}
