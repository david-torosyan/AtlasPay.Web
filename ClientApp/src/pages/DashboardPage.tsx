import { ArrowDownLeft, ArrowUpRight, Bell, Eye, EyeOff, Plus, RefreshCw, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { Link } from 'react-router-dom'
import { PageHeader, LoadingBlock, Notice, shortId } from '../components/Common'
import { AnimatedMoney } from '../components/AnimatedMoney'
import { ExchangePanel } from '../components/ExchangePanel'
import { TransferHistory } from '../components/TransferHistory'
import { ActivityPanel } from '../components/ActivityPanel'
import { useAtlasState } from '../state'
import type { Currency, PublicConfig } from '../types'

export function DashboardPage({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { accounts, loading, error, refresh } = useAtlasState()
  const [hidden, setHidden] = useState(false)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [refreshing, setRefreshing] = useState(false)
  const currencies = [...new Set(accounts.map(account => account.currency))]
  const selected = currencies.includes(currency) ? currency : currencies[0] ?? 'USD'
  const total = accounts.filter(account => account.currency === selected).reduce((sum, account) => sum + account.balance, 0)
  const active = accounts.filter(account => account.status === 'Active').length
  const frozen = accounts.filter(account => account.status === 'Frozen').length
  const activeDegrees = accounts.length ? active / accounts.length * 360 : 0
  const frozenDegrees = accounts.length ? frozen / accounts.length * 360 : 0
  const name = (auth.user?.profile.given_name || auth.user?.profile.name?.split(' ')[0] || 'there')
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  async function reload() { setRefreshing(true); try { await refresh() } finally { setRefreshing(false) } }
  if (loading && !accounts.length) return <div className="page"><LoadingBlock /></div>
  return <div className="page dashboard-page">
    <PageHeader eyebrow="Your money. A little more you." title={`${greeting}, ${name}.`} description="A fresh perspective on your everyday possibilities."
      action={<div className="header-actions"><button className="button ghost" onClick={() => void reload()} disabled={refreshing}><RefreshCw size={17} className={refreshing ? 'spin' : ''} /><span>{refreshing ? 'Refreshing…' : 'Refresh'}</span></button><Link className="button primary" to="/accounts"><Plus size={18} /> Open an account</Link></div>} />
    {error && <Notice>{error}</Notice>}
    <section className="overview-grid" aria-label="Your financial overview">
      <div className="balance-hero"><div className="balance-orbit" aria-hidden="true"><svg viewBox="0 0 240 240" fill="none"><ellipse cx="120" cy="120" rx="105" ry="54" transform="rotate(-42 120 120)" /><ellipse cx="120" cy="120" rx="105" ry="54" transform="rotate(28 120 120)" /><ellipse cx="120" cy="120" rx="105" ry="54" transform="rotate(98 120 120)" /><circle cx="120" cy="120" r="17" /></svg></div>
        <div className="balance-heading"><span><WalletCards size={18} /> Your total balance</span><button className="icon-button" onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show balances' : 'Hide balances'} aria-pressed={hidden}>{hidden ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
        <div className="balance-value" key={selected}><AnimatedMoney value={total} currency={selected} hidden={hidden} /></div><p>Across {accounts.filter(account => account.currency === selected).length} {selected} {accounts.filter(account => account.currency === selected).length === 1 ? 'account' : 'accounts'} · Room for your next move.</p>
        <div className="balance-footer"><div className="currency-tabs" role="group" aria-label="Balance currency">{(currencies.length ? currencies : ['USD'] as Currency[]).map(item => <button key={item} onClick={() => setCurrency(item)} aria-pressed={selected === item} className={selected === item ? 'active' : ''}>{item}</button>)}</div><Link className="balance-send" to="/payments?type=transfer">Make a transfer</Link></div>
      </div>
      <div className="overview-detail panel account-health"><div className="account-health-top"><span className="detail-label">Your account collection</span><div className="account-ring" style={{ background: `conic-gradient(var(--accent) ${activeDegrees}deg, var(--mint-strong) ${activeDegrees}deg ${activeDegrees + frozenDegrees}deg, var(--line) ${activeDegrees + frozenDegrees}deg)` }} aria-hidden="true"><span>{accounts.length}</span></div></div><strong>{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}.<br />One clear view.</strong><div className="account-legend"><span><i />{active} active</span><span><i />{frozen} frozen</span></div><Link to="/accounts">Explore your accounts</Link></div>
      <div className="overview-detail panel peace-card"><span className="detail-icon mint"><ShieldCheck size={22} /></span><span className="detail-label">Less noise. More peace of mind.</span><strong>Stay close to<br />what matters.</strong><p>A little heads-up, exactly how you like it.</p><Link to="/notifications">Personalize your alerts</Link><Sparkles className="peace-decoration" aria-hidden="true" /></div>
    </section>
    <div className="dashboard-grid"><section className="panel accounts-panel"><div className="panel-head"><div><span className="eyebrow">A home for your money</span><h2>Your accounts, at a glance.</h2></div><Link to="/accounts">View all accounts</Link></div>
      {accounts.length ? <div className="account-list compact">{accounts.slice(0, 3).map((account, index) => <Link to="/accounts" className={`account-tile color-${index % 3}`} key={account.accountId}><span className="account-currency-mark">{account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : '֏'}</span><div><span>{account.currency} account</span><small>{shortId(account.accountId)}</small></div><div className="account-tile-end"><b><AnimatedMoney value={account.balance} currency={account.currency} hidden={hidden} /></b><span className={`status ${account.status.toLowerCase()}`}>{account.status}</span></div></Link>)}</div> : <div className="inline-empty"><WalletCards /><div><strong>Let’s make yourself at home.</strong><p>Open your first account and give your money a little room.</p><Link className="button secondary" to="/accounts">Open an account</Link></div></div>}
    </section><aside className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">Little shortcuts. Big possibilities.</span><h2>What’s your next move?</h2></div></div><Link to="/payments?type=transfer"><span className="quick-icon blue"><ArrowUpRight /></span><div><strong>Send a little possibility</strong><small>Transfer to another account</small></div></Link><Link to="/payments?type=withdraw"><span className="quick-icon coral"><ArrowDownLeft /></span><div><strong>Make it yours</strong><small>Withdraw from an active account</small></div></Link><Link to="/notifications"><span className="quick-icon green"><Bell /></span><div><strong>Find your rhythm</strong><small>Set alerts that suit your day</small></div></Link></aside></div>
    <div className="dashboard-history"><TransferHistory config={config} compact hidden={hidden} /></div>
    <div className="dashboard-perspective-grid"><ExchangePanel /><ActivityPanel /></div>
    <div className="daily-note"><span className="daily-note-art" aria-hidden="true">✳</span><div><span className="eyebrow">A little reminder</span><h2>Life is bigger than your balance.</h2><p>We’re here to help you spend less time managing money, and more time living.</p></div><Link className="button ghost" to="/payments">Make your next move</Link></div>
    <p className="workspace-note"><ShieldCheck size={14} /> Your latest loaded balances. A fresh view is always one refresh away.</p>
  </div>
}
