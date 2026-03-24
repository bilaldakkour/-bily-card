import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import ProductProviderOption from '@/lib/models/ProductProviderOption'
import ProductRoutingPolicy from '@/lib/models/ProductRoutingPolicy'
import ProviderRegistry from '@/lib/models/ProviderRegistry'
import Order from '@/lib/models/Order'
import type { ProviderSlot } from '@/lib/providers/providerConfig'
import { getEnabledProviderAdapters } from '@/lib/providers/registry'
import type { ProviderAdapter, ProviderCreateOrderError } from '@/lib/providers/types'
import type { ProductProviderLink, ProductRoutingMode } from '@/lib/data/products'
import {
  detectProviderInputRequirements,
  isQuantityAllowedByRequirement,
} from '@/lib/providers/inputRequirements'
import { computeProviderHealthSnapshot } from '@/lib/providers/health'
import {
  getEffectiveProviderCost,
  getEligibleProvidersForProduct,
  selectBestProvider,
  executeOrderWithFallback,
} from '@/lib/providers/router'
import {
  mapNormalizedOrderStatusToLocal,
  mapProviderOrderStatus,
} from '@/lib/providers/statusMapping'

type ProductProviderMode = 'primary' | 'secondary' | 'manual'
type QuoteCacheEntry = {
  expiresAt: number
  value: Awaited<ReturnType<ProviderAdapter['resolveProductQuote']>>
}

const QUOTE_CACHE_TTL_MS = 30_000
const quoteCache = new Map<string, QuoteCacheEntry>()

type RoutingCandidate = {
  providerSlot: ProviderSlot
  providerAdapter: ProviderAdapter
  providerProductId?: string
  providerProductName?: string
  priority: number
  fallbackEnabled: boolean
  unitCost: number
  effectiveUnitCost: number
  stockStatus: string
  rawQuote: unknown
  score: number
  providerFailureRate: number
  providerSuccessRate: number
  providerAvgResponseMs: number
}

type RoutingAttempt = {
  providerSlot: ProviderSlot
  providerAdapterKey?: string
  providerProductId?: string
  unitCost?: number
  effectiveUnitCost?: number
  outcome: 'success' | 'failed' | 'skipped'
  reason?: string
  balanceIssue?: boolean
  canFallback?: boolean
}

type AdvancedSelectionResult = {
  hasConfig: boolean
  candidates: RoutingCandidate[]
  attempts: RoutingAttempt[]
  reason: string
  routingMode: 'cheapest' | 'priority' | 'forced'
}

export type RoutedOrderResult =
  | {
      kind: 'submitted'
      providerSlot: ProviderSlot
      providerAdapterKey: 'dailycard' | 'go4card'
      providerProductId: string
      providerMatchedProductName: string
      providerOrderId?: string
      providerStatus: string
      mappedStatus: string
      providerUnitCost: number
      providerEffectiveUnitCost: number
      providerTotalCost: number
      providerEffectiveTotalCost: number
      grossProfit: number
      providerResponse: unknown
      providerMatchMode: string
      fallbackUsed: boolean
      attempts: RoutingAttempt[]
    }
  | {
      kind: 'already_submitted'
      attempts: RoutingAttempt[]
      existing: {
        providerSlot: ProviderSlot
        providerOrderId?: string
        providerStatus: string
        providerAdapterKey?: string
      }
      message: string
    }
  | {
      kind: 'blocked_no_profit'
      attempts: RoutingAttempt[]
      message: string
    }
  | {
      kind: 'provider_balance_unavailable'
      attempts: RoutingAttempt[]
      providerPayload?: unknown
      message: string
    }
  | {
      kind: 'submit_failed'
      attempts: RoutingAttempt[]
      message: string
    }
  | {
      kind: 'local_only'
      attempts: RoutingAttempt[]
      reason: string
    }

function computeCandidateScore(input: {
  unitCost: number
  failureRate: number
  avgResponseMs: number
}) {
  return Number(
    (
      input.unitCost * 0.7 +
      input.failureRate * 0.2 +
      input.avgResponseMs * 0.1
    ).toFixed(6)
  )
}

function normalizeProductProviderMode(value: unknown): ProductProviderMode {
  const mode = String(value || 'primary').trim().toLowerCase()
  if (mode === 'manual') return 'manual'
  if (mode === 'secondary') return 'secondary'
  return 'primary'
}

function resolveAllowedSlots(mode: ProductProviderMode): ProviderSlot[] {
  if (mode === 'secondary') return ['secondary', 'primary']
  return ['primary', 'secondary']
}

