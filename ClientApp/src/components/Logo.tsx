import { Landmark } from 'lucide-react'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <span className="logo-icon"><Landmark size={22} strokeWidth={2.2} /></span>
      {!compact && <span>AtlasPay</span>}
    </div>
  )
}
