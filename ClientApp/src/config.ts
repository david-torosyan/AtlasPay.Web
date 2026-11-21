import type { PublicConfig } from './types'

let configPromise: Promise<PublicConfig> | undefined

export function loadConfig(): Promise<PublicConfig> {
  configPromise ??= fetch('/api/config').then(async (response) => {
    if (!response.ok) throw new Error('AtlasPay configuration could not be loaded.')
    return (await response.json()) as PublicConfig
  })
  return configPromise
}