function isLikelyProviderBackedProduct(productId: string) {
  const normalized = String(productId || '').trim().toLowerCase()
  if (!normalized) return false
  if (/^\d+$/.test(normalized)) return true
  return normalized.startsWith('pkg-')
}

async function resolveQuoteCached(
  adapter: ProviderAdapter,
  params: {
    providerProductId?: string
    preferredName?: string
    packageOption?: string
  }
) {
  const key = [
    adapter.key,
    adapter.slot,
    String(params.providerProductId || '').trim().toLowerCase(),
    String(params.preferredName || '').trim().toLowerCase(),
    String(params.packageOption || '').trim().toLowerCase(),
  ].join('|')

  const cached = quoteCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const value = await adapter.resolveProductQuote(params)
  quoteCache.set(key, {
    expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
    value,
  })

  return value
}

async function selectBestProviderFromAdvancedConfig(input: {
  productSlug: string
  productName: string
  packageOption?: string
}): Promise<AdvancedSelectionResult> {
  const internalSlug = String(input.productSlug || '').trim().toLowerCase()
  const options = await ProductProviderOption.find({
    internalSlug,
    active: true,
  })
    .sort({ priority: 1, updatedAt: -1 })
    .lean()

  const attempts: RoutingAttempt[] = []
  if (!options.length) {
    return {
      hasConfig: false,
      candidates: [],
      attempts,
      reason: 'no_advanced_config',
      routingMode: 'cheapest',
    }
  }

  const policy = (await ProductRoutingPolicy.findOne({ internalSlug }).lean()) as any
  const routingMode = (String(policy?.routingMode || 'cheapest').toLowerCase() as 'cheapest' | 'priority' | 'forced')
  const forcedProviderKey =
    routingMode === 'forced'
      ? String(policy?.forcedProviderKey || '').trim().toLowerCase()
      : ''

  const enabledAdapters = getEnabledProviderAdapters()
  const healthSnapshot = await computeProviderHealthSnapshot()
  const adapterByKey = new Map<string, ProviderAdapter>()
  for (const adapter of enabledAdapters) {
    const key = String(adapter.key || '').toLowerCase()
    if (!key) continue
    if (!adapterByKey.has(key)) {
      adapterByKey.set(key, adapter)
    }
  }

  const quotedCandidates: RoutingCandidate[] = []
  const seenCandidates = new Set<string>()
  const quoteWork: Array<{ row: any; adapter: ProviderAdapter }> = []
  for (const row of options as any[]) {
    const providerKey = String(row?.providerKey || '').trim().toLowerCase()
    const adapter = adapterByKey.get(providerKey)
    if (!adapter) {
      attempts.push({
        providerSlot: 'primary',
        providerAdapterKey: providerKey,
        providerProductId: String(row?.providerProductId || '').trim() || undefined,
        outcome: 'skipped',
        reason: 'provider_key_not_available',
      })
      continue
    }

    const healthKey = `${adapter.slot}:${adapter.key}`
    const health = healthSnapshot[healthKey]
    const manuallyDisabled = health?.manualEnabled === false
    const autoDisabled = Boolean(health?.autoDisabled)
    if (manuallyDisabled || autoDisabled) {
      attempts.push({
        providerSlot: adapter.slot,
        providerAdapterKey: adapter.key,
        providerProductId: String(row?.providerProductId || '').trim() || undefined,
        outcome: 'skipped',
        reason: manuallyDisabled ? 'provider_disabled_by_admin' : 'provider_disabled_by_health',
      })
      continue
    }

    const dedupeKey = `${adapter.key}|${String(row?.providerProductId || '').trim().toLowerCase()}`
    if (seenCandidates.has(dedupeKey)) continue
    seenCandidates.add(dedupeKey)

    quoteWork.push({ row, adapter })
  }

  const quoteResults = await Promise.all(
    quoteWork.map(async ({ row, adapter }) => {
      const healthKey = `${adapter.slot}:${adapter.key}`
      const quote = await resolveQuoteCached(adapter, {
        providerProductId: String(row?.providerProductId || '').trim(),
        preferredName: String(row?.providerProductName || '').trim() || input.productName,
        packageOption: input.packageOption,
      })

      if (!quote || quote.unitCost <= 0 || quote.stockStatus === 'out_of_stock' || quote.stockStatus === 'paused') {
        return {
          attempt: {
            providerSlot: adapter.slot,
            providerAdapterKey: adapter.key,
            providerProductId: String(row?.providerProductId || '').trim() || undefined,
            outcome: 'skipped' as const,
            reason: 'unavailable_or_no_quote',
          },
        }
      }

      const requirements = detectProviderInputRequirements({
        params: (quote.raw as any)?.params ?? (quote.raw as any)?.requirements?.requiredFields ?? null,
        qtyValues: (quote.raw as any)?.qty_values ?? null,
      })
      if (requirements.requiresExtraInput) {
        return {
          attempt: {
            providerSlot: adapter.slot,
            providerAdapterKey: adapter.key,
            providerProductId: quote.providerProductId,
            outcome: 'skipped' as const,
            reason: 'requires_extra_input',
          },
        }
      }

      const providerStats = healthSnapshot[healthKey]
      const providerFailureRate = Number(providerStats?.failureRate || 0)
      const providerSuccessRate = Number(providerStats?.successRate || 0)
      const providerAvgResponseMs = Number(providerStats?.avgResponseMs || 0)
      const configuredFixedUnitCost = Number(row?.fixedUnitCost || 0)
      const effectiveUnitCost =
        Number.isFinite(configuredFixedUnitCost) && configuredFixedUnitCost > 0
          ? configuredFixedUnitCost
          : quote.unitCost

      return {
        candidate: {
          providerSlot: adapter.slot,
          providerAdapter: adapter,
          providerProductId: quote.providerProductId,
          providerProductName: quote.providerProductName,
          priority: Number.isFinite(Number(row?.priority)) ? Number(row.priority) : 100,
          fallbackEnabled: row?.fallbackEnabled !== false,
          unitCost: effectiveUnitCost,
          effectiveUnitCost,
          stockStatus: quote.stockStatus,
          rawQuote: quote.raw,
          score: computeCandidateScore({
            unitCost: effectiveUnitCost,
            failureRate: providerFailureRate,
            avgResponseMs: providerAvgResponseMs,
          }),
          providerFailureRate,
          providerSuccessRate,
          providerAvgResponseMs,
        } as RoutingCandidate,
      }
    })
  )

  for (const result of quoteResults) {
    if (result.attempt) attempts.push(result.attempt)
    if (result.candidate) quotedCandidates.push(result.candidate)
  }

  if (routingMode === 'forced' && forcedProviderKey) {
    quotedCandidates.sort((a, b) => {
      const aForced = a.providerAdapter.key === forcedProviderKey ? 0 : 1
      const bForced = b.providerAdapter.key === forcedProviderKey ? 0 : 1
      if (aForced !== bForced) return aForced - bForced
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      return a.score - b.score
    })
  } else if (routingMode === 'priority') {
    quotedCandidates.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      if (a.score !== b.score) return a.score - b.score
      return `${a.providerSlot}-${a.providerAdapter.key}`.localeCompare(`${b.providerSlot}-${b.providerAdapter.key}`)
    })
  } else {
    quotedCandidates.sort((a, b) => {
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      if (a.score !== b.score) return a.score - b.score
      if (a.priority !== b.priority) return a.priority - b.priority
      return `${a.providerSlot}-${a.providerAdapter.key}`.localeCompare(`${b.providerSlot}-${b.providerAdapter.key}`)
    })
  }

  return {
    hasConfig: true,
    candidates: quotedCandidates,
    attempts,
    reason: quotedCandidates.length ? 'advanced_ok' : 'advanced_no_available_provider',
    routingMode: routingMode === 'forced' || routingMode === 'priority' ? routingMode : 'cheapest',
  }
}

