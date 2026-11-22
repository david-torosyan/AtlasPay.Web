import { useEffect, useRef } from 'react'

export function useDialogFocus(active: boolean, onClose: () => void) {
  const container = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!active || !container.current) return
    const previous = document.activeElement as HTMLElement | null
    const root = container.current
    const controls = () => [...root.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length > 0)
    ;(root.querySelector<HTMLElement>('[data-autofocus]') ?? controls()[0])?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current() }
      if (event.key !== 'Tab') return
      const items = controls()
      const first = items[0]; const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    root.addEventListener('keydown', keyboard)
    return () => { root.removeEventListener('keydown', keyboard); previous?.focus() }
  }, [active])
  return container
}
