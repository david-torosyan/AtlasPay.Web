import { Copy, MoreHorizontal, Plus, RefreshCw, Trash2, WalletCards } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApi } from '../api'
import { EmptyState, LoadingBlock, Modal, money, Notice, PageHeader, shortId } from '../components/Common'
import { useAtlasState } from '../state'
import type { Currency, PublicConfig } from '../types'

export function AccountsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { accounts, loading, error, refresh, rememberAccount, forgetAccount } = useAtlasState()
  const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user, config])
  const [modal, setModal] = useState<'create' | 'add'>()
  const [currency, setCurrency] = useState<Currency>('USD')
  const [accountId, setAccountId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string }>()

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(undefined)
    try {
      const result = await api.createAccount(currency)
      await rememberAccount(result.accountId)
      setModal(undefined)
      setMessage({ type: 'success', text: 'Account created. Activate it when you are ready to use it.' })
    } catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'Could not create the account.' }) }
    finally { setBusy(false) }
  }

  async function addExisting(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(undefined)
    try { await rememberAccount(accountId.trim()); setAccountId(''); setModal(undefined); setMessage({ type: 'success', text: 'Account added to this device.' }) }
    catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'Account could not be found.' }) }
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
      <PageHeader eyebrow="Money" title="Your accounts" description="Create accounts, check balances, and control account status." action={<div className="header-actions"><button className="button secondary" onClick={() => setModal('add')}>Add by ID</button><button className="button primary" onClick={() => setModal('create')}><Plus size={18} /> New account</button></div>} />
      {error && <Notice>{error}</Notice>}{message && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
      <div className="scope-note"><span>Why “tracked” accounts?</span> The Finance API can fetch an owned account by ID, but does not expose an account-list endpoint. AtlasPay remembers IDs on this device after you create or add them.</div>
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
            <button className="danger-text" onClick={() => forgetAccount(account.accountId)} title="Forget on this device"><Trash2 size={15} /></button>
          </div>
        </article>
      ))}</section> : <EmptyState icon={<WalletCards />} title="No accounts on this device" message="Create a new account or add an existing owned account by its ID." action={<button className="button primary" onClick={() => setModal('create')}><Plus size={18} /> Create account</button>} />}
      {modal === 'create' && <Modal title="Create a new account" onClose={() => setModal(undefined)}><form onSubmit={create}><label>Currency<select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}><option>USD</option><option>EUR</option><option>AMD</option></select></label><p className="form-hint">New accounts start pending. You can activate the account from this page.</p><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setModal(undefined)}>Cancel</button><button className="button primary" disabled={busy}>Create account</button></div></form></Modal>}
      {modal === 'add' && <Modal title="Add an existing account" onClose={() => setModal(undefined)}><form onSubmit={addExisting}><label>Account ID<input required value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" /></label><p className="form-hint">Only accounts owned by your authenticated customer can be loaded.</p><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setModal(undefined)}>Cancel</button><button className="button primary" disabled={busy}>Add account</button></div></form></Modal>}
    </div>
  )
}
