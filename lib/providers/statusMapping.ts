import type { NormalizedOrderStatus } from '@/lib/providers/types'

export function mapProviderOrderStatus(providerKey: string, rawStatus: unknown): NormalizedOrderStatus {
  const provider = String(providerKey || '').trim().toLowerCase()
  const raw = String(rawStatus || '').trim().toLowerCase()

  if (provider === 'go4card') {
    if (raw === 'accept') return 'completed'
    if (raw === 'wait') return 'pending'
    if (raw === 'reject') return 'failed'
  }

  if (raw === 'accept') return 'completed'
  if (raw === 'wait') return 'pending'
  if (raw === 'reject') return 'failed'

  if (['completed', 'success', 'done'].includes(raw)) return 'completed'
  if (['processing', 'in_progress', 'running'].includes(raw)) return 'processing'
  if (['cancelled', 'canceled'].includes(raw)) return 'cancelled'
  if (['refunded'].includes(raw)) return 'refunded'
  if (['failed', 'error', 'rejected'].includes(raw)) return 'failed'
  return 'pending'
}

export function toProviderSafeRawStatus(value: unknown): 'accept' | 'wait' | 'reject' {
  const normalized = mapProviderOrderStatus('generic', value)
  if (normalized === 'completed') return 'accept'
  if (normalized === 'pending' || normalized === 'processing') return 'wait'
  return 'reject'
}

export function mapNormalizedOrderStatusToLocal(normalized: NormalizedOrderStatus): string {
  if (normalized === 'cancelled') return 'refunded'
  return normalized
}

export function customerSafeOrderStatusMessage(status: string) {
  const value = String(status || '').toLowerCase()
  if (value === 'failed' || value === 'rejected') return 'We could not complete this order.'
  if (value === 'refunded') return 'This order was refunded.'
  if (value === 'completed') return 'Order completed successfully.'
  return 'Your order is being processed.'
}
