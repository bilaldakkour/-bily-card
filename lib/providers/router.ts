import type { ProductRoutingMode, ProductProviderLink } from '@/lib/data/products'

export type ProviderFinancialProfile = {
  providerCode: string
  settlementRate?: number
  fixedFeePerOrder?: number
  variableFeePercent?: number
  priorityDefault?: number
  isActive?: boolean
  allowOrderCreation?: boolean
}

export type EligibleProviderLink = ProductProviderLink & {
  providerCode: string
  providerProductId: string
  priority: number
  fallbackEnabled: boolean
  rawUnitCost: number
  effectiveUnitCost: number
}

function toPositive(value: unknown, fallback = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 0) return fallback
  return parsed
}

/**
 * Effective provider cost normalizes supplier fees/rates to comparable unit-cost.
 * We use:
 * effective = (rawCost / settlementRate) + (rawCost * variableFeePercent/100) + fixedFeePerOrder
 */
export function getEffectiveProviderCost(input: {
  rawProviderCost: number
  settlementRate?: number
  variableFeePercent?: number
  fixedFeePerOrder?: number
}) {
  const raw = toPositive(input.rawProviderCost, 0)
  const settlementRate = Math.max(0.000001, toPositive(input.settlementRate, 1) || 1)
  const variablePercent = toPositive(input.variableFeePercent, 0)
  const fixedFee = toPositive(input.fixedFeePerOrder, 0)
  const normalized = raw / settlementRate
  const variable = normalized * (variablePercent / 100)
  return Number((normalized + variable + fixedFee).toFixed(6))
}

export function getEligibleProvidersForProduct(input: {
  providerLinks?: ProductProviderLink[] | null
  providerProfiles?: Record<string, ProviderFinancialProfile>
}) {
  const links = Array.isArray(input.providerLinks) ? input.providerLinks : []
  const profiles = input.providerProfiles || {}
  return links.filter((row) => {
    const providerCode = String(row?.providerCode || '').trim().toLowerCase()
    const providerProductId = String(row?.providerProductId || '').trim()
    if (!providerCode || !providerProductId) return false
    if (row?.enabled === false) return false
    if (String(row?.providerAvailability || 'unknown').toLowerCase() === 'unavailable') return false
    const profile = profiles[providerCode]
    if (profile?.isActive === false) return false
    if (profile?.allowOrderCreation === false) return false
    return true
  })
}

export function selectBestProvider(input: {
  providers: EligibleProviderLink[]
  routingMode?: ProductRoutingMode
}) {
  const mode: ProductRoutingMode = input.routingMode === 'priority' ? 'priority' : 'cheapest'
  const rows = [...(Array.isArray(input.providers) ? input.providers : [])]
  if (!rows.length) return null
  rows.sort((a, b) => {
    if (mode === 'priority') {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      return a.providerCode.localeCompare(b.providerCode)
    }
    if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
    if (a.priority !== b.priority) return a.priority - b.priority
    return a.providerCode.localeCompare(b.providerCode)
  })
  return rows[0]
}

export async function executeOrderWithFallback<TAttempt, TResult>(input: {
  orderedCandidates: TAttempt[]
  submit: (candidate: TAttempt, index: number) => Promise<TResult | null>
}) {
  for (let index = 0; index < input.orderedCandidates.length; index += 1) {
    const candidate = input.orderedCandidates[index]
    const result = await input.submit(candidate, index)
    if (result) return { result, index }
  }
  return { result: null, index: -1 }
}
