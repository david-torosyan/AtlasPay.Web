import type { AuthContextProps } from 'react-oidc-context'

export const oidcStatePrefix = 'atlaspay.oidc.'
const signedOutKey = 'atlaspay.signed-out'

export function isWorkspacePath(pathname: string) {
  return ['/dashboard', '/accounts', '/payments', '/notifications'].includes(pathname.replace(/\/+$/, ''))
}

export function returnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  const url = new URL(value, window.location.origin)
  return url.origin === window.location.origin && isWorkspacePath(url.pathname)
    ? `${url.pathname}${url.search}${url.hash}` : '/dashboard'
}

export function currentPath() {
  return returnPath(`${window.location.pathname}${window.location.search}${window.location.hash}`)
}

export function wasSignedOut() {
  return window.sessionStorage.getItem(signedOutKey) === 'true'
}

export async function signIn(auth: AuthContextProps, path = currentPath()) {
  window.sessionStorage.removeItem(signedOutKey)
  await auth.clearStaleState()
  await auth.signinRedirect({ prompt: 'login', max_age: 0, state: { returnUrl: returnPath(path) } })
}

export async function signOut(auth: AuthContextProps, redirectUrl: string) {
  const idToken = auth.user?.id_token
  window.sessionStorage.setItem(signedOutKey, 'true')
  auth.stopSilentRenew()
  await auth.removeUser()
  // Only transient AtlasPay OAuth state is stored; credentials and banking data stay in memory.
  Object.keys(window.sessionStorage).filter((key) => key.startsWith(oidcStatePrefix))
    .forEach((key) => window.sessionStorage.removeItem(key))
  await auth.signoutRedirect({ id_token_hint: idToken, post_logout_redirect_uri: redirectUrl })
}
