import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, type AuthProviderProps } from 'react-oidc-context'
import { InMemoryWebStorage, WebStorageStateStore } from 'oidc-client-ts'
import App from './App'
import { loadConfig } from './config'
import type { PublicConfig } from './types'
import './styles.css'

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
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
    onSigninCallback: () => window.history.replaceState({}, document.title, '/dashboard'),
  }

  return (
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <App config={config} />
      </BrowserRouter>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<Bootstrap />)
