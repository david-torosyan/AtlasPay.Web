import { LoaderCircle } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { LandingPage } from './pages/LandingPage'
import { AtlasStateProvider } from './state'
import type { PublicConfig } from './types'
import { currentPath, isWorkspacePath, returnPath, signIn, wasSignedOut } from './session'

const AccountsPage = lazy(() => import('./pages/AccountsPage').then((module) => ({ default: module.AccountsPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((module) => ({ default: module.PaymentsPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))

function RouteLoader() {
  return <div className="app-loader"><LoaderCircle className="spin" /><p>Opening your workspace…</p></div>
}

function SessionRecovery() {
  const auth = useAuth()
  const recovering = useRef(false)

  const renew = useCallback(async () => {
    if (recovering.current || !auth.isAuthenticated || wasSignedOut()) return
    recovering.current = true

    try {
      const user = await auth.signinSilent()
      if (wasSignedOut()) { await auth.removeUser(); return }
      if (!user?.access_token) throw new Error('Keycloak did not return a renewed access token.')
    } catch {
      if (wasSignedOut()) return
      await auth.removeUser()
      await auth.clearStaleState()
      await auth.signinRedirect({ state: { returnUrl: currentPath() } })
    } finally {
      recovering.current = false
    }
  }, [auth])

  useEffect(() => {
    const removeExpiring = auth.events.addAccessTokenExpiring(() => void renew())
    const removeExpired = auth.events.addAccessTokenExpired(() => void renew())
    return () => {
      removeExpiring()
      removeExpired()
    }
  }, [auth.events, renew])

  return null
}

function AuthCallback() {
  const auth = useAuth()

  async function retry() {
    await auth.removeUser()
    await auth.clearStaleState()
    await signIn(auth)
  }

  if (auth.error) {
    return (
      <div className="boot-error">
        <h1>Sign-in could not be completed</h1>
        <p>{auth.error.message}</p>
        <button className="button primary" onClick={() => void retry()}>Start a new sign-in</button>
      </div>
    )
  }

  if (auth.isAuthenticated) return <Navigate to={returnPath((auth.user?.state as { returnUrl?: unknown })?.returnUrl)} replace />

  if (!auth.isLoading && !auth.activeNavigator) {
    return (
      <div className="boot-error">
        <h1>Your sign-in session expired</h1>
        <p>AtlasPay could not finish the previous request. Start a new secure sign-in.</p>
        <button className="button primary" onClick={() => void retry()}>Sign in again</button>
      </div>
    )
  }

  return <div className="app-loader"><LoaderCircle className="spin" /><p>Completing sign-in…</p></div>
}

function Protected({ config }: { config: PublicConfig }) {
  const auth = useAuth(); const location = useLocation()
  if (auth.isLoading || (auth.activeNavigator && auth.activeNavigator !== 'signinSilent')) return <div className="app-loader"><span className="brand-mark">A</span><LoaderCircle className="spin" /><p>Securing your session…</p></div>
  if (!auth.isAuthenticated) return <div className="boot-error"><span className="brand-mark">A</span><h1>Welcome back</h1><p>Sign in securely to continue where you left off.</p><button className="button primary" onClick={() => void signIn(auth, `${location.pathname}${location.search}${location.hash}`)}>Sign in to continue</button></div>
  return <AtlasStateProvider config={config}><Suspense fallback={<RouteLoader />}><Routes><Route element={<Shell config={config} />}><Route index element={<Navigate to="/dashboard" replace />} /><Route path="dashboard" element={<DashboardPage config={config} />} /><Route path="accounts" element={<AccountsPage config={config} />} /><Route path="payments" element={<PaymentsPage config={config} />} /><Route path="notifications" element={<NotificationsPage config={config} />} /></Route></Routes></Suspense></AtlasStateProvider>
}

export default function App({ config }: { config: PublicConfig }) {
  const auth = useAuth()
  const [restoring, setRestoring] = useState(!wasSignedOut() && isWorkspacePath(window.location.pathname))
  const attempted = useRef(false)
  useEffect(() => {
    if (!restoring || attempted.current || auth.isLoading || auth.activeNavigator) return
    attempted.current = true
    if (auth.isAuthenticated) { setRestoring(false); return }
    // Recover through the identity provider's session, never browser-stored tokens.
    void auth.signinSilent().catch(() => undefined).finally(() => setRestoring(false))
  }, [auth, restoring])
  if (restoring) return <RouteLoader />
  return <><SessionRecovery /><Suspense fallback={<RouteLoader />}><Routes><Route path="/" element={auth.isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} /><Route path="/register" element={<RegisterPage />} /><Route path="/auth/callback" element={<AuthCallback />} /><Route path="/*" element={<Protected config={config} />} /></Routes></Suspense></>
}
