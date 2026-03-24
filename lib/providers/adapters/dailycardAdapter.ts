import axios from 'axios'
import {
  getProviderApiConfig,
  providerHeaders,
  type ProviderApiConfig,
  type ProviderSlot,
} from '@/lib/providers/providerConfig'
import { mapProviderOrderStatus } from '@/lib/providers/statusMapping'
import type {
  NormalizedProductStockStatus,
  ProviderAdapter,
  ProviderCreateOrderError,
  ProviderOrderCreateInput,
  ProviderOrderCreateResult,
  ProviderOrderStatusResult,
  ProviderProductQuote,
  UnifiedInternalProduct,
} from '@/lib/providers/types'

type RawProviderProduct = {
  id?: number | string
  product_id?: number | string
  name?: string
  game?: string
  category?: string
  image?: string
  available?: boolean
  active?: boolean
  stock?: number | string
  stock_status?: string
  delivery_type?: string
  price?: number | string
  cost?: number | string
  unit_price?: number | string
  selling_price?: number | string
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[,_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function isRetryableProviderListError(error: unknown) {
  const err = error as any
  const code = String(err?.code || '').toLowerCase()
  const status = Number(err?.response?.status || 0)
  const message = String(err?.message || '').toLowerCase()
  if (code === 'econnaborted' || message.includes('timeout')) return true
  if (status === 408 || status === 429) return true
  if (status >= 500) return true
  return false
}

function normalizeStockStatus(value: unknown): NormalizedProductStockStatus {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'unknown'
  if (['in_stock', 'instock', 'available', 'active', 'ok'].includes(raw)) return 'in_stock'
  if (['low_stock', 'limited', 'low'].includes(raw)) return 'low_stock'
  if (['out_of_stock', 'out', 'sold_out', 'unavailable'].includes(raw)) return 'out_of_stock'
  if (['paused', 'disabled', 'inactive'].includes(raw)) return 'paused'
  return 'unknown'
}

function flattenPayload(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return []
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim()
    return text ? [text] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenPayload(entry, depth + 1))
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((entry) =>
      flattenPayload(entry, depth + 1)
    )
  }

  return []
}

function extractPayloadMessage(value: unknown) {
  return flattenPayload(value).join(' ').replace(/\s+/g, ' ').trim()
}

function isProviderBalanceIssue(value: unknown) {
  const haystack = extractPayloadMessage(value).toLowerCase()
  if (!haystack) return false
  return [
    'insufficient balance',
    'insufficient funds',
    'insufficient credit',
    'low balance',
    'balance too low',
    'not enough balance',
    'credit is not enough',
    'balance is not enough',
    'رصيد',
    'الرصيد',
    'غير كاف',
  ].some((token) => haystack.includes(token))
}

function createProviderError(
  payload: unknown,
  fallback = 'Provider request failed',
  canFallback = true
) {
  const message = extractPayloadMessage(payload) || fallback
  const error = new Error(message) as ProviderCreateOrderError
  error.rawPayload = payload
  error.safeMessage = message
  error.providerBalanceIssue = isProviderBalanceIssue(payload)
  error.canFallback = canFallback
  return error
}

function parseProductsPayload(payload: unknown): RawProviderProduct[] {
  const safe = payload as any
  if (Array.isArray(safe)) return safe
  if (Array.isArray(safe?.data?.results)) return safe.data.results
  if (Array.isArray(safe?.data?.products)) return safe.data.products
  if (Array.isArray(safe?.data?.items)) return safe.data.items
  if (Array.isArray(safe?.results)) return safe.results
  if (Array.isArray(safe?.data)) return safe.data
  if (Array.isArray(safe?.products)) return safe.products
  if (Array.isArray(safe?.items)) return safe.items
  return []
}

function extractProviderProductId(item: RawProviderProduct): string {
  const candidates = [item?.id, item?.product_id]
  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim()
    if (normalized) return normalized
  }
  return ''
}

function extractUnitCost(item: RawProviderProduct): number {
  const candidates = [
    item?.cost,
    item?.unit_price,
    item?.price,
    item?.selling_price,
  ]
  for (const value of candidates) {
    const next = toPositiveNumber(value)
    if (next > 0) return next
  }
  return 0
}

function extractOptionName(option?: string) {
  if (!option) return ''
  const [left] = option.split(' - ')
  return left?.trim() || option.trim()
}

function extractNumberTokens(value: string): string[] {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map((token) => token.trim()).filter(Boolean)
}

function packageCandidateMatch(preferred: string, candidateName: string) {
  const normalizedPreferred = normalizeText(preferred)
  const normalizedCandidate = normalizeText(candidateName)
  if (!normalizedPreferred || !normalizedCandidate) return false
  if (normalizedPreferred === normalizedCandidate) return true

  const preferredNumbers = extractNumberTokens(normalizedPreferred)
  const candidateNumbers = extractNumberTokens(normalizedCandidate)
  if (preferredNumbers.length > 0) {
    const allNumbersMatch = preferredNumbers.every((token) => candidateNumbers.includes(token))
    if (!allNumbersMatch) return false
  }

  return (
    normalizedCandidate.includes(normalizedPreferred) ||
    normalizedPreferred.includes(normalizedCandidate)
  )
}

