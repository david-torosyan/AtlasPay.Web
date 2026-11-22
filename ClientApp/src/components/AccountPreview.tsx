import { Pause, Play, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppearance } from '../appearance'

const examples = [
  { currency: 'USD', title: 'Everyday account', balance: '$24,680.50', note: 'USD · A little room to dream.' },
  { currency: 'EUR', title: 'Your next adventure', balance: '€18,450.75', note: 'EUR · A little closer to everywhere.' },
  { currency: 'AMD', title: 'Your home account', balance: '֏9,575,000.00', note: 'AMD · More room for your everyday.' },
]
const lines = (index: number) => {
  const example = examples[index]
  return [example.title, example.balance, example.note]
}
const length = (index: number) => lines(index).join('').length
type Frame = { index: number; characters: number; phase: 'hold' | 'erase' | 'type' }

export function AccountPreview() {
  const { motion } = useAppearance()
  const [frame, setFrame] = useState<Frame>({ index: 0, characters: length(0), phase: 'hold' })
  const [paused, setPaused] = useState(false)
  const [foreground, setForeground] = useState(!document.hidden)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const complete = !motion || reduced
  const running = !paused && foreground
  const example = examples[frame.index]

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(preference.matches)
    preference.addEventListener('change', change)
    const visibility = () => setForeground(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { preference.removeEventListener('change', change); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    if (!running) return
    // Autoplay never waits for a click or for an intersection-observer callback.
    // Reduced motion changes the whole example on a timer instead of typing it.
    const delay = complete ? 4500 : frame.phase === 'hold' ? 2400 : frame.phase === 'erase' ? (frame.characters ? 14 : 180) : 32
    const timer = window.setTimeout(() => setFrame(current => {
      if (complete) {
        const next = (current.index + 1) % examples.length
        return { index: next, characters: length(next), phase: 'hold' }
      }
      if (current.phase === 'hold') return { ...current, phase: 'erase' }
      if (current.phase === 'erase') return current.characters > 0
        ? { ...current, characters: current.characters - 1 }
        : { index: (current.index + 1) % examples.length, characters: 0, phase: 'type' }
      return current.characters < length(current.index)
        ? { ...current, characters: current.characters + 1 }
        : { ...current, phase: 'hold' }
    }), delay)
    return () => window.clearTimeout(timer)
  }, [frame, running, complete])

  const values = lines(frame.index)
  let remaining = complete ? length(frame.index) : frame.characters
  const text = values.map(value => {
    const part = value.slice(0, Math.max(0, remaining))
    remaining -= value.length
    return part
  })
  const firstIncomplete = text.findIndex((value, index) => value.length < values[index].length)
  const cursorLine = frame.phase === 'hold' ? 1 : frame.phase === 'erase'
    ? text.reduce((last, value, index) => value.length ? index : last, 0)
    : firstIncomplete < 0 ? 2 : firstIncomplete
  const cursor = (index: number) => !complete && cursorLine === index && <span className={`typing-caret ${running ? '' : 'caret-paused'}`} aria-hidden="true" />
  return <div data-phase={frame.phase} className={`preview-account rotating-account account-demo-${example.currency.toLowerCase()} ${running ? 'demo-playing' : 'demo-paused'}`}>
    <div className="demo-account-visual" role="img" aria-label={`Illustrative ${example.currency} account: ${example.title}, ${example.balance}. ${example.note}`}>
      <div className="demo-account-heading" aria-hidden="true"><span>{text[0]}{cursor(0)}</span><WalletCards size={20} /></div>
      <strong className="preview-balance demo-typed-balance" aria-hidden="true">{text[1]}{cursor(1)}</strong>
      <small className="demo-typed-note" aria-hidden="true">{text[2]}{cursor(2)}</small>
    </div>
    <span className="preview-account-flower" aria-hidden="true" key={example.currency}>✳</span>
    <div className="demo-account-controls"><div className="demo-currency-indicators" aria-hidden="true">{examples.map((item, index) => <span key={item.currency} className={frame.index === index ? 'current' : ''}>{item.currency}</span>)}</div><button className="demo-play-control" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume automatic account preview' : 'Pause automatic account preview'} title={paused ? 'Resume animation' : 'Pause animation'}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div>
  </div>
}
