import axios from 'axios'
import { randomUUID } from 'crypto'
import type { ProviderSlot } from '@/lib/providers/providerConfig'
import {
  detectProviderInputRequirements,
  isQuantityAllowedByRequirement,
} from '@/lib/providers/inputRequirements'
import { mapProviderOrderStatus } from '@/lib/providers/statusMapping'
import type {
  ProviderAdapter,
  ProviderCreateOrderError,
  ProviderOrderCreateInput,
  ProviderOrderCreateResult,
  ProviderOrderStatusResult,
  ProviderProductQuote,
  ProviderConnectionProbeResult,
  UnifiedInternalProduct,
} from '@/lib/providers/types'

type Go4CardProduct = {
  id?: number | string
  name?: string
  price?: number | string
  base_price?: number | string
  params?: unknown
  category_name?: string
  available?: boolean
  qty_values?: unknown
  product_type?: string
  parent_id?: number | string | null
  category_img?: string
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function toPositive(value: unknown): number {
  const parsed = toNumber(value)
  if (parsed <= 0) return 0
  return parsed
}

function parseProductsResponse(payload: any): Go4CardProduct[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.results)) return payload.results
  return []
}

function resolveAbsoluteImage(baseUrl: string, value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanPath = raw.replace(/^\/+/, '')
  return `${cleanBase}/${cleanPath}`
}

function mapGo4CardErrorCode(code: number) {
  switch (code) {
    case 100:
      return { safeMessage: 'Provider balance unavailable', balanceIssue: true, canFallback: true }
    case 105:
    case 106:
    case 110:
    case 112:
    case 113:
      return { safeMessage: 'Requested quantity is not available', balanceIssue: false, canFallback: true }
    case 107:
      return { safeMessage: 'Account data is not accepted by provider', balanceIssue: false, canFallback: true }
    case 108:
      return { safeMessage: 'Provider temporary verification required', balanceIssue: false, canFallback: true }
    case 109:
      return { safeMessage: 'Product unavailable', balanceIssue: false, canFallback: true }
    case 111:
      return { safeMessage: 'Provider temporary cooldown', balanceIssue: false, canFallback: true }
    case 114:
    case 500:
      return { safeMessage: 'Provider temporary error', balanceIssue: false, canFallback: true }
    default:
      return { safeMessage: 'Provider request failed', balanceIssue: false, canFallback: true }
  }
}

function createProviderError(payload: unknown, fallback = 'Provider request failed') {
  const rawCode = Number(
    (payload as any)?.error_code ??
      (payload as any)?.code ??
      (payload as any)?.data?.error_code ??
      0
  )
  const mapped = mapGo4CardErrorCode(rawCode)
  const error = new Error(mapped.safeMessage || fallback) as ProviderCreateOrderError
  error.rawPayload = payload
  error.safeMessage = mapped.safeMessage || fallback
  error.providerBalanceIssue = mapped.balanceIssue
  error.canFallback = mapped.canFallback
  return error
}

function buildErrorDetails(error: unknown) {
  const err = error as any
  const message = String(err?.message || '')
  const status = Number(err?.status || err?.response?.status || 0) || undefined
  const code = String(err?.code || '') || undefined
  return { message, status, code }
}

function classifyProbeFailure(error: unknown) {
  const details = buildErrorDetails(error)
  const lower = String(details.message || '').toLowerCase()
  const timeoutLike =
    lower.includes('timeout') ||
    lower.includes('aborted') ||
    details.code === 'ABORT_ERR' ||
    details.code === 'ECONNABORTED'
  const isAuth = details.status === 401 || details.status === 403
  return {
    isTimeout: timeoutLike,
    isAuth,
    details,
  }
}

export class Go4CardProviderAdapter implements ProviderAdapter {
  public readonly key: 'go4card' = 'go4card'
  public readonly slot: ProviderSlot
  private readonly baseUrl: string
  private readonly apiToken: string

