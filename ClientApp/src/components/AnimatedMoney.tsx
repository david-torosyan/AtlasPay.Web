import { useEffect, useRef, useState } from 'react'
import { money } from './Common'
import { useAppearance } from '../appearance'

export function AnimatedMoney({ value, currency, hidden = false }: { value: number; currency: string; hidden?: boolean }) {
  const { motion } = useAppearance()
  const [display, setDisplay] = useState(0)
  const current = useRef(0)
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (hidden || reducedMotion.matches || !motion) { current.current = value; setDisplay(value); return }
    const from = current.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 700, 1)
      current.current = from + (value - from) * (1 - Math.pow(1 - progress, 3))
      setDisplay(current.current)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const finish = () => {
      if (reducedMotion.matches) { cancelAnimationFrame(frame); current.current = value; setDisplay(value) }
    }
    reducedMotion.addEventListener('change', finish)
    return () => { cancelAnimationFrame(frame); reducedMotion.removeEventListener('change', finish) }
  }, [value, currency, hidden, motion])
  return <span className="animated-money"><span className="sr-only">{hidden ? 'Balance hidden' : money(value, currency)}</span><span aria-hidden="true">{hidden ? '••••••' : money(display, currency)}</span></span>
}
