import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { createApi } from './api'
import type { Account, AtlasUser, PublicConfig, Transaction } from './types'

interface AtlasState {
  accounts: Account[]
  transactionsByAccount: Record<string, Transaction[]>
  transactionErrors: Record<string, string>
  transactionsLoading: boolean
  profile?: AtlasUser
  loading: boolean
  error?: string
  refresh: () => Promise<void>
  reversals: Record<string, string>
  recordReversal: (transferId: string, reversalId: string) => void
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
  const api = useMemo(() => createApi(config, token), [config, token])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactionsByAccount, setTransactionsByAccount] = useState<Record<string, Transaction[]>>({})
  const [transactionErrors, setTransactionErrors] = useState<Record<string, string>>({})
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [profile, setProfile] = useState<AtlasUser>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [reversals, setReversals] = useState<Record<string, string>>({})
  const recordReversal = useCallback((transferId: string, reversalId: string) => {
    setReversals(current => ({ ...current, [transferId]: reversalId }))
  }, [])
  const loaded = useRef(false)
  const requestVersion = useRef(0)

  const refresh = useCallback(async () => {
    if (!token) return
    const version = ++requestVersion.current
    setLoading(!loaded.current)
    setError(undefined)
    try {
      const [user, nextAccounts] = await Promise.all([
        api.getProfile(),
        api.getAccounts(),
      ])
      if (version !== requestVersion.current) return
      loaded.current = true
      setProfile(user)
      setAccounts(nextAccounts)
      setLoading(false)

      if (!nextAccounts.length) {
        setTransactionsByAccount({})
        setTransactionErrors({})
        return
      }

      setTransactionsLoading(true)
      const histories = await Promise.allSettled(
        nextAccounts.map((account) => api.getTransactions(account.accountId)),
      )
      if (version !== requestVersion.current) return
      const nextTransactions: Record<string, Transaction[]> = {}
      const nextTransactionErrors: Record<string, string> = {}

      histories.forEach((result, index) => {
        const accountId = nextAccounts[index].accountId
        if (result.status === 'fulfilled') {
          nextTransactions[accountId] = result.value.items
        } else {
          nextTransactions[accountId] = []
          nextTransactionErrors[accountId] = result.reason instanceof Error
            ? result.reason.message
            : 'Transaction history could not be loaded.'
        }
      })

      setTransactionsByAccount(nextTransactions)
      setTransactionErrors(nextTransactionErrors)
    } catch (reason) {
      if (version !== requestVersion.current) return
      setError(reason instanceof Error ? reason.message : 'AtlasPay data could not be loaded.')
    } finally {
      if (version === requestVersion.current) {
        setLoading(false)
        setTransactionsLoading(false)
      }
    }
  }, [api, token])

  useEffect(() => {
    void refresh()
    return () => { requestVersion.current++ }
  }, [refresh])

  return (
    <Context.Provider
      value={{ accounts, transactionsByAccount, transactionErrors, transactionsLoading, profile, loading, error, refresh, reversals, recordReversal }}
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