export class DailyCardProviderAdapter implements ProviderAdapter {
  public readonly key: 'dailycard' = 'dailycard'
  public readonly slot: ProviderSlot
  private readonly config: ProviderApiConfig

  constructor(slot: ProviderSlot) {
    this.slot = slot
    this.config = getProviderApiConfig(slot)
  }

  isAvailable() {
    return Boolean(this.config.enabled && this.config.base)
  }

  async fetchProfile() {
    return null
  }

  async fetchProducts(search?: string): Promise<UnifiedInternalProduct[]> {
    if (!this.isAvailable()) return []

    const debugSearch = Boolean(search) || process.env.PROVIDER_SEARCH_DEBUG === '1'
    const endpointCandidates = [`${this.config.base}/products/`, `${this.config.base}/products`]
    const queryCandidates = search
      ? [
          { search },
          { q: search },
          { name: search },
          { keyword: search },
        ]
      : [{}]

    let lastError: unknown = null
    let payload: unknown = null
    let rows: RawProviderProduct[] = []

    for (const endpoint of endpointCandidates) {
      for (const queryItem of queryCandidates) {
        const params = {
          page: 1,
          page_size: 5000,
          ...queryItem,
        }
        if (debugSearch) {
          console.log('[SEARCH CALL]', 'dailycard', endpoint, JSON.stringify(params))
        }

        const runRequest = async () =>
          axios.get(endpoint, {
            headers: providerHeaders(this.config),
            params,
            timeout: 60000,
          })

        try {
          const response = await runRequest()
          payload = response.data
          if (debugSearch) {
            console.log('[SEARCH RESPONSE]', JSON.stringify(payload))
          }
          rows = parseProductsPayload(payload)
          if (debugSearch) {
            const safePayload = payload as any
            if (!rows.length) {
              console.log(
                '[SEARCH RESPONSE SHAPE]',
                'dailycard',
                typeof payload,
                JSON.stringify(Object.keys(safePayload || {}))
              )
            }
          }
          if (rows.length > 0 || !search) {
            break
          }
        } catch (error) {
          lastError = error
          if (!isRetryableProviderListError(error)) {
            if (debugSearch) {
              console.log('[SEARCH RESPONSE]', JSON.stringify((error as any)?.response?.data || {}))
            }
            continue
          }
          await new Promise((resolve) => setTimeout(resolve, 900))
          try {
            const response = await runRequest()
            payload = response.data
            if (debugSearch) {
              console.log('[SEARCH RESPONSE]', JSON.stringify(payload))
            }
            rows = parseProductsPayload(payload)
            if (rows.length > 0 || !search) {
              break
            }
          } catch (retryError) {
            lastError = retryError
            if (debugSearch) {
              console.log('[SEARCH RESPONSE]', JSON.stringify((retryError as any)?.response?.data || {}))
            }
          }
        }
      }
      if (rows.length > 0 || !search) break
    }

    if (!rows.length && lastError && !search) {
      throw lastError
    }

    if (!rows.length && debugSearch) {
      const safePayload = payload as any
      console.log(
        '[SEARCH RESPONSE SHAPE]',
        'dailycard',
        typeof payload,
        JSON.stringify(Object.keys(safePayload || {}))
      )
      if (safePayload && safePayload.data && typeof safePayload.data === 'object') {
        console.log('[SEARCH RESPONSE SHAPE:data.keys]', JSON.stringify(Object.keys(safePayload.data)))
      }
    }

    return rows.map((item) => {
      const providerProductId = extractProviderProductId(item)
      const stockStatus = item?.available === false ? 'out_of_stock' : normalizeStockStatus(item?.stock_status)
      return {
        internalSlug: '',
        provider: this.slot,
        providerProductId,
        providerProductName: String(item?.name || ''),
        displayName: String(item?.name || ''),
        category: String(item?.category || item?.game || ''),
        image: String(item?.image || ''),
        cost: extractUnitCost(item),
        currency: 'USD',
        stockStatus,
        deliveryType: String(item?.delivery_type || 'instant'),
        active: item?.active !== false,
        metadata: {
          rawId: item?.id,
          rawProductId: item?.product_id,
        },
      }
    })
  }

