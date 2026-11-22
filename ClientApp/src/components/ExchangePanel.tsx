import { ArrowLeftRight, Globe2, Info } from 'lucide-react'
import { useState } from 'react'
import { AnimatedMoney } from './AnimatedMoney'
import type { Currency } from '../types'

// Deliberately fixed design examples. These are never used for a payment or account balance.
const usdValue: Record<Currency, number> = { USD: 1, EUR: 1.085, AMD: 1 / 388 }
const currencies: Currency[] = ['USD', 'EUR', 'AMD']
const samples = [
  { from: 'USD', to: 'AMD', value: '388.00', symbol: '$', line: 'M0 36L18 30L36 35L54 20L72 24L90 12L108 18L126 8L144 14L164 4' },
  { from: 'EUR', to: 'AMD', value: '420.98', symbol: '€', line: 'M0 30L18 34L36 20L54 26L72 16L90 22L108 8L126 16L144 6L164 10' },
  { from: 'EUR', to: 'USD', value: '1.0850', symbol: '€', line: 'M0 32L18 24L36 28L54 18L72 26L90 10L108 16L126 8L144 12L164 4' },
]

export function ExchangePanel({ compact = false }: { compact?: boolean }) {
  const [from, setFrom] = useState<Currency>('USD')
  const [to, setTo] = useState<Currency>('AMD')
  const [amount, setAmount] = useState('100')
  const number = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(number) && number >= 0 && number <= 1_000_000_000
  const rate = usdValue[from] / usdValue[to]
  return <section className={`panel exchange-panel ${compact ? 'exchange-compact' : ''}`} aria-label="Illustrative exchange rates">
    <div className="panel-head"><div><span className="eyebrow"><Globe2 size={14} /> A world of possibilities</span><h2>A little currency perspective.</h2></div><span className="sample-badge">Illustrative rates</span></div>
    <div className="exchange-layout"><div className="quote-grid">{samples.map(item => <div className="quote-card" key={`${item.from}-${item.to}`}><div className="quote-heading"><span className="currency-symbol">{item.symbol}</span><span>{item.from}<small>to {item.to}</small></span></div><strong>{item.value}</strong><svg viewBox="0 0 164 44" fill="none" aria-hidden="true"><path d={item.line} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" /></svg><small>Sample rate · 1 {item.from}</small></div>)}</div>
      {!compact && <div className="converter"><div className="converter-title"><strong>Try a conversion</strong><span>Just for perspective</span></div><div className="converter-input"><label>Amount<input inputMode="decimal" type="number" min="0" max="1000000000" step="any" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>From<select value={from} onChange={event => setFrom(event.target.value as Currency)}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label><button className="icon-button swap-button" onClick={() => { setFrom(to); setTo(from) }} aria-label="Swap currencies"><ArrowLeftRight size={18} /></button><label>To<select value={to} onChange={event => setTo(event.target.value as Currency)}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label></div><div className="converter-result"><span>You would get approximately</span><strong>{valid ? <AnimatedMoney value={number * rate} currency={to} /> : 'Enter a valid amount'}</strong><small>1 {from} ≈ {new Intl.NumberFormat('en', { maximumFractionDigits: 4 }).format(rate)} {to}</small></div></div>}
    </div><p className="exchange-disclaimer"><Info size={14} /> Fixed sample values and decorative charts for illustration. These are not live quotes. Currency exchange is not available here.</p>
  </section>
}
