import { Copy, Plus, RefreshCw, WalletCards } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApi } from '../api'
import { EmptyState, LoadingBlock, Modal, money, Notice, PageHeader, shortId } from '../components/Common'
import { useAtlasState } from '../state'
import type { Currency, PublicConfig } from '../types'

export function AccountsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { accounts, loading, error, refresh } = useAtlasState()
  const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user, config])
  const [modalOpen, setModalOpen] = useState(false)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [busy, setBusy] = useState(false)
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
      <PageHeader eyebrow="Money" title="Your accounts" description="Create accounts, check balances, and control account status." action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> New account</button>} />
      {error && <Notice>{error}</Notice>}{message && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
      {accounts.length ? <section className="account-grid">{accounts.map((account, index) => (
        <article className={`bank-card color-${index % 3}`} key={account.accountId}>
          <div className="bank-card-top"><span className="account-currency">{account.currency}</span><span className={`status ${account.status.toLowerCase()}`}>{account.status}</span></div>
          <p>Available balance</p><strong>{money(account.balance, account.currency)}</strong>
          <div className="account-number"><span>{shortId(account.accountId)}</span><button className="icon-button" onClick={() => void navigator.clipboard.writeText(account.accountId)} aria-label="Copy account ID"><Copy size={16} /></button></div>
          <div className="bank-card-actions">
            {account.status === 'Pending' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'activate')}>Activate</button>}
            {account.status === 'Active' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'freeze')}>Freeze</button>}
            {account.status === 'Frozen' && <button disabled={busy} onClick={() => void setStatus(account.accountId, 'unfreeze')}>Unfreeze</button>}
            <button onClick={() => void refresh()}><RefreshCw size={15} /> Refresh</button>
          </div>
        </article>
      ))}</section> : <EmptyState icon={<WalletCards />} title="No accounts yet" message="Create your first AtlasPay account to get started." action={<button className="button primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Create account</button>} />}
      {modalOpen && <Modal title="Create a new account" onClose={() => setModalOpen(false)}><form onSubmit={create}><label>Currency<select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option>USD</option><option>EUR</option><option>AMD</option></select></label><p className="form-hint">New accounts start pending. You can activate the account from this page.</p><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="button primary" disabled={busy}>Create account</button></div></form></Modal>}
    </div>
  )
}
