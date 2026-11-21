import type {
  Account,
  AtlasUser,
  Balance,
  Currency,
  DeliveryChannel,
  NotificationChannel,
  NotificationPreference,
  NotificationType,
  PublicConfig,
  TransactionPage,
} from './types'

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    let message = body || response.statusText
    try {
      const problem = JSON.parse(body) as { title?: string; detail?: string }
      message = problem.detail || problem.title || message
    } catch {
      // Preserve the upstream text when it is not ProblemDetails JSON.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const channelByValue: Record<number, DeliveryChannel> = { 1: 'Email', 2: 'Sms', 3: 'Push' }
const channelValue: Record<DeliveryChannel, number> = { Email: 1, Sms: 2, Push: 3 }
const typeByValue: Record<number, NotificationType> = {
  1: 'MoneyDeposited',
  2: 'MoneyWithdrawn',
  3: 'MoneyTransferred',
  4: 'SecurityAlert',
  5: 'TransferReversed',
}
const typeValue: Record<NotificationType, number> = {
  MoneyDeposited: 1,
  MoneyWithdrawn: 2,
  MoneyTransferred: 3,
  SecurityAlert: 4,
  TransferReversed: 5,
}

const json = (value: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(value),
})

export function createApi(config: PublicConfig, token: string) {
  const finance = config.financeApiUrl
  const notifications = config.notificationApiUrl

  return {
    getProfile: () => request<AtlasUser>('/api/profile', token),
    createAccount: (currency: Currency) =>
      request<{ accountId: string }>(`${finance}/api/accounts`, token, json({ currency })),
    getAccount: (id: string) => request<Account>(`${finance}/api/accounts/${id}`, token),
    getBalance: (id: string) => request<Balance>(`${finance}/api/accounts/${id}/balance`, token),
    getTransactions: (id: string, page = 1) =>
      request<TransactionPage>(
        `${finance}/api/accounts/${id}/transactions?page=${page}&pageSize=20`,
        token,
      ),
    setAccountStatus: (id: string, action: 'activate' | 'freeze' | 'unfreeze') =>
      request<void>(`${finance}/api/accounts/${id}/${action}`, token, { method: 'POST' }),
    deposit: (accountId: string, amount: number, currency: Currency) =>
      request<{ depositId: string }>(
        `${finance}/api/deposits`,
        token,
        json({ requestId: crypto.randomUUID(), accountId, amount, currency }),
      ),
    withdraw: (accountId: string, amount: number, currency: Currency) =>
      request<{ withdrawalId: string }>(
        `${finance}/api/withdrawals`,
        token,
        json({ requestId: crypto.randomUUID(), accountId, amount, currency }),
      ),
    transfer: (fromAccountId: string, toAccountId: string, amount: number, currency: Currency) =>
      request<{ transferId: string }>(
        `${finance}/api/transfers`,
        token,
        json({ requestId: crypto.randomUUID(), fromAccountId, toAccountId, amount, currency }),
      ),
    getChannels: async () => {
      const values = await request<Array<{ channel: number; isActive: boolean }>>(
        `${notifications}/api/notification-channels`, token,
      )
      return values.map((item): NotificationChannel => ({
        channel: channelByValue[item.channel], isActive: item.isActive,
      }))
    },
    getPreferences: async (userId: string) => {
      const values = await request<Array<{ notificationType: number; channel: number; enabled: boolean }>>(
        `${notifications}/api/notification-preferences/${userId}`, token,
      )
      return values.map((item): NotificationPreference => ({
        notificationType: typeByValue[item.notificationType],
        channel: channelByValue[item.channel],
        enabled: item.enabled,
      }))
    },
    getAccountPreferences: async (userId: string) => {
      const values = await request<Array<{ accountId: string; notificationType: number; channel: number; enabled: boolean }>>(
        `${notifications}/api/account-notification-preferences/${userId}`, token,
      )
      return values.map((item): NotificationPreference => ({
        accountId: item.accountId,
        notificationType: typeByValue[item.notificationType],
        channel: channelByValue[item.channel],
        enabled: item.enabled,
      }))
    },
    setPreference: (
      userId: string,
      notificationType: NotificationType,
      channel: DeliveryChannel,
      enabled: boolean,
    ) =>
      request<void>(`${notifications}/api/notification-preferences`, token, {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          notificationType: typeValue[notificationType],
          channel: channelValue[channel],
          enabled,
        }),
      }),
    setAccountPreference: (
      userId: string,
      accountId: string,
      notificationType: NotificationType,
      channel: DeliveryChannel,
      enabled: boolean,
    ) =>
      request<void>(`${notifications}/api/account-notification-preferences`, token, {
        method: 'PUT',
        body: JSON.stringify({
          userId,
          accountId,
          notificationType: typeValue[notificationType],
          channel: channelValue[channel],
          enabled,
        }),
      }),
  }
}

export async function registerUser(input: {
  firstName: string
  lastName: string
  email: string
}) {
  const response = await fetch('/api/registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const problem = (await response.json()) as { title?: string; detail?: string }
    throw new ApiError(problem.detail || problem.title || 'Registration failed.', response.status)
  }
  return (await response.json()) as { userId: string; customerId: string; email: string }
}
