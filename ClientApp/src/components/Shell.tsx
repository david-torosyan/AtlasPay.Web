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
import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { signOut } from '../session'
import type { PublicConfig } from '../types'
import { useAtlasState } from '../state'
import { Logo } from './Logo'
import { useDialogFocus } from './useDialogFocus'
import { WorkspaceTools } from './WorkspaceTools'

const links = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, preload: () => import('../pages/DashboardPage') },
  { to: '/accounts', label: 'Accounts', icon: WalletCards, preload: () => import('../pages/AccountsPage') },
  { to: '/payments', label: 'Move money', icon: ArrowLeftRight, preload: () => import('../pages/PaymentsPage') },
  { to: '/notifications', label: 'Notifications', icon: Bell, preload: () => import('../pages/NotificationsPage') },
]

export function Shell({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const { profile } = useAtlasState()
  const [open, setOpen] = useState(false)
  const menu = useDialogFocus(open, () => setOpen(false))
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])
  const name = auth.user?.profile.name || auth.user?.profile.preferred_username || 'AtlasPay customer'
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const preloadRoutes = () => { links.forEach(({ preload }) => void preload()) }
    const scheduleIdle = window.requestIdleCallback?.bind(window)
    if (scheduleIdle) {
      const request = scheduleIdle(preloadRoutes, { timeout: 1500 })
      return () => window.cancelIdleCallback(request)
    }
    const request = globalThis.setTimeout(preloadRoutes, 500)
    return () => globalThis.clearTimeout(request)
  }, [])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to content</a>
      <div className="app-ambient app-ambient-one" aria-hidden="true" />
      <div className="app-ambient app-ambient-two" aria-hidden="true" />
      <aside ref={menu} id="banking-navigation" aria-label="Banking navigation" role={open ? 'dialog' : undefined} aria-modal={open || undefined} className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head">
          <Logo />
          <button className="icon-button close-menu" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <p className="sidebar-tagline">A little more possibility.</p>
        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-label">Banking</p>
          {links.map(({ to, label, icon: Icon, preload }) => (
            <NavLink key={to} to={to} onPointerEnter={() => void preload()} onFocus={() => void preload()} onClick={() => setOpen(false)}>
              <Icon size={19} /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note"><span className="sidebar-note-art" aria-hidden="true">✳</span><strong>Make room for what matters.</strong><p>A calmer space for your everyday money.</p></div>
        <div className="sidebar-foot">
          <div className="mini-profile">
            <span className="avatar">{initials}</span>
            <div><strong>{name}</strong><small>{profile?.customerId.slice(0, 8) ?? 'Secure session'}</small></div>
          </div>
          <button
            className="logout-button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true)
              void signOut(auth, config.postLogoutRedirectUrl).catch(() => window.location.replace('/'))
            }}
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close menu" />}
      <main className="main-content" id="workspace" tabIndex={-1} inert={open}>
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="banking-navigation"><Menu /></button>
          <Logo />
          <span className="avatar small"><UserRound size={17} /></span>
        </header>
        <WorkspaceTools />
        <Outlet />
      </main>
    </div>
  )
}
