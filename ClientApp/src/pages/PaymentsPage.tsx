import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Landmark, LoaderCircle, ShieldCheck, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from 'react-oidc-context'
import { useSearchParams } from 'react-router-dom'
import { createApi } from '../api'
import { EmptyState, LoadingBlock, Modal, money, Notice, PageHeader, shortId } from '../components/Common'
import { TransferHistory } from '../components/TransferHistory'
import { useAtlasState } from '../state'
import type { PublicConfig } from '../types'

type PaymentType = 'transfer' | 'withdraw' | 'deposit'

export function PaymentsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { accounts, loading, error, refresh } = useAtlasState()
  const [params, setParams] = useSearchParams()
  const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user?.access_token, config])
  const type: PaymentType = params.get('type') === 'withdraw' ? 'withdraw' : params.get('type') === 'deposit' ? 'deposit' : 'transfer'
  const [fromId, setFromId] = useState(params.get('account') ?? '')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState(false)
  const submitting = useRef(false)
  const history = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string }>()
  const selected = accounts.find(account => account.accountId === fromId)
  useEffect(() => {
    if (accounts.length && !accounts.some(account => account.accountId === fromId)) setFromId((accounts.find(account => account.status === 'Active') ?? accounts[0]).accountId)
  }, [accounts, fromId])
  useEffect(() => { if (!loading && params.get('view') === 'history') history.current?.scrollIntoView({ block: 'start' }) }, [loading, params])
  const setType = (next: PaymentType) => { setParams(previous => { const nextParams = new URLSearchParams(previous); nextParams.set('type', next); return nextParams }); setMessage(undefined) }
  const label = type === 'transfer' ? 'Send money' : type === 'withdraw' ? 'Withdraw funds' : 'Add development funds'

  function prepare(event: FormEvent) {
    event.preventDefault(); setMessage(undefined)
    if (!selected || selected.status !== 'Active') return
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || Math.abs(Math.round(value * 100) - value * 100) > 0.00001) { setMessage({ type: 'error', text: 'Enter a positive amount with at most two decimal places.' }); return }
    if (type !== 'deposit' && value > selected.balance) { setMessage({ type: 'error', text: 'That amount is above the latest loaded balance. Refresh your accounts or choose a smaller amount.' }); return }
    if (type === 'transfer' && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(toId.trim()) || toId.trim().toLowerCase() === selected.accountId.toLowerCase())) { setMessage({ type: 'error', text: 'Enter a valid destination account ID different from your source account.' }); return }
    setReview(true)
  }
  async function submit() {
    if (!selected || submitting.current) return
    submitting.current = true; setBusy(true); setMessage(undefined)
    try {
      const value = Number(amount)
      if (type === 'transfer') await api.transfer(selected.accountId, toId.trim(), value, selected.currency)
      if (type === 'withdraw') await api.withdraw(selected.accountId, value, selected.currency)
      if (type === 'deposit') await api.deposit(selected.accountId, value, selected.currency)
      setReview(false); setAmount(''); setToId(''); await refresh()
      setMessage({ type: 'success', text: type === 'transfer' ? 'Your transfer was submitted. Check its latest status in your history.' : type === 'withdraw' ? 'Withdrawal completed. Your next move is yours.' : 'Development funds added. Your account is ready to explore.' })
    } catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'We could not confirm this request. Check your history before trying again.' }) }
    finally { setBusy(false); submitting.current = false }
  }
  if (loading) return <div className="page"><LoadingBlock /></div>
  return <div className="page payments-page"><PageHeader eyebrow="Make your next move" title="Good things move forward." description="Send, withdraw, and keep track of every transfer." />
    {error && <Notice>{error}</Notice>}
    {message && !review && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
    {!accounts.length ? <EmptyState icon={<CircleDollarSign />} title="A place for your money first." message="Open your first account, then make your next move." /> : <div className="payments-grid">
      <section className="panel payment-form-panel"><div className="payment-intro"><span className="detail-icon"><WalletCards size={22} /></span><div><h2>Move money</h2><p>Small steps. Real possibilities.</p></div></div>
        <div className="segmented" role="group" aria-label="Payment operation">{([{ value: 'transfer', label: 'Send', icon: ArrowUpRight }, { value: 'withdraw', label: 'Withdraw', icon: ArrowDownLeft }, { value: 'deposit', label: 'Dev funds', icon: Landmark }] as const).map(item => <button key={item.value} aria-pressed={type === item.value} className={type === item.value ? 'active' : ''} onClick={() => setType(item.value)}><item.icon size={16} />{item.label}</button>)}</div>
        {type === 'deposit' && <Notice type="info">Development funds are available only when Finance runs in Development.</Notice>}
        <form onSubmit={prepare}><label>From your account<select value={fromId} onChange={event => setFromId(event.target.value)}>{accounts.map(account => <option key={account.accountId} value={account.accountId}>{account.currency} · {shortId(account.accountId)} · {account.status}</option>)}</select></label>
          <div className="payment-available"><span>Latest loaded balance</span><strong>{selected ? money(selected.balance, selected.currency) : '—'}</strong></div>
          <label className="payment-amount-label">How much?<div className="payment-amount-input"><input required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" /><span>{selected?.currency}</span></div></label>
          {type === 'transfer' && <label>To their account<input required value={toId} onChange={event => setToId(event.target.value)} placeholder="Paste the recipient’s account ID" autoComplete="off" spellCheck={false} /><span className="input-help">Use an account in {selected?.currency ?? 'the same currency'}. Check the ID with your recipient before sending.</span></label>}
          <button className="button primary full" disabled={busy || selected?.status !== 'Active'}>{label}</button>
          {selected?.status !== 'Active' && <p className="field-error">Choose an active account to continue.</p>}
          <p className="payment-reassurance"><ShieldCheck size={15} /> You’ll review the details before confirming.</p>
        </form>
      </section>
      <div ref={history} className="history-column"><TransferHistory config={config} accountId={fromId || undefined} /></div>
    </div>}
    {review && selected && <Modal title="One last look." onClose={() => { if (!busy) setReview(false) }}><div className="payment-review"><span className="receipt-symbol"><ShieldCheck size={25} /></span><p>{type === 'transfer' ? 'You’re sending' : type === 'withdraw' ? 'You’re withdrawing' : 'You’re adding development funds'}</p><strong>{money(Number(amount), selected.currency)}</strong></div><dl className="receipt-details"><div><dt>From account</dt><dd>{selected.accountId}</dd></div>{type === 'transfer' && <div><dt>To account</dt><dd>{toId.trim()}</dd></div>}<div><dt>Currency</dt><dd>{selected.currency}</dd></div></dl>{message && <Notice type={message.type}>{message.text}</Notice>}<div className="modal-actions"><button className="button ghost" disabled={busy} onClick={() => setReview(false)}>Make a change</button><button className="button primary" disabled={busy} onClick={() => void submit()}>{busy && <LoaderCircle className="spin" size={17} />}{busy ? 'Submitting…' : 'Confirm'}</button></div></Modal>}
  </div>
}
