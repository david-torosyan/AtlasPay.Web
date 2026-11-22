import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { useDialogFocus } from './useDialogFocus'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="page-header">
      <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading your banking data…' }: { label?: string }) {
  return <div className="loading-block"><LoaderCircle className="spin" /><span>{label}</span></div>
}

export function EmptyState({ icon, title, message, action }: { icon: React.ReactNode; title: string; message: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{message}</p>{action}</div>
}

export function Notice({ type = 'error', children, onClose }: { type?: 'error' | 'success' | 'info'; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
      <div>{children}</div>
      {onClose && <button className="icon-button" onClick={onClose} aria-label="Dismiss"><X size={18} /></button>}
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useDialogFocus(true, onClose)
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div>
        {children}
      </section>
    </div>
  )
}

export function shortId(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

const moneyFormatters = new Map<string, Intl.NumberFormat>()
export function money(value: number, currency: string) {
  let formatter = moneyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency })
    moneyFormatters.set(currency, formatter)
  }
  return formatter.format(value)
}
