import { ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Plus, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { money, PageHeader, LoadingBlock, Notice, shortId } from '../components/Common'
import { useAtlasState } from '../state'

export function DashboardPage() {
  const { accounts, loading, error } = useAtlasState()
  const active = accounts.filter((account) => account.status === 'Active')
  if (loading) return <div className="page"><LoadingBlock /></div>
  return (
    <div className="page">
      <PageHeader eyebrow="Personal banking" title="Good to see you." description="Here’s a clear view of your AtlasPay accounts." action={<Link className="button primary" to="/accounts"><Plus size={18} /> New account</Link>} />
      {error && <Notice>{error}</Notice>}
      <section className="summary-grid">
        <div className="summary-card dark"><span>Total accounts</span><strong>{accounts.length}</strong><small>{active.length} ready to use</small><span className="summary-decoration"><WalletCards /></span></div>
        <div className="summary-card"><span>Account currencies</span><strong>{new Set(accounts.map((a) => a.currency)).size}</strong><small>AMD · USD · EUR</small></div>
        <div className="summary-card"><span>Security</span><strong>Protected</strong><small>OAuth 2.0 + PKCE session</small></div>
      </section>
      <div className="dashboard-grid">
        <section className="panel accounts-panel"><div className="panel-head"><div><span className="eyebrow">Your money</span><h2>Accounts</h2></div><Link to="/accounts">View all <ArrowRight size={17} /></Link></div>
          {accounts.length ? <div className="account-list compact">{accounts.slice(0, 3).map((account, index) => <div className={`account-tile color-${index % 3}`} key={account.accountId}><div><span>{account.currency} account</span><b>{money(account.balance, account.currency)}</b><small>{shortId(account.accountId)}</small></div><span className={`status ${account.status.toLowerCase()}`}>{account.status}</span></div>)}</div> : <div className="inline-empty"><WalletCards /><div><strong>No accounts yet</strong><p>Create your first AtlasPay account to get started.</p></div></div>}
        </section>
        <aside className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">Shortcuts</span><h2>Move money</h2></div></div><Link to="/payments?type=transfer"><span className="quick-icon blue"><ArrowUpRight /></span><div><strong>Send money</strong><small>Transfer to another account</small></div><ArrowRight /></Link><Link to="/payments?type=withdraw"><span className="quick-icon coral"><ArrowDownLeft /></span><div><strong>Withdraw</strong><small>Take money from an account</small></div><ArrowRight /></Link><Link to="/notifications"><span className="quick-icon green"><Bell /></span><div><strong>Manage alerts</strong><small>Choose what you hear about</small></div><ArrowRight /></Link></aside>
      </div>
    </div>
  )
}
