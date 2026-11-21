import {
  ArrowLeftRight,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { NavLink, Outlet } from 'react-router-dom'
import type { PublicConfig } from '../types'
import { useAtlasState } from '../state'
import { Logo } from './Logo'

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: WalletCards },
  { to: '/payments', label: 'Move money', icon: ArrowLeftRight },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

export function Shell({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { profile } = useAtlasState()
  const [open, setOpen] = useState(false)
  const name = auth.user?.profile.name || auth.user?.profile.preferred_username || 'AtlasPay customer'
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <Logo />
          <button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-label">Banking</p>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={19} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="mini-profile">
            <span className="avatar">{initials}</span>
            <div><strong>{name}</strong><small>{profile?.customerId.slice(0, 8) ?? 'Secure session'}</small></div>
          </div>
          <button
            className="logout-button"
            onClick={() => void auth.signoutRedirect({ post_logout_redirect_uri: config.postLogoutRedirectUrl })}
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
          <Logo />
          <span className="avatar small"><UserRound size={17} /></span>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