async function selectBestProviderFromProductLinks(input: {
  productSlug: string
  productName: string
  packageOption?: string
  providerLinks?: ProductProviderLink[]
  routingMode?: ProductRoutingMode
}): Promise<AdvancedSelectionResult> {
  const attempts: RoutingAttempt[] = []
  const productLinks = Array.isArray(input.providerLinks) ? input.providerLinks : []
  if (!productLinks.length) {
    return {
      hasConfig: false,
      candidates: [],
      attempts,
      reason: 'no_product_links',
      routingMode: input.routingMode === 'priority' ? 'priority' : 'cheapest',
    }
  }

  const enabledAdapters = getEnabledProviderAdapters()
  const adapterByKey = new Map<string, ProviderAdapter>()
  for (const adapter of enabledAdapters) {
    if (!adapterByKey.has(adapter.key)) adapterByKey.set(adapter.key, adapter)
  }

  const providerKeys = Array.from(
    new Set(
      productLinks
        .map((row) => String(row?.providerCode || '').trim().toLowerCase())
        .filter(Boolean)
    )
  )
  const registryRows = await ProviderRegistry.find({ providerKey: { $in: providerKeys } })
    .select('providerKey enabled routing financial priority')
    .lean()
  const profileByKey = new Map<string, any>()
  for (const row of registryRows as any[]) {
    profileByKey.set(String(row?.providerKey || '').trim().toLowerCase(), row)
  }

  const eligibleLinks = getEligibleProvidersForProduct({
    providerLinks: productLinks,
    providerProfiles: Object.fromEntries(
      [...profileByKey.entries()].map(([key, row]) => [
        key,
        {
          providerCode: key,
          settlementRate: Number(row?.financial?.landingRate || 1),
          fixedFeePerOrder: Number(row?.financial?.fixedFeePerOrder || 0),
          variableFeePercent: Number(row?.financial?.variableFeePercent || 0),
          priorityDefault: Number(row?.priority || 100),
          isActive: row?.enabled !== false,
          allowOrderCreation: row?.routing?.allowOrderCreation !== false,
        },
      ])
    ),
  })

  if (!eligibleLinks.length) {
    return {
      hasConfig: true,
      candidates: [],
      attempts,
      reason: 'product_links_not_eligible',
      routingMode: input.routingMode === 'priority' ? 'priority' : 'cheapest',
    }
  }

  const healthSnapshot = await computeProviderHealthSnapshot()
  const quoteResults = await Promise.all(
    eligibleLinks.map(async (link) => {
      const providerKey = String(link.providerCode || '').trim().toLowerCase()
      const adapter = adapterByKey.get(providerKey)
      if (!adapter) {
        return {
          attempt: {
            providerSlot: 'primary' as ProviderSlot,
            providerAdapterKey: providerKey,
            providerProductId: String(link.providerProductId || '').trim() || undefined,
            outcome: 'skipped' as const,
            reason: 'provider_key_not_available',
          },
        }
      }

      const healthKey = `${adapter.slot}:${adapter.key}`
      const health = healthSnapshot[healthKey]
      const manuallyDisabled = health?.manualEnabled === false
      const autoDisabled = Boolean(health?.autoDisabled)
      if (manuallyDisabled || autoDisabled) {
        return {
          attempt: {
            providerSlot: adapter.slot,
            providerAdapterKey: adapter.key,
            providerProductId: String(link.providerProductId || '').trim() || undefined,
            outcome: 'skipped' as const,
            reason: manuallyDisabled ? 'provider_disabled_by_admin' : 'provider_disabled_by_health',
          },
        }
      }

      const quote = await resolveQuoteCached(adapter, {
        providerProductId: String(link.providerProductId || '').trim(),
        preferredName: String(link.providerProductName || input.productName || '').trim() || input.productName,
        packageOption: input.packageOption,
      })
      if (!quote || quote.unitCost <= 0 || quote.stockStatus === 'out_of_stock' || quote.stockStatus === 'paused') {
        return {
          attempt: {
            providerSlot: adapter.slot,
            providerAdapterKey: adapter.key,
            providerProductId: String(link.providerProductId || '').trim() || undefined,
            outcome: 'skipped' as const,
            reason: 'unavailable_or_no_quote',
          },
        }
      }

      const requirements = detectProviderInputRequirements({
        params: (quote.raw as any)?.params ?? (quote.raw as any)?.requirements?.requiredFields ?? null,
        qtyValues: (quote.raw as any)?.qty_values ?? null,
      })
      if (requirements.requiresExtraInput) {
        return {
          attempt: {
            providerSlot: adapter.slot,
            providerAdapterKey: adapter.key,
            providerProductId: quote.providerProductId,
            outcome: 'skipped' as const,
            reason: 'requires_extra_input',
          },
        }
      }

      const profile = profileByKey.get(providerKey) || null
      const rawUnitCost =
        String(link.priceSource || 'provider') === 'manual' && Number(link.manualCost || 0) > 0
          ? Number(link.manualCost || 0)
          : quote.unitCost
      const effectiveUnitCost = getEffectiveProviderCost({
        rawProviderCost: rawUnitCost,
        settlementRate: Number(profile?.financial?.landingRate || 1),
        fixedFeePerOrder: Number(profile?.financial?.fixedFeePerOrder || 0),
        variableFeePercent: Number(profile?.financial?.variableFeePercent || 0),
      })

      const providerStats = healthSnapshot[healthKey]
      const providerFailureRate = Number(providerStats?.failureRate || 0)
      const providerSuccessRate = Number(providerStats?.successRate || 0)
      const providerAvgResponseMs = Number(providerStats?.avgResponseMs || 0)
      return {
        candidate: {
          providerSlot: adapter.slot,
          providerAdapter: adapter,
          providerProductId: quote.providerProductId,
          providerProductName: quote.providerProductName,
          priority: Number.isFinite(Number(link.priority))
            ? Number(link.priority)
            : Number(profile?.priority || 100),
          fallbackEnabled: link.fallbackEnabled !== false,
          unitCost: rawUnitCost,
          effectiveUnitCost,
          stockStatus: quote.stockStatus,
          rawQuote: quote.raw,
          score: computeCandidateScore({
            unitCost: effectiveUnitCost,
            failureRate: providerFailureRate,
            avgResponseMs: providerAvgResponseMs,
          }),
          providerFailureRate,
          providerSuccessRate,
          providerAvgResponseMs,
        } as RoutingCandidate,
      }
    })
  )

  const candidates: RoutingCandidate[] = []
  for (const result of quoteResults) {
    if ((result as any).attempt) attempts.push((result as any).attempt)
    if ((result as any).candidate) candidates.push((result as any).candidate)
  }

  const sorted = [...candidates]
  if (input.routingMode === 'priority') {
    sorted.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      return a.score - b.score
    })
  } else {
    sorted.sort((a, b) => {
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      if (a.priority !== b.priority) return a.priority - b.priority
      return a.score - b.score
    })
  }

  const best = selectBestProvider({
    providers: sorted.map((row) => ({
      providerCode: row.providerAdapter.key,
      providerProductId: String(row.providerProductId || ''),
      enabled: true,
      priority: row.priority,
      fallbackEnabled: row.fallbackEnabled,
      rawUnitCost: row.unitCost,
      effectiveUnitCost: row.effectiveUnitCost,
    })),
    routingMode: input.routingMode === 'priority' ? 'priority' : 'cheapest',
  })

  if (best) {
    sorted.sort((a, b) => {
      const aBest = a.providerAdapter.key === best.providerCode && String(a.providerProductId || '') === best.providerProductId ? 0 : 1
      const bBest = b.providerAdapter.key === best.providerCode && String(b.providerProductId || '') === best.providerProductId ? 0 : 1
      if (aBest !== bBest) return aBest - bBest
      if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
      return a.priority - b.priority
    })
  }

  return {
    hasConfig: true,
    candidates: sorted,
    attempts,
    reason: sorted.length ? 'product_links_ok' : 'product_links_no_available_provider',
    routingMode: input.routingMode === 'priority' ? 'priority' : 'cheapest',
  }
}

