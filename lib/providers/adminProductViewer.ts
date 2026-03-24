import { getProviderAdapters } from '@/lib/providers/registry'
import type { UnifiedInternalProduct } from '@/lib/providers/types'

export type ProviderProductViewerRow = {
  providerProductId: string
  providerProductName: string
  price: number
  cost: number
  category: string
  stockStatus: string
  available: boolean
  currency: string
  lastSyncAt: string
}

type ProviderKey = 'dailycard' | 'go4card'

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '')
    .trim()
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function mapRow(item: UnifiedInternalProduct, lastSyncAt: string): ProviderProductViewerRow {
  const price = toPositiveNumber(item?.cost)
  return {
    providerProductId: String(item?.providerProductId || '').trim(),
    providerProductName: String(item?.providerProductName || item?.displayName || '').trim(),
    price,
    cost: price,
    category: String(item?.category || '').trim(),
    stockStatus: String(item?.stockStatus || 'unknown').trim() || 'unknown',
    available: item?.active !== false && String(item?.stockStatus || '').toLowerCase() !== 'out_of_stock',
    currency: String(item?.currency || 'USD').trim() || 'USD',
    lastSyncAt,
  }
}

function localFilter(rows: ProviderProductViewerRow[], query: string) {
  const q = normalizeText(query)
  if (!q) return rows
  return rows.filter((row) => {
    const name = normalizeText(row.providerProductName)
    const id = normalizeText(row.providerProductId)
    return name.includes(q) || id.includes(q)
  })
}

export async function getProviderProductsForViewer(params: {
  providerKey: ProviderKey
  q?: string
  page?: number
  limit?: number
}) {
  const providerKey = params.providerKey
  const q = String(params.q || '').trim()
  const page = Math.max(1, Number(params.page || 1))
  const limit = Math.max(10, Math.min(500, Number(params.limit || 200)))
  const startedAtIso = new Date().toISOString()

  const adapter = getProviderAdapters().find((item) => String(item.key || '').toLowerCase() === providerKey)
  if (!adapter || !adapter.isAvailable()) {
    return {
      rows: [] as ProviderProductViewerRow[],
      meta: {
        providerKey,
        adapterAvailable: false,
        total: 0,
        page,
        limit,
        totalPages: 0,
        rawCount: 0,
        filteredCount: 0,
        sourceFunction: 'none',
      },
    }
  }

  let products: UnifiedInternalProduct[] = []
  let sourceFunction = 'fetchProducts'
  if (
    providerKey === 'go4card' &&
    typeof adapter.fetchProductsFromConnectionProbeSource === 'function'
  ) {
    sourceFunction = 'fetchProductsFromConnectionProbeSource'
    products = await adapter.fetchProductsFromConnectionProbeSource()
  } else {
    products = await adapter.fetchProducts()
  }

  const mapped = (Array.isArray(products) ? products : [])
    .map((item) => mapRow(item, startedAtIso))
    .filter((row) => row.providerProductId && row.providerProductName)

  const filtered = localFilter(mapped, q)
  const total = filtered.length
  const totalPages = Math.ceil(total / limit)
  const offset = (page - 1) * limit
  const rows = filtered.slice(offset, offset + limit)

  return {
    rows,
    meta: {
      providerKey,
      adapterAvailable: true,
      total,
      page,
      limit,
      totalPages,
      rawCount: mapped.length,
      filteredCount: filtered.length,
      sourceFunction,
    },
  }
}

export function buildProviderProductsCsv(rows: ProviderProductViewerRow[]) {
  const header = [
    'providerProductId',
    'providerProductName',
    'price',
    'cost',
    'category',
    'stockStatus',
    'available',
    'currency',
    'lastSyncAt',
  ]
  const escape = (value: unknown) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [header.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.providerProductId,
        row.providerProductName,
        row.price,
        row.cost,
        row.category,
        row.stockStatus,
        row.available ? 'yes' : 'no',
        row.currency,
        row.lastSyncAt,
      ]
        .map(escape)
        .join(',')
    )
  }

  return lines.join('\n')
}
