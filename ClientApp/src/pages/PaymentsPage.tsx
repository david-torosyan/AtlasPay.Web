import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Landmark, LoaderCircle, ReceiptText } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useSearchParams } from 'react-router-dom'
import { createApi } from '../api'
import { EmptyState, LoadingBlock, money, Notice, PageHeader, shortId } from '../components/Common'
import { useAtlasState } from '../state'
import type { Currency, PublicConfig, Transaction } from '../types'

type PaymentType = 'transfer' | 'withdraw' | 'deposit'

export function PaymentsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth(); const { accounts, loading, refresh } = useAtlasState(); const [params] = useSearchParams()
  const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user, config])
  const [type, setType] = useState<PaymentType>((params.get('type') as PaymentType) || 'transfer')
  const [fromId, setFromId] = useState(''); const [toId, setToId] = useState(''); const [amount, setAmount] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([]); const [busy, setBusy] = useState(false); const [historyBusy, setHistoryBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string }>()
  const selected = accounts.find((a) => a.accountId === fromId)

  useEffect(() => { if (!fromId && accounts.length) setFromId(accounts[0].accountId) }, [accounts, fromId])
  useEffect(() => {
    if (!fromId) { setTransactions([]); return }
    setHistoryBusy(true)
    api.getTransactions(fromId).then((page) => setTransactions(page.items)).catch(() => setTransactions([])).finally(() => setHistoryBusy(false))
  }, [api, fromId])

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy(true); setMessage(undefined)
    try {
      const value = Number(amount)
      if (type === 'transfer') await api.transfer(selected.accountId, toId.trim(), value, selected.currency)
      if (type === 'withdraw') await api.withdraw(selected.accountId, value, selected.currency)
      if (type === 'deposit') await api.deposit(selected.accountId, value, selected.currency)
      setAmount(''); setToId(''); await refresh(); const page = await api.getTransactions(selected.accountId); setTransactions(page.items)
      setMessage({ type: 'success', text: type === 'transfer' ? 'Transfer submitted successfully.' : type === 'withdraw' ? 'Withdrawal completed.' : 'Development deposit completed.' })
    } catch (reason) { setMessage({ type: 'error', text: reason instanceof Error ? reason.message : 'The request could not be completed.' }) }
    finally { setBusy(false) }
  }

  if (loading) return <div className="page"><LoadingBlock /></div>
  return (
    <div className="page"><PageHeader eyebrow="Payments" title="Move money" description="Transfer, withdraw, or credit a development account." />
      {!accounts.length ? <EmptyState icon={<CircleDollarSign />} title="An account is required" message="Create or add an account before moving money." /> : <div className="payments-grid">
        <section className="panel payment-form-panel">
          <div className="segmented"><button className={type === 'transfer' ? 'active' : ''} onClick={() => setType('transfer')}><ArrowUpRight /> Transfer</button><button className={type === 'withdraw' ? 'active' : ''} onClick={() => setType('withdraw')}><ArrowDownLeft /> Withdraw</button><button className={type === 'deposit' ? 'active' : ''} onClick={() => setType('deposit')}><Landmark /> Deposit</button></div>
          {message && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
          {type === 'deposit' && <Notice type="info">Deposits are exposed by Finance only in the Development environment and return 404 elsewhere.</Notice>}
          <form onSubmit={submit}>
            <label>From account<select value={fromId} onChange={(e) => setFromId(e.target.value)}>{accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.currency} · {shortId(account.accountId)} · {money(account.balance, account.currency)}</option>)}</select></label>
            {type === 'transfer' && <label>Destination account ID<input required value={toId} onChange={(e) => setToId(e.target.value)} placeholder="Recipient’s account UUID" /></label>}
            <label>Amount<div className="amount-input"><input required min="0.01" step="0.01" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /><span>{selected?.currency}</span></div></label>
            <button className="button primary full" disabled={busy || selected?.status !== 'Active'}>{busy && <LoaderCircle className="spin" />}{type === 'transfer' ? 'Send transfer' : type === 'withdraw' ? 'Withdraw funds' : 'Credit account'}</button>
            {selected?.status !== 'Active' && <p className="field-error">Select an active account to continue.</p>}
          </form>
        </section>
        <section className="panel history-panel"><div className="panel-head"><div><span className="eyebrow">Recent activity</span><h2>Transfers</h2></div></div>
          {historyBusy ? <LoadingBlock label="Loading transactions…" /> : transactions.length ? <div className="transaction-list">{transactions.map((item) => { const incoming = item.toAccountId === fromId; return <div className="transaction-row" key={item.id}><span className={`transaction-icon ${incoming ? 'incoming' : 'outgoing'}`}>{incoming ? <ArrowDownLeft /> : <ArrowUpRight />}</span><div><strong>{incoming ? 'Incoming transfer' : 'Outgoing transfer'}</strong><small>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></div><div className="transaction-amount"><b className={incoming ? 'positive' : ''}>{incoming ? '+' : '−'} {money(item.amount, item.currency)}</b><small>{item.status}</small></div></div> })}</div> : <div className="inline-empty centered"><ReceiptText /><div><strong>No transfers yet</strong><p>Completed transfers will appear here.</p></div></div>}
        </section>
      </div>}
    </div>
  )
}