  async resolveProductQuote(params: {
    providerProductId?: string
    preferredName?: string
    packageOption?: string
  }): Promise<ProviderProductQuote | null> {
    if (!this.isAvailable()) return null

    const directId = String(params.providerProductId || '').trim().toLowerCase()
    const compactDirectId = directId.replace(/^pkg-/, '')
    const preferredName = extractOptionName(params.packageOption) || String(params.preferredName || '')
    const normalizedPreferred = normalizeText(preferredName)

    const scanRows = async (search?: string) => {
      const rows = await this.fetchProducts(search)
      if (!rows.length) return null

      if (directId) {
        const directMatch =
          rows.find((row) => row.providerProductId.toLowerCase() === directId) ||
          rows.find((row) => row.providerProductId.toLowerCase() === compactDirectId) ||
          rows.find((row) => row.providerProductId.toLowerCase().replace(/^pkg-/, '') === compactDirectId)

        if (directMatch && directMatch.cost > 0) {
          return {
            providerProductId: directMatch.providerProductId,
            providerProductName: directMatch.providerProductName || directMatch.displayName || '',
            unitCost: directMatch.cost,
            currency: directMatch.currency || 'USD',
            stockStatus: directMatch.stockStatus || 'unknown',
            deliveryType: directMatch.deliveryType,
            raw: directMatch.metadata || {},
          } satisfies ProviderProductQuote
        }
      }

      if (normalizedPreferred) {
        const matcher = params.packageOption ? packageCandidateMatch : (a: string, b: string) => normalizeText(b).includes(normalizeText(a))
        const byName = rows.find((row) => matcher(preferredName, row.providerProductName || row.displayName || ''))
        if (byName && byName.cost > 0) {
          return {
            providerProductId: byName.providerProductId,
            providerProductName: byName.providerProductName || byName.displayName || '',
            unitCost: byName.cost,
            currency: byName.currency || 'USD',
            stockStatus: byName.stockStatus || 'unknown',
            deliveryType: byName.deliveryType,
            raw: byName.metadata || {},
          } satisfies ProviderProductQuote
        }
      }

      return null
    }

    try {
      const first = await scanRows(preferredName || directId || undefined)
      if (first) return first
    } catch {
      // silent, we fallback
    }

    try {
      return await scanRows()
    } catch {
      return null
    }
  }

  async createOrder(input: ProviderOrderCreateInput): Promise<ProviderOrderCreateResult> {
    if (!this.isAvailable()) {
      throw createProviderError('Provider is unavailable', 'Provider is unavailable', false)
    }

    const startedAt = Date.now()
    try {
      const response = await axios.post(
        `${this.config.base}/orders/create/`,
        {
          product: Number(String(input.providerProductId).replace(/^pkg-/i, '')),
          account_id: input.playerId,
          quantity: input.quantity,
          client_order_id: input.clientOrderId,
        },
        {
          headers: providerHeaders(this.config),
          timeout: 20000,
        }
      )

      const payload = response.data
      const rawStatus = String(
        payload?.status || payload?.order_status || payload?.data?.status || payload?.details?.status || ''
      ).toLowerCase()

      const hasFailure =
        payload?.success === false ||
        payload?.ok === false ||
        Boolean(payload?.error) ||
        Boolean(payload?.errors) ||
        ['failed', 'error', 'rejected', 'cancelled'].includes(rawStatus) ||
        (isProviderBalanceIssue(payload) && rawStatus !== 'completed')

      if (hasFailure) {
        throw createProviderError(payload, 'Provider rejected order', true)
      }

      const unitCost = toPositiveNumber(
        payload?.unit_price ||
          payload?.price ||
          payload?.cost ||
          payload?.data?.unit_price ||
          payload?.data?.price ||
          payload?.details?.unit_price
      )

      return {
        providerOrderId: String(payload?.order_id || payload?.id || payload?.data?.order_id || '').trim() || undefined,
        rawStatus: rawStatus || 'pending',
        normalizedStatus: mapProviderOrderStatus(this.key, rawStatus || 'pending'),
        unitCost,
        rawResponse: {
          ...(typeof payload === 'object' && payload ? payload : {}),
          _timingMs: Date.now() - startedAt,
        },
      }
    } catch (error: any) {
      if (error?.rawPayload) {
        throw error
      }

      const payload = error?.response?.data || error?.message || error
      const code = String(error?.code || '').toUpperCase()
      const status = Number(error?.response?.status || 0)
      const isNetworkTimeout =
        code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || status >= 500
      throw createProviderError(payload, 'Provider submission failed', !isNetworkTimeout)
    }
  }

  async getOrderStatus(params: {
    clientOrderId: string
    providerOrderId?: string
    providerResponse?: Record<string, unknown>
  }): Promise<ProviderOrderStatusResult> {
    if (!this.isAvailable()) {
      throw createProviderError('Provider is unavailable', 'Provider is unavailable', false)
    }

    const query: Record<string, string> = {
      client_order_id: params.clientOrderId,
    }

    const transactionId = String(params.providerResponse?.transaction_id || '').trim()
    if (transactionId) query.transaction_id = transactionId

    const providerOrderId = String(params.providerOrderId || '').trim()
    if (providerOrderId) query.order_id = providerOrderId

    const startedAt = Date.now()
    const response = await axios.get(`${this.config.base}/orders/status/`, {
      headers: providerHeaders(this.config),
      params: query,
      timeout: 15000,
    })

    const payload = response.data
    const rawStatus = String(
      payload?.status || payload?.order_status || payload?.data?.status || payload?.details?.status || 'pending'
    ).toLowerCase()

    return {
      rawStatus,
      normalizedStatus: mapProviderOrderStatus(this.key, rawStatus),
      rawResponse: {
        ...(typeof payload === 'object' && payload ? payload : {}),
        _timingMs: Date.now() - startedAt,
      },
    }
  }
}

