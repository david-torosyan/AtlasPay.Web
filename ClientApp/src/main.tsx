import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context'
import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts'
import App from './App'
import { loadConfig } from './config'
import type { PublicConfig } from './types'
import './styles.css'
import './studio.css'
import { oidcStatePrefix, returnPath } from './session'
import { AppearanceProvider } from './appearance'

function Bootstrap() {
  const [config, setConfig] = useState<PublicConfig>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    loadConfig().then(setConfig).catch((reason: Error) => setError(reason.message))
  }, [])

  if (error) return <div className="boot-error"><h1>AtlasPay is unavailable</h1><p>{error}</p></div>
  if (!config) return <div className="app-loader"><span className="brand-mark">A</span><p>Opening AtlasPay…</p></div>

  const oidcConfig: AuthProviderProps = {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUrl,
    silent_redirect_uri: config.silentRedirectUrl,
    post_logout_redirect_uri: config.postLogoutRedirectUrl,
    response_type: 'code',
    scope: config.scope,
    automaticSilentRenew: false,
    accessTokenExpiringNotificationTimeInSeconds: 60,
    silentRequestTimeoutInSeconds: 10,
    monitorSession: true,
    stateStore: new WebStorageStateStore({ store: window.sessionStorage, prefix: oidcStatePrefix }),
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    onSigninCallback: (user) => {
      const state = user?.state as { returnUrl?: unknown } | undefined
      window.history.replaceState({}, document.title, returnPath(state?.returnUrl))
    },
  }

  return (
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <AppearanceProvider><App config={config} /></AppearanceProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Bootstrap />)