export async function selectBestProviderForProduct(input: {
  productSlug: string
  productId: string
  productName: string
  packageOption?: string
  providerMode?: string
  providerLinks?: ProductProviderLink[]
  routingMode?: ProductRoutingMode
}) {
  const mode = normalizeProductProviderMode(input.providerMode)
  if (mode === 'manual') {
    return {
      candidates: [] as RoutingCandidate[],
      attempts: [] as RoutingAttempt[],
      reason: 'manual_mode',
    }
  }

  const advancedEnabled = String(process.env.ENABLE_PROVIDER_OPTIONS_V2 || 'true').trim().toLowerCase() !== 'false'
  const linksSelection = await selectBestProviderFromProductLinks({
    productSlug: input.productSlug,
    productName: input.productName,
    packageOption: input.packageOption,
    providerLinks: input.providerLinks,
    routingMode: input.routingMode,
  })
  if (linksSelection.hasConfig) {
    return {
      candidates: linksSelection.candidates,
      attempts: linksSelection.attempts,
      reason: linksSelection.reason,
      selectionMode: linksSelection.routingMode === 'priority' ? 'product_links_priority' : 'product_links_cheapest',
    }
  }

  if (advancedEnabled) {
    const advanced = await selectBestProviderFromAdvancedConfig({
      productSlug: input.productSlug,
      productName: input.productName,
      packageOption: input.packageOption,
    })
    if (advanced.hasConfig) {
      return {
        candidates: advanced.candidates,
        attempts: advanced.attempts,
        reason: advanced.reason,
        selectionMode: advanced.routingMode,
      }
    }
  }

  const enabledAdapters = getEnabledProviderAdapters()
  const healthSnapshot = await computeProviderHealthSnapshot()
  const adapterBySlot = new Map<ProviderSlot, ProviderAdapter>()
  for (const adapter of enabledAdapters) {
    if (!adapterBySlot.has(adapter.slot)) {
      adapterBySlot.set(adapter.slot, adapter)
    }
  }

  const allowedSlots = resolveAllowedSlots(mode).filter((slot) => adapterBySlot.has(slot))
  if (!allowedSlots.length) {
    return {
      candidates: [] as RoutingCandidate[],
      attempts: [] as RoutingAttempt[],
      reason: 'no_enabled_provider',
    }
  }

  const mappings = await ProductProviderMapping.find({
    internalSlug: String(input.productSlug || '').trim().toLowerCase(),
    providerSlot: { $in: allowedSlots },
    active: true,
  })
    .sort({ priority: 1, updatedAt: -1 })
    .lean()

  const rawCandidates: Array<{
    providerSlot: ProviderSlot
    providerAdapterKey: 'dailycard' | 'go4card'
    providerProductId?: string
    providerProductName?: string
    priority: number
    fallbackEnabled: boolean
  }> = []

  for (const row of mappings as Array<any>) {
    const slot = String(row?.providerSlot || '').toLowerCase() as ProviderSlot
    const adapter = adapterBySlot.get(slot)
    if (!adapter) continue

    rawCandidates.push({
      providerSlot: slot,
      providerAdapterKey: adapter.key,
      providerProductId: String(row?.providerProductId || '').trim() || undefined,
      providerProductName: String(row?.providerProductName || '').trim() || undefined,
      priority: Number.isFinite(Number(row?.priority)) ? Number(row.priority) : 100,
      fallbackEnabled: row?.fallbackEnabled !== false,
    })
  }

  if (!rawCandidates.length && isLikelyProviderBackedProduct(input.productId) && adapterBySlot.has('primary')) {
    const adapter = adapterBySlot.get('primary')!
    rawCandidates.push({
      providerSlot: 'primary',
      providerAdapterKey: adapter.key,
      providerProductId: String(input.productId || '').trim(),
      providerProductName: input.productName,
      priority: 100,
      fallbackEnabled: true,
    })
  }

  if (!rawCandidates.length) {
    return {
      candidates: [] as RoutingCandidate[],
      attempts: [] as RoutingAttempt[],
      reason: 'no_mapping',
    }
  }

  const quotedCandidates: RoutingCandidate[] = []
  const attempts: RoutingAttempt[] = []
  const seenCandidates = new Set<string>()

  const quoteWorkLegacy: Array<{ candidate: typeof rawCandidates[number]; adapter: ProviderAdapter }> = []
  for (const candidate of rawCandidates) {
    const adapter = adapterBySlot.get(candidate.providerSlot)
    if (!adapter || adapter.key !== candidate.providerAdapterKey) continue
    const healthKey = `${candidate.providerSlot}:${adapter.key}`
    const health = healthSnapshot[healthKey]
    const manuallyDisabled = health?.manualEnabled === false
    const autoDisabled = Boolean(health?.autoDisabled)
    if (manuallyDisabled || autoDisabled) {
      attempts.push({
        providerSlot: candidate.providerSlot,
        providerAdapterKey: adapter.key,
        providerProductId: candidate.providerProductId,
        outcome: 'skipped',
        reason: manuallyDisabled ? 'provider_disabled_by_admin' : 'provider_disabled_by_health',
      })
      continue
    }

    const dedupeKey = `${candidate.providerSlot}|${adapter.key}|${String(candidate.providerProductId || '').trim().toLowerCase()}`
    if (seenCandidates.has(dedupeKey)) continue
    seenCandidates.add(dedupeKey)

    quoteWorkLegacy.push({ candidate, adapter })
  }

  const legacyQuoteResults = await Promise.all(
    quoteWorkLegacy.map(async ({ candidate, adapter }) => {
      const healthKey = `${candidate.providerSlot}:${adapter.key}`
      const quote = await resolveQuoteCached(adapter, {
        providerProductId: candidate.providerProductId,
        preferredName: candidate.providerProductName || input.productName,
        packageOption: input.packageOption,
      })

      if (!quote || quote.unitCost <= 0 || quote.stockStatus === 'out_of_stock' || quote.stockStatus === 'paused') {
        return {
          attempt: {
            providerSlot: candidate.providerSlot,
            providerAdapterKey: adapter.key,
            providerProductId: candidate.providerProductId,
            outcome: 'skipped' as const,
            reason: 'unavailable_or_no_quote',
          },
        }
      }

      const providerStats = healthSnapshot[healthKey]
      const providerFailureRate = Number(providerStats?.failureRate || 0)
      const providerSuccessRate = Number(providerStats?.successRate || 0)
      const providerAvgResponseMs = Number(providerStats?.avgResponseMs || 0)
      const score = computeCandidateScore({
        unitCost: quote.unitCost,
        failureRate: providerFailureRate,
        avgResponseMs: providerAvgResponseMs,
      })

      const requirements = detectProviderInputRequirements({
        params: (quote.raw as any)?.params ?? (quote.raw as any)?.requirements?.requiredFields ?? null,
        qtyValues: (quote.raw as any)?.qty_values ?? null,
      })

      if (requirements.requiresExtraInput) {
        return {
          attempt: {
            providerSlot: candidate.providerSlot,
            providerAdapterKey: adapter.key,
            providerProductId: quote.providerProductId,
            outcome: 'skipped' as const,
            reason: 'requires_extra_input',
          },
        }
      }

      return {
        candidate: {
          providerSlot: candidate.providerSlot,
          providerAdapter: adapter,
          providerProductId: quote.providerProductId,
          providerProductName: quote.providerProductName,
          priority: candidate.priority,
          fallbackEnabled: candidate.fallbackEnabled,
          unitCost: quote.unitCost,
          effectiveUnitCost: quote.unitCost,
          stockStatus: quote.stockStatus,
          rawQuote: quote.raw,
          score,
          providerFailureRate,
          providerSuccessRate,
          providerAvgResponseMs,
        } as RoutingCandidate,
      }
    })
  )

  for (const result of legacyQuoteResults) {
    if (result.attempt) attempts.push(result.attempt)
    if (result.candidate) quotedCandidates.push(result.candidate)
  }

  quotedCandidates.sort((a, b) => {
    if (a.effectiveUnitCost !== b.effectiveUnitCost) return a.effectiveUnitCost - b.effectiveUnitCost
    if (a.score !== b.score) return a.score - b.score
    if (a.providerSuccessRate !== b.providerSuccessRate) return b.providerSuccessRate - a.providerSuccessRate
    if (a.priority !== b.priority) return a.priority - b.priority
    return `${a.providerSlot}-${a.providerAdapter.key}`.localeCompare(`${b.providerSlot}-${b.providerAdapter.key}`)
  })

  return {
    candidates: quotedCandidates,
    attempts,
    reason: quotedCandidates.length ? 'ok' : 'no_available_provider',
    selectionMode: 'legacy',
  }
}

