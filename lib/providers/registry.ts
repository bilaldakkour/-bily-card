import { DailyCardProviderAdapter } from '@/lib/providers/adapters/dailycardAdapter'
import { Go4CardProviderAdapter } from '@/lib/providers/adapters/go4cardAdapter'
import type { ProviderAdapter } from '@/lib/providers/types'

export function getProviderAdapters(): ProviderAdapter[] {
  const secondaryProviderKind = String(
    process.env.SECONDARY_PROVIDER_KIND || process.env.SECONDARY_PROVIDER_ADAPTER || 'dailycard'
  )
    .trim()
    .toLowerCase()

  const secondaryAdapter =
    secondaryProviderKind === 'go4card'
      ? new Go4CardProviderAdapter('secondary')
      : new DailyCardProviderAdapter('secondary')

  return [
    new DailyCardProviderAdapter('primary'),
    secondaryAdapter,
  ]
}

export function getEnabledProviderAdapters(): ProviderAdapter[] {
  return getProviderAdapters().filter((adapter) => adapter.isAvailable())
}

export function getProviderAdapterBySlotAndKey(params: {
  slot: 'primary' | 'secondary'
  key?: string | null
}) {
  const adapters = getProviderAdapters().filter((adapter) => adapter.slot === params.slot)
  if (!adapters.length) return null

  const desiredKey = String(params.key || '').trim().toLowerCase()
  if (!desiredKey) {
    return adapters.find((adapter) => adapter.isAvailable()) || adapters[0]
  }

  return (
    adapters.find((adapter) => adapter.key === desiredKey && adapter.isAvailable()) ||
    adapters.find((adapter) => adapter.isAvailable()) ||
    adapters[0]
  )
}
