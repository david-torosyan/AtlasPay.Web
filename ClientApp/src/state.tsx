import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApi } from './api'
import type { Account, AtlasUser, PublicConfig } from './types'

interface AtlasState {
  accounts: Account[]
  profile?: AtlasUser
  loading: boolean
  error?: string
  refresh: () => Promise<void>
  rememberAccount: (id: string) => Promise<void>
  forgetAccount: (id: string) => void
}

const Context = createContext<AtlasState | undefined>(undefined)

export function AtlasStateProvider({
  config,
  children,
}: {
  config: PublicConfig
  children: React.ReactNode
}) {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const subject = auth.user?.profile.sub ?? 'anonymous'
  const storageKey = `${config.knownAccountStoragePrefix}.${subject}`
  const api = useMemo(() => createApi(config, token), [config, token])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profile, setProfile] = useState<AtlasUser>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()

  const getIds = useCallback((): string[] => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]
    } catch {
      return []
    }
  }, [storageKey])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(undefined)
    try {
      const ids = getIds()
      const [user, accountResults] = await Promise.all([
        api.getProfile(),
        Promise.allSettled(ids.map((id) => api.getAccount(id))),
      ])
      setProfile(user)
      setAccounts(
        accountResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
      )
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AtlasPay data could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [api, getIds, token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const rememberAccount = useCallback(
    async (id: string) => {
      const account = await api.getAccount(id)
      const ids = Array.from(new Set([...getIds(), id]))
      localStorage.setItem(storageKey, JSON.stringify(ids))
      setAccounts((current) => [...current.filter((item) => item.accountId !== id), account])
    },
    [api, getIds, storageKey],
  )

  const forgetAccount = useCallback(
    (id: string) => {
      const ids = getIds().filter((item) => item !== id)
      localStorage.setItem(storageKey, JSON.stringify(ids))
      setAccounts((current) => current.filter((item) => item.accountId !== id))
    },
    [getIds, storageKey],
  )

  return (
    <Context.Provider
      value={{ accounts, profile, loading, error, refresh, rememberAccount, forgetAccount }}
    >
      {children}
    </Context.Provider>
  )
}

export function useAtlasState() {
  const value = useContext(Context)
  if (!value) throw new Error('useAtlasState must be used inside AtlasStateProvider.')
  return value
}
