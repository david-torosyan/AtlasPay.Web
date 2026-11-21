export interface PublicConfig {
  applicationName: string
  authority: string
  clientId: string
  scope: string
  redirectUrl: string
  silentRedirectUrl: string
  postLogoutRedirectUrl: string
  financeApiUrl: string
  notificationApiUrl: string
  knownAccountStoragePrefix: string
}

export type Currency = 'AMD' | 'USD' | 'EUR'
export type AccountStatus = 'Pending' | 'Active' | 'Frozen' | 'Closed'

export interface Account {
  accountId: string
  customerId: string
  currency: Currency
  status: AccountStatus
  balance: number
}

export interface Balance {
  accountId: string
  currency: Currency
  ledgerBalance: number
}

export interface Transaction {
  id: string
  requestId: string
  fromAccountId: string
  toAccountId: string
  amount: number
  currency: Currency
  status: string
  createdAt: string
  completedAt: string | null
}

export interface TransactionPage {
  items: Transaction[]
  page: number
  pageSize: number
  totalCount: number
}

export interface AtlasUser {
  id: string
  customerId: string
  keycloakUserId: string
  createdAt: string
}

export type DeliveryChannel = 'Email' | 'Sms' | 'Push'
export type NotificationType =
  | 'MoneyDeposited'
  | 'MoneyWithdrawn'
  | 'MoneyTransferred'
  | 'SecurityAlert'
  | 'TransferReversed'

export interface NotificationChannel {
  channel: DeliveryChannel
  isActive: boolean
}

export interface NotificationPreference {
  notificationType: NotificationType
  channel: DeliveryChannel
  enabled: boolean
  accountId?: string
}
