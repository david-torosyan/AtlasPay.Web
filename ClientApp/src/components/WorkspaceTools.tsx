import { ArrowLeftRight, Bell, Command, LayoutDashboard, Moon, Search, Sparkles, Sun, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppearance } from '../appearance'
import { Modal } from './Common'

const destinations = [
  { title: 'Your overview', description: 'Balances, accounts, and currency perspective', to: '/dashboard', icon: LayoutDashboard },
  { title: 'Your accounts', description: 'Manage currencies and account status', to: '/accounts', icon: WalletCards },
  { title: 'Send money', description: 'Make a transfer to another account', to: '/payments?type=transfer', icon: ArrowLeftRight },
  { title: 'Withdraw funds', description: 'Withdraw from an active account', to: '/payments?type=withdraw', icon: WalletCards },
  { title: 'Transfers & history', description: 'Browse activity and transfer details', to: '/payments?view=history', icon: Search },
  { title: 'Notification preferences', description: 'Choose the alerts that matter', to: '/notifications', icon: Bell },
]

export function AppearanceControls() {
  const { dark, motion, toggleTheme, toggleMotion } = useAppearance()
  return <div className="appearance-controls"><button className="icon-button" onClick={toggleTheme} aria-label={dark ? 'Use light appearance' : 'Use dark appearance'} title={dark ? 'Light appearance' : 'Dark appearance'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button><button className={`icon-button motion-control ${motion ? 'enabled' : ''}`} onClick={toggleMotion} aria-label={motion ? 'Reduce decorative motion' : 'Enable decorative motion'} aria-pressed={motion} title="Toggle decorative motion"><Sparkles size={19} /></button></div>
}

export function WorkspaceTools() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const title = location.pathname === '/accounts' ? 'Accounts' : location.pathname === '/payments' ? 'Move money' : location.pathname === '/notifications' ? 'Notifications' : 'Overview'
  const matches = destinations.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen(value => !value); setQuery('') }
    }
    document.addEventListener('keydown', keyboard)
    return () => document.removeEventListener('keydown', keyboard)
  }, [])
  function go(to: string) { setOpen(false); setQuery(''); navigate(to) }
  return <><div className="workspace-toolbar"><div className="workspace-breadcrumb"><span>Personal workspace</span><i>/</i><strong>{title}</strong></div><div className="toolbar-actions"><button className="workspace-search" onClick={() => setOpen(true)}><Search size={17} /><span>Jump to anything</span><kbd><Command size={11} /> K</kbd></button><AppearanceControls /><Link className="icon-button toolbar-bell" to="/notifications" aria-label="Notification preferences"><Bell size={19} /></Link></div></div>
    {open && <Modal title="Where would you like to go?" onClose={() => setOpen(false)}><div className="command-search"><Search size={20} /><input data-autofocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pages and actions…" aria-label="Search pages and actions" onKeyDown={event => { if (event.key === 'Enter' && matches[0]) { event.preventDefault(); go(matches[0].to) } }} /></div><div className="command-results">{matches.length ? matches.map(item => <button key={item.title} onClick={() => go(item.to)}><span className="command-icon"><item.icon size={20} /></span><span><strong>{item.title}</strong><small>{item.description}</small></span></button>) : <p className="command-empty">No matches yet. Try “accounts” or “send”.</p>}</div><p className="command-hint">Enter opens the first match · Esc closes this window</p></Modal>}
  </>
}
