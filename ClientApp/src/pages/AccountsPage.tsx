import { AnimatedMoney } from '../components/AnimatedMoney'
import { Copy, Plus, RefreshCw, WalletCards, Snowflake, Sun, Sparkles, Send, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FormEvent, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApi } from '../api'
import { EmptyState, LoadingBlock, Modal, Notice, PageHeader, shortId } from '../components/Common'
import { useAtlasState } from '../state'
import type { Currency, PublicConfig } from '../types'

export function AccountsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { accounts, loading, error, refresh } = useAtlasState()
  const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user, config])
  const [modalOpen, setModalOpen] = useState(false)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('All')
  const [copied, setCopied] = useState<string>()
  const visible = filter === 'All' ? accounts : accounts.filter(account => account.status === filter)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string }>()

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(undefined)
    try {
      await api.createAccount(currency)
      await refresh()
      setModalOpen(false)
      setMessage({ type: 'success', text: 'Account created. Activate it when you are ready to use it.' })
    } catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'Could not create the account.' }) }
    finally { setBusy(false) }
  }

  async function setStatus(id: string, action: 'activate' | 'freeze' | 'unfreeze') {
    setBusy(true); setMessage(undefined)
    try { await api.setAccountStatus(id, action); await refresh(); setMessage({ type: 'success', text: `Account ${action === 'activate' ? 'activated' : action === 'freeze' ? 'frozen' : 'unfrozen'}.` }) }
    catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'Account status could not be changed.' }) }
    finally { setBusy(false) }
  }

  if (loading) return <div className="page"><LoadingBlock /></div>
  return (
    <div className="page">
      <PageHeader eyebrow="Different currencies. Same possibilities." title="A place for every plan." description="Your accounts, beautifully together. Make each one work for you." action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Open an account</button>} />
      {error && <Notice>{error}</Notice>}{message && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
      {accounts.length > 0 && <div className="account-collection-tools"><div className="history-filters" role="group" aria-label="Filter accounts">{['All', 'Active', 'Pending', 'Frozen', 'Closed'].map(status => <button key={status} aria-pressed={filter === status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{status}<span>{status === 'All' ? accounts.length : accounts.filter(account => account.status === status).length}</span></button>)}</div><span>{new Set(accounts.map(account => account.currency)).size} currencies · One workspace</span></div>}
      {accounts.length ? visible.length ? <section className="account-grid">{visible.map((account, index) => (
        <article className={`bank-card color-${index % 3}`} key={account.accountId}>
          <span className="bank-card-watermark" aria-hidden="true">{account.currency === 'USD' ? '$' : account.currency === 'EUR' ? '€' : '֏'}</span>
          <div className="bank-card-top"><span className="account-currency"><WalletCards size={18} /> {account.currency} account</span><span className={`status ${account.status.toLowerCase()}`}>{account.status}</span></div>
          <p>Available balance</p><strong><AnimatedMoney value={account.balance} currency={account.currency} /></strong>
          <div className="account-number"><span>{shortId(account.accountId)}</span><button className="icon-button" onClick={() => void navigator.clipboard.writeText(account.accountId).then(() => { setCopied(account.accountId); setMessage({ type: 'success', text: 'Account ID copied. Ready whenever you are.' }) }).catch(() => setMessage({ type: 'error', text: 'Copy is unavailable in this browser. You can select the account ID from your transfer details.' }))} aria-label="Copy account ID">{copied === account.accountId ? <Check size={16} /> : <Copy size={16} />}</button></div>
          <div className="bank-card-actions">
            {account.status === 'Pending' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'activate')}><Sparkles size={15} /> Activate</button>}
            {account.status === 'Active' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'freeze')}><Snowflake size={15} /> Freeze</button>}
            {account.status === 'Frozen' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'unfreeze')}><Sun size={15} /> Unfreeze</button>}
            <button disabled={busy} onClick={() => void refresh()}><RefreshCw size={15} /> Refresh</button>
            {account.status === 'Active' && <Link to={`/payments?type=transfer&account=${encodeURIComponent(account.accountId)}`}><Send size={15} /> Send</Link>}
          </div>
        </article>
      ))}</section> : <EmptyState icon={<WalletCards />} title={`No ${filter.toLowerCase()} accounts.`} message="Your other accounts are a tap away." action={<button className="button secondary" onClick={() => setFilter('All')}>See all accounts</button>} /> : <EmptyState icon={<WalletCards />} title="Every plan needs a place to start." message="Open your first AtlasPay account and make a little room for possibility." action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Open an account</button>} />}
      {modalOpen && <Modal title="Make room for something new." onClose={() => { if (!busy) setModalOpen(false) }}><p className="modal-description">Pick a currency for your next chapter.</p><form onSubmit={create}><div className="currency-options" role="group" aria-label="New account currency">{(['USD', 'EUR', 'AMD'] as Currency[]).map(value => <button key={value} type="button" aria-pressed={currency === value} className={currency === value ? 'selected' : ''} onClick={() => setCurrency(value)}><span>{value === 'USD' ? '$' : value === 'EUR' ? '€' : '֏'}</span><strong>{value}</strong><small>{value === 'USD' ? 'US dollar' : value === 'EUR' ? 'Euro' : 'Armenian dram'}</small></button>)}</div><p className="form-hint">Your new account starts pending. Activate it here whenever you’re ready.</p><div className="modal-actions"><button type="button" className="button ghost" disabled={busy} onClick={() => setModalOpen(false)}>Maybe later</button><button className="button primary" disabled={busy}>{busy ? 'Opening…' : 'Open account'}</button></div></form></Modal>}
    </div>
  )
}
