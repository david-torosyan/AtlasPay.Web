import { Bell, BellRing, Mail, MessageSquareText, Smartphone } from 'lucide-react'
import { useAuth } from 'react-oidc-context'
import { useEffect, useMemo, useState } from 'react'
import { createApi } from '../api'
import { LoadingBlock, Notice, PageHeader, shortId } from '../components/Common'
import { useAtlasState } from '../state'
import type { DeliveryChannel, NotificationChannel, NotificationPreference, NotificationType, PublicConfig } from '../types'

const notificationTypes: { value: NotificationType; label: string; detail: string }[] = [
  { value: 'MoneyDeposited', label: 'Money deposited', detail: 'When funds are credited to your account' },
  { value: 'MoneyWithdrawn', label: 'Money withdrawn', detail: 'When money leaves through a withdrawal' },
  { value: 'MoneyTransferred', label: 'Money transferred', detail: 'When a transfer completes' },
  { value: 'SecurityAlert', label: 'Security alerts', detail: 'Important account security information' },
  { value: 'TransferReversed', label: 'Transfer reversed', detail: 'When a transfer is reversed' },
]
const icons = { Email: Mail, Sms: MessageSquareText, Push: Smartphone }

export function NotificationsPage({ config }: { config: PublicConfig }) {
  const auth = useAuth(); const { profile, accounts } = useAtlasState(); const api = useMemo(() => createApi(config, auth.user!.access_token), [auth.user, config])
  const [channels, setChannels] = useState<NotificationChannel[]>([]); const [preferences, setPreferences] = useState<NotificationPreference[]>([]); const [accountPreferences, setAccountPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string>(); const [busyKey, setBusyKey] = useState<string>(); const [selectedAccount, setSelectedAccount] = useState('')

  useEffect(() => { if (!selectedAccount && accounts.length) setSelectedAccount(accounts[0].accountId) }, [accounts, selectedAccount])
  useEffect(() => {
    if (!profile) return
    setLoading(true)
    Promise.all([api.getChannels(), api.getPreferences(profile.id), api.getAccountPreferences(profile.id)])
      .then(([nextChannels, nextPreferences, nextAccountPreferences]) => { setChannels(nextChannels); setPreferences(nextPreferences); setAccountPreferences(nextAccountPreferences) })
      .catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [api, profile])

  function enabled(type: NotificationType, channel: DeliveryChannel, accountId?: string) {
    const source = accountId ? accountPreferences : preferences
    return source.some((item) => item.notificationType === type && item.channel === channel && item.enabled && (!accountId || item.accountId === accountId))
  }

  async function toggle(type: NotificationType, channel: DeliveryChannel, accountId?: string) {
    if (!profile) return
    const key = `${accountId ?? 'global'}-${type}-${channel}`; const next = !enabled(type, channel, accountId); setBusyKey(key); setError(undefined)
    try {
      if (accountId) { await api.setAccountPreference(profile.id, accountId, type, channel, next); setAccountPreferences((current) => [...current.filter((item) => !(item.accountId === accountId && item.notificationType === type && item.channel === channel)), { accountId, notificationType: type, channel, enabled: next }]) }
      else { await api.setPreference(profile.id, type, channel, next); setPreferences((current) => [...current.filter((item) => !(item.notificationType === type && item.channel === channel)), { notificationType: type, channel, enabled: next }]) }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Preference could not be saved.') }
    finally { setBusyKey(undefined) }
  }

  if (loading || !profile) return <div className="page"><LoadingBlock label="Loading notification preferences…" /></div>
  const activeChannels = channels.filter((channel) => channel.isActive)
  return (
    <div className="page"><PageHeader eyebrow="Preferences" title="Notifications" description="Choose how AtlasPay keeps you informed." />
      {error && <Notice onClose={() => setError(undefined)}>{error}</Notice>}
      <section className="channel-strip"><div><span className="channel-main-icon"><BellRing /></span><div><strong>Available channels</strong><p>Channels are managed by the Notification service.</p></div></div><div className="channel-badges">{channels.map(({ channel, isActive }) => { const Icon = icons[channel]; return <span className={isActive ? 'active' : 'inactive'} key={channel}><Icon /> {channel} · {isActive ? 'Available' : 'Unavailable'}</span> })}</div></section>
      {!activeChannels.length ? <Notice type="info">No notification channels are currently active.</Notice> : <>
        <section className="panel preference-panel"><div className="panel-head"><div><span className="eyebrow">Default settings</span><h2>All accounts</h2></div></div><div className="preference-table"><div className="preference-header"><span>Notification</span>{activeChannels.map((item) => <span key={item.channel}>{item.channel}</span>)}</div>{notificationTypes.map((type) => <div className="preference-row" key={type.value}><div><strong>{type.label}</strong><small>{type.detail}</small></div>{activeChannels.map((item) => { const key = `global-${type.value}-${item.channel}`; return <label className="switch" key={item.channel}><input type="checkbox" aria-label={`${type.label}, ${item.channel}, all accounts`} checked={enabled(type.value, item.channel)} disabled={busyKey === key} onChange={() => void toggle(type.value, item.channel)} /><span /></label> })}</div>)}</div></section>
        {accounts.length > 0 && <section className="panel preference-panel"><div className="panel-head"><div><span className="eyebrow">Account overrides</span><h2>Specific account</h2></div><select aria-label="Account for notification overrides" className="compact-select" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>{accounts.map((account) => <option value={account.accountId} key={account.accountId}>{account.currency} · {shortId(account.accountId)}</option>)}</select></div><div className="preference-table"><div className="preference-header"><span>Notification</span>{activeChannels.map((item) => <span key={item.channel}>{item.channel}</span>)}</div>{notificationTypes.map((type) => <div className="preference-row" key={type.value}><div><strong>{type.label}</strong><small>Override for this account</small></div>{activeChannels.map((item) => { const key = `${selectedAccount}-${type.value}-${item.channel}`; return <label className="switch" key={item.channel}><input type="checkbox" aria-label={`${type.label}, ${item.channel}, selected account`} checked={enabled(type.value, item.channel, selectedAccount)} disabled={busyKey === key} onChange={() => void toggle(type.value, item.channel, selectedAccount)} /><span /></label> })}</div>)}</div></section>}
      </>}
    </div>
  )
}
