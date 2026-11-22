import { ArrowDownLeft, ArrowUpRight, CheckCheck, Copy, Download, LoaderCircle, ReceiptText, RotateCcw, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from 'react-oidc-context'
import { Link } from 'react-router-dom'
import { ApiError, createApi } from '../api'
import { useAtlasState } from '../state'
import type { PublicConfig, Transaction } from '../types'
import { AnimatedMoney } from './AnimatedMoney'
import { LoadingBlock, Modal, money, Notice, shortId } from './Common'

export function TransferHistory({ config, accountId, compact = false, hidden = false }: { config: PublicConfig; accountId?: string; compact?: boolean; hidden?: boolean }) {
  const auth = useAuth()
  const { accounts, transactionsByAccount, transactionErrors, transactionsLoading, refresh, reversals, recordReversal } = useAtlasState()
  const api = useMemo(() => createApi(config, auth.user?.access_token ?? ''), [config, auth.user?.access_token])
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState('all')
  const [selected, setSelected] = useState<Transaction>()
  const [reversing, setReversing] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string }>()
  const [dialogError, setDialogError] = useState<string>()
  const [copied, setCopied] = useState(false)
  const attempts = useRef(new Map<string, { requestId: string; reason: string }>())
  const [older, setOlder] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const historyVersion = useRef(0)
  const initial = accountId ? transactionsByAccount[accountId] ?? [] : Object.values(transactionsByAccount).flat()
  const transactions = [...new Map([...initial, ...older].map(item => [item.id, item])).values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const owned = new Set(accounts.map(account => account.accountId))
  const incoming = (item: Transaction) => accountId ? item.toAccountId === accountId : !owned.has(item.fromAccountId)
  const canReverse = (item: Transaction) => item.status === 'Completed' && owned.has(item.fromAccountId) && !reversals[item.id]
  const filtered = transactions.filter(item => (direction === 'all' || (direction === 'received' ? incoming(item) : !incoming(item))) && `${item.id} ${item.fromAccountId} ${item.toAccountId} ${item.currency} ${item.amount} ${item.status}`.toLowerCase().includes(query.toLowerCase()))
  const visible = compact ? filtered.slice(0, 4) : filtered
  const loadError = accountId ? transactionErrors[accountId] : Object.keys(transactionErrors).length ? 'Some account history is unavailable. Open Move money to see the affected account.' : undefined
  useEffect(() => {
    historyVersion.current++
    setOlder([]); setPage(1); setMore(true)
    setLoadingMore(false)
  }, [accountId, transactionsByAccount])
  useEffect(() => { setQuery(''); setDirection('all'); setMessage(undefined) }, [accountId])

  function open(item: Transaction, reverse = false) {
    setSelected(item); setReversing(reverse); setDialogError(undefined); setCopied(false)
    setReason(attempts.current.get(item.id)?.reason ?? '')
  }
  function close() { if (!busy) { setSelected(undefined); setReversing(false); setDialogError(undefined) } }
  async function reverse(event: FormEvent) {
    event.preventDefault()
    if (!selected || busy || !canReverse(selected) || !reason.trim() || reason.trim().length > 500) return
    const attempt = attempts.current.get(selected.id) ?? { requestId: crypto.randomUUID(), reason: reason.trim() }
    attempts.current.set(selected.id, attempt)
    setBusy(true); setDialogError(undefined)
    try {
      const result = await api.reverseTransfer(selected.id, attempt.requestId, attempt.reason)
      recordReversal(selected.id, result.reversalId)
      setSelected(undefined); setReversing(false)
      await refresh()
      setMessage({ type: 'success', text: 'Reversal confirmed by Finance. The original transfer stays in your history for reference.' })
    } catch (error) {
      setDialogError(error instanceof ApiError && error.status === 404
        ? 'Reversal is unavailable here. Finance exposes this operation only in Development. The transfer may also no longer exist.'
        : error instanceof Error ? error.message : 'Reversal could not be confirmed. Retry this same request to avoid submitting a duplicate.')
    } finally { setBusy(false) }
  }
  async function loadMore() {
    if (!accountId || loadingMore) return
    const version = historyVersion.current
    setLoadingMore(true)
    try {
      const result = await api.getTransactions(accountId, page + 1)
      if (historyVersion.current !== version) return
      setOlder(current => [...current, ...result.items]); setPage(result.page)
      setMore(result.page * result.pageSize < result.totalCount)
    } catch (error) { if (historyVersion.current === version) setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Older transfers could not be loaded.' }) }
    finally { if (historyVersion.current === version) setLoadingMore(false) }
  }
  function exportCsv() {
    const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const rows = [['Transfer ID', 'Created at', 'From account', 'To account', 'Amount', 'Currency', 'Status'], ...filtered.map(item => [item.id, item.createdAt, item.fromAccountId, item.toAccountId, item.amount, item.currency, item.status])]
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'atlaspay-loaded-transfers.csv'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className={`panel history-panel transfer-history ${compact ? 'history-compact' : ''}`}>
    <div className="panel-head"><div><span className="eyebrow">Every move, in view</span><h2>{compact ? 'Your latest transfers' : 'Transfer history'}</h2></div>{compact ? <Link to="/payments?view=history">View activity</Link> : <button className="button ghost small-button" onClick={exportCsv} disabled={!filtered.length}><Download size={15} /> Export CSV</button>}</div>
    {!compact && <><div className="history-tools"><div className="history-search"><Search size={17} /><input aria-label="Search loaded transfers" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search amount, currency, or ID" />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}</div><div className="history-filters" role="group" aria-label="Transfer direction">{[['all', 'All'], ['sent', 'Sent'], ['received', 'Received']].map(([value, label]) => <button key={value} aria-pressed={direction === value} className={direction === value ? 'active' : ''} onClick={() => setDirection(value)}>{label}</button>)}</div></div><p className="history-caption">Search and export cover the loaded transfers for this account.</p></>}
    {message && <Notice type={message.type} onClose={() => setMessage(undefined)}>{message.text}</Notice>}
    {loadError && <Notice>{loadError}</Notice>}
    {transactionsLoading && !transactions.length ? <LoadingBlock label="Gathering your latest moves…" /> : visible.length ? <div className="transaction-list">{visible.map(item => {
      const received = incoming(item)
      const internal = !accountId && owned.has(item.fromAccountId) && owned.has(item.toAccountId)
      return <article className="transaction-row history-row" key={item.id}><span className={`transaction-icon ${received ? 'incoming' : 'outgoing'}`}>{reversals[item.id] ? <RotateCcw /> : received ? <ArrowDownLeft /> : <ArrowUpRight />}</span><div className="transaction-description"><button className="transaction-detail-button" onClick={() => open(item)}>{internal ? 'Between your accounts' : received ? 'Money received' : 'Money sent'}</button><small>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))} · {shortId(item.id)}</small></div><div className="transaction-amount"><b className={received ? 'positive' : ''}>{!hidden && !internal && (received ? '+ ' : '− ')}<AnimatedMoney value={item.amount} currency={item.currency} hidden={hidden} /></b><span className={`transfer-state ${reversals[item.id] ? 'reversed' : item.status.toLowerCase()}`}>{reversals[item.id] ? 'Reversal confirmed' : item.status}</span></div><div className="transaction-actions"><button className="transaction-text-button" onClick={() => open(item)}>Details</button>{!compact && canReverse(item) && <button className="transaction-text-button reverse-link" onClick={() => open(item, true)}><RotateCcw size={13} /> Reverse</button>}</div></article>
    })}</div> : <div className="history-empty"><span><ReceiptText size={26} /></span><strong>{query || direction !== 'all' ? 'No matching moves.' : 'Your next chapter starts here.'}</strong><p>{query || direction !== 'all' ? 'Try another search or clear your filters.' : 'Your transfers will find a home here as you go.'}</p>{(query || direction !== 'all') && <button className="button secondary" onClick={() => { setQuery(''); setDirection('all') }}>Clear filters</button>}</div>}
    {!compact && accountId && initial.length >= 20 && more && <button className="button ghost load-more" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore && <LoaderCircle className="spin" size={16} />} Load older transfers</button>}
    {!compact && <p className="history-footnote"><RotateCcw size={14} /> Reversal is available for completed outgoing transfers in Development. Finance determines whether a request can proceed.</p>}
    {selected && <Modal title={reversing ? 'Reverse this transfer?' : 'A closer look'} onClose={close}>
      <div className="transfer-receipt"><span className={`receipt-symbol ${reversing ? 'is-reversing' : ''}`}>{reversing ? <RotateCcw size={25} /> : <ReceiptText size={25} />}</span><strong>{hidden ? '••••••' : money(selected.amount, selected.currency)}</strong><span className="sample-badge">{reversals[selected.id] ? 'Reversal confirmed this session' : selected.status}</span></div>
      <dl className="receipt-details"><div><dt>From account</dt><dd>{selected.fromAccountId}</dd></div><div><dt>To account</dt><dd>{selected.toAccountId}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.createdAt))}</dd></div><div><dt>Transfer ID</dt><dd>{selected.id}<button className="icon-button" aria-label="Copy transfer ID" onClick={() => void navigator.clipboard.writeText(selected.id).then(() => setCopied(true)).catch(() => setDialogError('Copy is unavailable. You can select and copy the transfer ID.'))}>{copied ? <CheckCheck size={15} /> : <Copy size={15} />}</button></dd></div></dl>
      {dialogError && <Notice>{dialogError}</Notice>}
      {reversing ? <form className="reversal-form" onSubmit={reverse}><p className="reversal-explanation">This asks Finance to return the full amount from the original recipient to the original sender. The recipient must have enough funds. Available only in Development.</p><label>Why are you reversing it?<textarea data-autofocus required maxLength={500} rows={3} value={reason} disabled={busy || attempts.current.has(selected.id)} onChange={event => setReason(event.target.value)} placeholder="A brief reason for your records" /></label><span className="character-count">{reason.length}/500</span>{attempts.current.has(selected.id) && <p className="form-hint">Retries keep the same reason and request ID to avoid duplicate submissions.</p>}<div className="modal-actions"><button type="button" className="button ghost" disabled={busy} onClick={close}>Keep transfer</button><button className="button reversal-button" disabled={busy || !reason.trim() || reason.trim().length > 500}>{busy ? <LoaderCircle className="spin" size={17} /> : <RotateCcw size={17} />}{busy ? 'Requesting reversal…' : 'Confirm reversal'}</button></div></form> : <div className="modal-actions"><button className="button ghost" onClick={close}>Close</button>{canReverse(selected) && <button className="button secondary" onClick={() => setReversing(true)}><RotateCcw size={16} /> Reverse transfer</button>}</div>}
    </Modal>}
  </section>
}
