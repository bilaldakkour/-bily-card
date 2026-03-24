import type { ProviderSlot } from '@/lib/providers/providerConfig'

export type NormalizedProductStockStatus =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'paused'
  | 'unknown'

export type NormalizedOrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled'

export interface UnifiedInternalProduct {
  internalSlug: string
  provider: ProviderSlot
  providerProductId: string
  providerProductName: string
  displayName: string
  category?: string
  image?: string
  cost: number
  currency: string
  stockStatus: NormalizedProductStockStatus
  deliveryType?: string
  active: boolean
  metadata?: Record<string, unknown>
}

export interface UnifiedInternalOrder {
  internalOrderId: string
  provider: ProviderSlot
  providerOrderId?: string
  productSlug: string
  quantity: number
  playerId: string
  cost: number
  sellPrice: number
  profit: number
  status: NormalizedOrderStatus
  rawStatus?: string
  rawResponse?: unknown
  fallbackUsed: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ProviderOrderCreateInput {
  providerProductId: string
  playerId: string
  quantity: number
  clientOrderId: string
}

export interface ProviderOrderCreateResult {
  providerOrderId?: string
  rawStatus: string
  normalizedStatus: NormalizedOrderStatus
  unitCost: number
  rawResponse: unknown
}

export interface ProviderOrderStatusResult {
  rawStatus: string
  normalizedStatus: NormalizedOrderStatus
  rawResponse: unknown
}

export interface ProviderProductQuote {
  providerProductId: string
  providerProductName: string
  unitCost: number
  currency: string
  stockStatus: NormalizedProductStockStatus
  deliveryType?: string
  raw: unknown
}

export interface ProviderConnectionProbeResult {
  ok: boolean
  profileOk?: boolean
  productsProbeOk?: boolean
  productsSlow?: boolean
  productsVisible?: number
  durationMs?: number
  message?: string
  details?: Record<string, unknown>
}

export interface ProviderAdapter {
  key: 'dailycard' | 'go4card'
  slot: ProviderSlot
  isAvailable(): boolean
  fetchProfile?(): Promise<{ balance?: number | null; currency?: string; raw?: unknown } | null>
  testConnection?(): Promise<ProviderConnectionProbeResult>
  fetchProductsFromConnectionProbeSource?(): Promise<UnifiedInternalProduct[]>
  fetchProducts(search?: string): Promise<UnifiedInternalProduct[]>
  resolveProductQuote(params: {
    providerProductId?: string
    preferredName?: string
    packageOption?: string
  }): Promise<ProviderProductQuote | null>
  createOrder(input: ProviderOrderCreateInput): Promise<ProviderOrderCreateResult>
  getOrderStatus(params: {
    clientOrderId: string
    providerOrderId?: string
    providerResponse?: Record<string, unknown>
  }): Promise<ProviderOrderStatusResult>
}

export type ProviderCreateOrderError = Error & {
  canFallback?: boolean
  providerBalanceIssue?: boolean
  rawPayload?: unknown
  safeMessage?: string
}
