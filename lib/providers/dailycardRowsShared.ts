import { getProviderAdapters } from '@/lib/providers/registry'
import type { UnifiedInternalProduct } from '@/lib/providers/types'

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

export async function getDailycardRowsShared(): Promise<UnifiedInternalProduct[]> {
  const allAdapters = getProviderAdapters().filter((adapter) => adapter.key === 'dailycard')
  console.log('Adapters found:', allAdapters.length)
  console.log('Adapter keys:', allAdapters.map((adapter) => adapter.key))
  console.log(
    'Adapter availability:',
    allAdapters.map((adapter) => ({ key: adapter.key, available: adapter.isAvailable() }))
  )

  // Temporary bypass: do not gate auto-mapping by adapter availability.
  const adapters = allAdapters
  if (!adapters.length) return []

  const merged: UnifiedInternalProduct[] = []
  const seen = new Set<string>()

  for (const adapter of adapters) {
    const rows = await adapter.fetchProducts()
    console.log('Fetched rows:', Array.isArray(rows) ? rows.length : 0)
    for (const row of rows) {
      const providerProductId = normalizeText(row?.providerProductId)
      const providerProductName = normalizeText(row?.providerProductName || row?.displayName)
      if (!providerProductId || !providerProductName) continue
      const dedupe = `${providerProductId.toLowerCase()}|${providerProductName.toLowerCase()}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      merged.push(row)
    }
  }

  return merged
}