export async function createRoutedOrder(input: {
  productSlug: string
  productId: string
  productName: string
  packageOption?: string
  providerMode?: string
  providerLinks?: ProductProviderLink[]
  routingMode?: ProductRoutingMode
  orderId: string
  playerId: string
  quantity: number
  sellTotal: number
  fallbackUnitCost: number
  routingRequestUuid: string
}): Promise<RoutedOrderResult> {
  const existingRoutedOrder = (await Order.findOne({
    routingRequestUuid: String(input.routingRequestUuid || '').trim(),
    $or: [
      { providerOrderId: { $exists: true, $ne: '' } },
      { 'providerResponse._providerAdapter': { $exists: true } },
    ],
  })
    .select('providerSlot providerOrderId providerStatus providerResponse')
    .lean()) as any

  if (existingRoutedOrder) {
    return {
      kind: 'already_submitted',
      attempts: [],
      existing: {
        providerSlot: (String(existingRoutedOrder.providerSlot || 'primary') as ProviderSlot),
        providerOrderId: String(existingRoutedOrder.providerOrderId || '').trim() || undefined,
        providerStatus: String(existingRoutedOrder.providerStatus || 'pending').toLowerCase(),
        providerAdapterKey: String((existingRoutedOrder as any)?.providerResponse?._providerAdapter || '').toLowerCase() || undefined,
      },
      message: 'Order already submitted previously',
    }
  }

  const selection = await selectBestProviderForProduct({
    productSlug: input.productSlug,
    productId: input.productId,
    productName: input.productName,
    packageOption: input.packageOption,
    providerMode: input.providerMode,
    providerLinks: input.providerLinks,
    routingMode: input.routingMode,
  })

  const attempts: RoutingAttempt[] = [...selection.attempts]
  if (!selection.candidates.length) {
    return {
      kind: 'local_only',
      attempts,
      reason: selection.reason,
    }
  }

  let hadBalanceIssue = false
  let lastMessage = 'Provider submission failed'
  let balancePayload: unknown = undefined

  const execution = await executeOrderWithFallback({
    orderedCandidates: selection.candidates,
    submit: async (candidate, index) => {
      const estimatedEffectiveTotalCost = Number((candidate.effectiveUnitCost * input.quantity).toFixed(6))
      if (estimatedEffectiveTotalCost >= input.sellTotal) {
        attempts.push({
          providerSlot: candidate.providerSlot,
          providerAdapterKey: candidate.providerAdapter.key,
          providerProductId: candidate.providerProductId,
          unitCost: candidate.unitCost,
          effectiveUnitCost: candidate.effectiveUnitCost,
          outcome: 'skipped',
          reason: 'blocked_no_profit',
        })
        return null
      }

      const qtyRequirement = detectProviderInputRequirements({
        params: (candidate.rawQuote as any)?.params ?? null,
        qtyValues: (candidate.rawQuote as any)?.qty_values ?? null,
      }).quantityRule

      if (!isQuantityAllowedByRequirement(input.quantity, qtyRequirement)) {
        attempts.push({
          providerSlot: candidate.providerSlot,
          providerAdapterKey: candidate.providerAdapter.key,
          providerProductId: candidate.providerProductId,
          unitCost: candidate.unitCost,
          effectiveUnitCost: candidate.effectiveUnitCost,
          outcome: 'skipped',
          reason: 'quantity_not_allowed',
        })
        return null
      }

      try {
        const created = await candidate.providerAdapter.createOrder({
          providerProductId: String(candidate.providerProductId || ''),
          playerId: input.playerId,
          quantity: input.quantity,
          clientOrderId: input.orderId,
        })

        const unitCost = created.unitCost > 0 ? created.unitCost : candidate.unitCost || input.fallbackUnitCost
        const providerTotalCost = Number((unitCost * input.quantity).toFixed(6))
        const providerEffectiveTotalCost = Number((candidate.effectiveUnitCost * input.quantity).toFixed(6))
        const grossProfit = Number((input.sellTotal - providerEffectiveTotalCost).toFixed(6))
        const rawStatus = String(created.rawStatus || 'pending').toLowerCase()
        const normalized = mapProviderOrderStatus(candidate.providerAdapter.key, rawStatus)

        attempts.push({
          providerSlot: candidate.providerSlot,
          providerAdapterKey: candidate.providerAdapter.key,
          providerProductId: candidate.providerProductId,
          unitCost,
          effectiveUnitCost: candidate.effectiveUnitCost,
          outcome: 'success',
        })

        return {
          kind: 'submitted' as const,
          providerSlot: candidate.providerSlot,
          providerAdapterKey: candidate.providerAdapter.key,
          providerProductId: String(candidate.providerProductId || ''),
          providerMatchedProductName: String(candidate.providerProductName || input.productName),
          providerOrderId: created.providerOrderId,
          providerStatus: rawStatus,
          mappedStatus: mapNormalizedOrderStatusToLocal(normalized),
          providerUnitCost: unitCost,
          providerEffectiveUnitCost: candidate.effectiveUnitCost,
          providerTotalCost,
          providerEffectiveTotalCost,
          grossProfit,
          providerResponse: {
            ...((typeof created.rawResponse === 'object' && created.rawResponse) ? created.rawResponse as Record<string, unknown> : {}),
            _routingMeta: {
              chosenBy: String((selection as any)?.selectionMode || 'smart_score'),
              fallbackUsed: index > 0,
              candidateUnitCost: candidate.unitCost,
              candidateEffectiveUnitCost: candidate.effectiveUnitCost,
              candidateScore: candidate.score,
              providerFailureRate: candidate.providerFailureRate,
              providerSuccessRate: candidate.providerSuccessRate,
              providerAvgResponseMs: candidate.providerAvgResponseMs,
              selectionReason: 'effective=raw/settlementRate(+fees), then cheapest/priority',
              routingRequestUuid: input.routingRequestUuid,
            },
          },
          providerMatchMode: input.packageOption ? 'package-option' : 'product-id-or-name',
          fallbackUsed: index > 0,
          attempts,
        }
      } catch (error: any) {
        const providerError = error as ProviderCreateOrderError
        const canFallback = providerError.canFallback !== false && candidate.fallbackEnabled
        lastMessage =
          providerError.safeMessage ||
          providerError.message ||
          'Provider submission failed'

        if (providerError.providerBalanceIssue) {
          hadBalanceIssue = true
          balancePayload = providerError.rawPayload
        }

        attempts.push({
          providerSlot: candidate.providerSlot,
          providerAdapterKey: candidate.providerAdapter.key,
          providerProductId: candidate.providerProductId,
          unitCost: candidate.unitCost,
          effectiveUnitCost: candidate.effectiveUnitCost,
          outcome: 'failed',
          reason: lastMessage,
          balanceIssue: Boolean(providerError.providerBalanceIssue),
          canFallback,
        })

        if (!canFallback) {
          return { kind: 'stop' as const }
        }
        return null
      }
    },
  })

  if (execution.result && (execution.result as any).kind === 'submitted') {
    return execution.result as RoutedOrderResult
  }

  if (hadBalanceIssue) {
    return {
      kind: 'provider_balance_unavailable',
      attempts,
      providerPayload: balancePayload,
      message: 'Provider balance unavailable',
    }
  }

  if (attempts.some((attempt) => attempt.reason === 'blocked_no_profit')) {
    return {
      kind: 'blocked_no_profit',
      attempts,
      message: 'Order blocked (no profit)',
    }
  }

  return {
    kind: 'submit_failed',
    attempts,
    message: lastMessage,
  }
}
