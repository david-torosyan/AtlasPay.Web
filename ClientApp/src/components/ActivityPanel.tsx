import { useMemo, useState } from 'react'
import { useAtlasState } from '../state'

export function ActivityPanel() {
  const { transactionsByAccount } = useAtlasState()
  const [selected, setSelected] = useState(6)
  const days = useMemo(() => {
    const unique = [...new Map(Object.values(transactionsByAccount).flat().map(item => [item.id, item])).values()]
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - 6 + index)
      const end = new Date(date); end.setDate(end.getDate() + 1)
      return { date, count: unique.filter(item => { const time = Date.parse(item.createdAt); return time >= date.getTime() && time < end.getTime() }).length }
    })
  }, [transactionsByAccount])
  const max = Math.max(1, ...days.map(day => day.count))
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const selectedDay = days[selected]
  return <section className="panel activity-panel"><div className="panel-head"><div><span className="eyebrow">The shape of your week</span><h2>Little moves. Your rhythm.</h2></div><span className="sample-badge">Last 7 days</span></div><div className="activity-total"><strong>{total}</strong><span>{total === 1 ? 'transfer started' : 'transfers started'}<small>in your loaded history</small></span></div><div className="activity-chart" role="group" aria-label="Daily transfer counts">{days.map((day, index) => <button key={day.date.toISOString()} className={selected === index ? 'selected' : ''} aria-pressed={selected === index} onClick={() => setSelected(index)} aria-label={`${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(day.date)}: ${day.count} transfers`}><span className="activity-bar-track"><span className="activity-bar" style={{ height: `${day.count ? Math.max(12, day.count / max * 100) : 3}%` }} /><span className="activity-bar-count">{day.count}</span></span><small>{new Intl.DateTimeFormat('en', { weekday: 'narrow' }).format(day.date)}</small></button>)}</div><div className="activity-selected" aria-live="polite"><strong>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(selectedDay.date)}</strong><span>{selectedDay.count} {selectedDay.count === 1 ? 'transfer' : 'transfers'}</span></div><p className="activity-caption">Based on the latest loaded transfers, including all statuses. Older activity may be missing.</p></section>
}