  constructor(slot: ProviderSlot = 'secondary') {
    this.slot = slot
    this.baseUrl = String(
      process.env.GO4CARD_API_BASE ||
        process.env.SECONDARY_PROVIDER_API_BASE ||
        'https://api.go4card.com'
    )
      .trim()
      .replace(/\/+$/, '')
    this.apiToken = String(
      process.env.GO4CARD_API_TOKEN ||
        process.env.SECONDARY_PROVIDER_API_TOKEN ||
        ''
    ).trim()
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'api-token': this.apiToken,
    }
  }

  private getProfileTimeoutMs() {
    const value = Number(process.env.GO4CARD_PROFILE_TIMEOUT_MS || 12000)
    return Number.isFinite(value) && value >= 5000 ? value : 12000
  }

  private getProductsTimeoutMs() {
    const value = Number(process.env.GO4CARD_API_TIMEOUT_MS || 45000)
    return Number.isFinite(value) && value >= 10000 ? value : 45000
  }

  private getAdminProbeTimeoutMs() {
    const value = Number(process.env.GO4CARD_ADMIN_TIMEOUT_MS || 5000)
    if (!Number.isFinite(value)) return 5000
    return Math.min(10000, Math.max(1000, value))
  }

  private async fetchJsonWithTimeout(path: string, params?: Record<string, string | number>) {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }

    const timeoutMs = this.getAdminProbeTimeoutMs()
    const controller = new AbortController()
    const timeoutRef = setTimeout(() => controller.abort(), timeoutMs)
    const startedAt = Date.now()

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
        cache: 'no-store',
      })

      const text = await response.text()
      let payload: unknown = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          throw Object.assign(new Error('invalid_json_response'), {
            code: 'INVALID_RESPONSE',
            status: response.status,
          })
        }
      }

      if (!response.ok) {
        throw Object.assign(new Error(`http_${response.status}`), {
          code: 'HTTP_ERROR',
          status: response.status,
          payload,
        })
      }

      return {
        payload,
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      const err = error as any
      if (err?.name === 'AbortError') {
        throw Object.assign(new Error(`request_timeout_${timeoutMs}ms`), {
          code: 'ABORT_ERR',
        })
      }
      throw error
    } finally {
      clearTimeout(timeoutRef)
    }
  }

  isAvailable() {
    return Boolean(this.baseUrl && this.apiToken)
  }

  async fetchProfile() {
    if (!this.isAvailable()) return null

    const response = await axios.get(`${this.baseUrl}/client/api/profile`, {
      headers: this.headers(),
      timeout: this.getProfileTimeoutMs(),
    })
    const payload = response.data
    const balance = toNumber(
      payload?.data?.balance ??
        payload?.data?.credit ??
        payload?.balance ??
        payload?.credit ??
        NaN
    )
    return {
      balance: Number.isFinite(balance) ? balance : null,
      currency: 'USD',
      raw: payload,
    }
  }

  async testConnection(): Promise<ProviderConnectionProbeResult> {
    if (!this.isAvailable()) {
      return {
        ok: false,
        profileOk: false,
        productsProbeOk: false,
        message: 'Provider is disabled or missing credentials',
      }
    }

    const startedAt = Date.now()
    let profileOk = false
    try {
      await this.fetchJsonWithTimeout('/client/api/profile')
      profileOk = true
    } catch (error: any) {
      const { isTimeout, isAuth, details } = classifyProbeFailure(error)
      return {
        ok: false,
        profileOk: false,
        productsProbeOk: false,
        durationMs: Date.now() - startedAt,
        message: isAuth
          ? 'Authentication failed for provider profile endpoint'
          : isTimeout
            ? 'Profile endpoint timeout'
            : 'Profile endpoint failed',
        details,
      }
    }

    try {
      const probeResponse = await this.fetchJsonWithTimeout('/client/api/products', { base: 1 })
      const rows = parseProductsResponse(probeResponse.payload)
      return {
        ok: true,
        profileOk,
        productsProbeOk: true,
        productsVisible: rows.length,
        durationMs: Date.now() - startedAt,
        message: 'Connection OK',
      }
    } catch (error: any) {
      const { isTimeout, isAuth, details } = classifyProbeFailure(error)
      return {
        ok: true,
        profileOk: true,
        productsProbeOk: false,
        productsSlow: isTimeout && !isAuth,
        durationMs: Date.now() - startedAt,
        message: isAuth
          ? 'Profile OK, products probe failed due to auth'
          : isTimeout
            ? 'Connection OK, products endpoint is slow'
            : 'Profile OK, products probe failed',
        details,
      }
    }
  }

  async fetchProductsFromConnectionProbeSource(): Promise<UnifiedInternalProduct[]> {
    if (!this.isAvailable()) return []
    const probeResponse = await this.fetchJsonWithTimeout('/client/api/products', { base: 1 })
    const rows = parseProductsResponse(probeResponse.payload)
    return rows.map((item) => {
      const cost = toPositive(item?.base_price) || toPositive(item?.price)
      return {
        internalSlug: '',
        provider: this.slot,
        providerProductId: String(item?.id || '').trim(),
        providerProductName: String(item?.name || ''),
        displayName: String(item?.name || ''),
        category: String(item?.category_name || ''),
        image: resolveAbsoluteImage(this.baseUrl, item?.category_img),
        cost,
        currency: 'USD',
        stockStatus: item?.available === false ? 'out_of_stock' : 'in_stock',
        deliveryType: String(item?.product_type || ''),
        active: item?.available !== false,
        metadata: {
          params: item?.params ?? null,
          qty_values: item?.qty_values ?? null,
          parent_id: item?.parent_id ?? null,
          requirements: detectProviderInputRequirements({
            params: item?.params ?? null,
            qtyValues: item?.qty_values ?? null,
          }),
          raw: item,
        },
      }
    })
  }

  async fetchProducts(search?: string): Promise<UnifiedInternalProduct[]> {
    if (!this.isAvailable()) return []

    const url = `${this.baseUrl}/client/api/products`
    const response = await axios.get(url, {
      headers: this.headers(),
      params: search ? { search } : undefined,
      timeout: this.getProductsTimeoutMs(),
    })

    const payload = response.data
    if (String(payload?.status || '').toUpperCase() !== 'OK' && !Array.isArray(payload?.data)) {
      return []
    }

    const rows = parseProductsResponse(payload)

    return rows.map((item) => {
      const cost = toPositive(item?.base_price) || toPositive(item?.price)
      return {
        internalSlug: '',
        provider: this.slot,
        providerProductId: String(item?.id || '').trim(),
        providerProductName: String(item?.name || ''),
        displayName: String(item?.name || ''),
        category: String(item?.category_name || ''),
        image: resolveAbsoluteImage(this.baseUrl, item?.category_img),
        cost,
        currency: 'USD',
        stockStatus: item?.available === false ? 'out_of_stock' : 'in_stock',
        deliveryType: String(item?.product_type || ''),
        active: item?.available !== false,
        metadata: {
          params: item?.params ?? null,
          qty_values: item?.qty_values ?? null,
          parent_id: item?.parent_id ?? null,
          requirements: detectProviderInputRequirements({
            params: item?.params ?? null,
            qtyValues: item?.qty_values ?? null,
          }),
          raw: item,
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

    const providerProductId = String(params.providerProductId || '').trim()
    if (providerProductId) {
      const response = await axios.get(`${this.baseUrl}/client/api/products`, {
        headers: this.headers(),
        params: { products_id: providerProductId },
        timeout: 15000,
      })
      const rows = parseProductsResponse(response.data)
      if (rows.length > 0) {
        const row = rows[0]
        return {
          providerProductId: String(row?.id || '').trim(),
          providerProductName: String(row?.name || ''),
          unitCost: toPositive(row?.base_price) || toPositive(row?.price),
          currency: 'USD',
          stockStatus: row?.available === false ? 'out_of_stock' : 'in_stock',
          deliveryType: String(row?.product_type || ''),
          raw: {
            params: row?.params ?? null,
            qty_values: row?.qty_values ?? null,
            parent_id: row?.parent_id ?? null,
            requirements: detectProviderInputRequirements({
              params: row?.params ?? null,
              qtyValues: row?.qty_values ?? null,
            }),
            category_img: resolveAbsoluteImage(this.baseUrl, row?.category_img),
            raw: row,
          },
        }
      }
    }

    const all = await this.fetchProducts()
    const target = String(params.preferredName || '').toLowerCase().trim()
    if (!target) return null

    const matched = all.find((row) =>
      String(row.providerProductName || row.displayName || '').toLowerCase().includes(target)
    )
    if (!matched) return null

    return {
      providerProductId: matched.providerProductId,
      providerProductName: matched.providerProductName || matched.displayName || '',
      unitCost: matched.cost,
      currency: matched.currency || 'USD',
      stockStatus: matched.stockStatus,
      deliveryType: matched.deliveryType,
      raw: matched.metadata || {},
    }
  }

  async createOrder(input: ProviderOrderCreateInput): Promise<ProviderOrderCreateResult> {
    if (!this.isAvailable()) {
      throw createProviderError('Provider unavailable')
    }

    const productId = String(input.providerProductId || '').trim()
    if (!productId) {
      throw createProviderError({ code: 109 }, 'Product unavailable')
    }

    const quote = await this.resolveProductQuote({ providerProductId: productId })
    const qtyRules = (quote?.raw as any)?.qty_values ?? null
    const requirements = detectProviderInputRequirements({
      params: (quote?.raw as any)?.params ?? null,
      qtyValues: qtyRules,
    })
    if (!isQuantityAllowedByRequirement(input.quantity, requirements.quantityRule)) {
      throw createProviderError({ code: 106 }, 'Requested quantity is not available')
    }

    if (requirements.requiresExtraInput) {
      throw createProviderError(
        {
          code: 114,
          reason: 'requires_extra_input',
          requiredFields: requirements.requiredFields,
        },
        'Additional input is required for this product'
      )
    }

    const paramKeys = requirements.requiredFields
    const query = new URLSearchParams()
    query.set('qty', String(Math.floor(toNumber(input.quantity) || 1)))
    query.set('order_uuid', randomUUID())
    query.set('playerId', String(input.playerId || '').trim())

    for (const key of paramKeys) {
      if (key.toLowerCase() === 'playerid') continue
      // current flow provides playerId only; keep compatibility by passing empty defaults
      if (!query.has(key)) {
        query.set(key, '')
      }
    }

    const startedAt = Date.now()
    const response = await axios.get(
      `${this.baseUrl}/client/api/newOrder/${encodeURIComponent(productId)}/params`,
      {
        headers: this.headers(),
        params: query,
        timeout: 20000,
      }
    )

    const payload = response.data
    const ok = String(payload?.status || '').toUpperCase() === 'OK'
    if (!ok || !payload?.data) {
      throw createProviderError(payload, 'Provider rejected order')
    }

    const rawStatus = String(payload?.data?.status || '').toLowerCase() || 'wait'
    const normalizedStatus = mapProviderOrderStatus(this.key, rawStatus)
    if (normalizedStatus === 'failed') {
      throw createProviderError(payload, 'Provider rejected order')
    }

    const unitCost = toPositive(payload?.data?.price) || toPositive(payload?.price) || toPositive((quote?.unitCost ?? 0))

    return {
      providerOrderId: String(payload?.data?.order_id || '').trim() || undefined,
      rawStatus,
      normalizedStatus,
      unitCost,
      rawResponse: {
        ...payload,
        _go4card: {
          qty_values: qtyRules,
          params: paramKeys,
        },
        _timingMs: Date.now() - startedAt,
      },
    }
  }

  async getOrderStatus(params: {
    clientOrderId: string
    providerOrderId?: string
    providerResponse?: Record<string, unknown>
  }): Promise<ProviderOrderStatusResult> {
    if (!this.isAvailable()) {
      throw createProviderError('Provider unavailable')
    }

    const providerOrderId = String(params.providerOrderId || '').trim()
    const clientOrderId = String(params.clientOrderId || '').trim()

    const queryById = new URLSearchParams()
    queryById.set('orders', providerOrderId || clientOrderId)
    if (!providerOrderId) {
      queryById.set('uuid', '1')
    }

    const startedAt = Date.now()
    const response = await axios.get(`${this.baseUrl}/client/api/check`, {
      headers: this.headers(),
      params: queryById,
      timeout: 15000,
    })

    const payload = response.data
    const dataRow = Array.isArray(payload?.data) ? payload.data[0] : null
    const rawStatus = String(dataRow?.status || payload?.status || 'wait').toLowerCase()

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
