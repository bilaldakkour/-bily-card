import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import ProductProviderOption from '@/lib/models/ProductProviderOption'
import ProductRoutingPolicy from '@/lib/models/ProductRoutingPolicy'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import ProviderProductReview from '@/lib/models/ProviderProductReview'
import { getProviderAdapters } from '@/lib/providers/registry'
import { getCatalogProducts } from '@/lib/data/catalogProducts'
import { JWTPayload } from '@/lib/types'

function n(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactText(value: unknown) {
  return normalizeText(value).replace(/\s+/g, '')
}

// Compact name key used for safe name-equivalence checks.
// Intentionally removes only spaces, dashes and underscores.
function compactNameKey(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\-_]+/g, '')
    .trim()
}

function escapeRegex(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function tokenize(value: unknown) {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function jaccard(tokensA: string[], tokensB: string[]) {
  if (!tokensA.length || !tokensB.length) return 0
  const a = new Set(tokensA)
  const b = new Set(tokensB)
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection += 1
  const union = new Set([...a, ...b]).size
  return union > 0 ? intersection / union : 0
}

function similarityScore(query: string, name: string) {
  const q = normalizeText(query)
  const n1 = normalizeText(name)
  if (!q || !n1) return 0
  if (q === n1) return 1
  const qc = compactText(query)
  const nc = compactText(name)
  if (qc && nc && qc === nc) return 0.98
  if (qc && nc && (nc.includes(qc) || qc.includes(nc))) return 0.95
  if (n1.includes(q) || q.includes(n1)) return 0.93
  return Number((jaccard(tokenize(q), tokenize(n1)) * 0.9).toFixed(4))
}

function extractNumericTokens(value: unknown) {
  const matches = String(value || '').match(/\d+(?:\.\d+)?/g)
  if (!matches) return []
  return matches.map((token) => token.trim()).filter(Boolean)
}

function detectMatchType(query: string, name: string): 'exact' | 'contains' | 'fuzzy' {
  const q = normalizeText(query)
  const n1 = normalizeText(name)
  if (!q || !n1) return 'fuzzy'
  const compactQ = compactNameKey(query)
  const compactN = compactNameKey(name)
  if (compactQ && compactN && compactQ === compactN) return 'exact'
  if (compactQ && compactN && (compactN.includes(compactQ) || compactQ.includes(compactN))) return 'contains'
  const qc = compactAlphaNum(query)
  const nc = compactAlphaNum(name)
  if (qc && nc && qc === nc) return 'exact'
  if (qc && nc && (nc.includes(qc) || qc.includes(nc))) return 'contains'
  if (q === n1) return 'exact'
  if (n1.includes(q) || q.includes(n1)) return 'contains'
  return 'fuzzy'
}

function isVariantSafe(query: string, name: string) {
  const compactQ = compactNameKey(query)
  const compactN = compactNameKey(name)
  if (compactQ && compactN && compactQ === compactN) return true
  const qc = compactAlphaNum(query)
  const nc = compactAlphaNum(name)
  if (qc && nc && qc === nc) return true
  const qNums = extractNumericTokens(query)
  const nNums = extractNumericTokens(name)
  if (!qNums.length && nNums.length) return false
  if (qNums.length && !nNums.length) return false
  if (!qNums.length) return true
  return qNums.every((token) => nNums.includes(token))
}

function compactAlphaNum(value: unknown) {
  return normalizeText(value).replace(/[^a-z0-9\u0600-\u06ff]+/gi, '')
}

function localNameMatch(query: string, name: string) {
  const q = normalizeText(query)
  const n1 = normalizeText(name)
  if (!q || !n1) return false
  const compactQ = compactNameKey(query)
  const compactN = compactNameKey(name)
  const qc = compactAlphaNum(query)
  const nc = compactAlphaNum(name)
  return (
    n1.includes(q) ||
    q.includes(n1) ||
    (compactQ && compactN && (compactN.includes(compactQ) || compactQ.includes(compactN))) ||
    (qc && nc && (nc.includes(qc) || qc.includes(nc)))
  )
}

async function getHandler(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const action = n(searchParams.get('action') || '')
  const slug = n(searchParams.get('slug') || '')
  const providerKey = n(searchParams.get('providerKey') || '')
  const q = String(searchParams.get('q') || '').trim()
  const limit = Math.max(5, Math.min(50, Number(searchParams.get('limit') || 20)))

  if (action === 'search') {
    if (!providerKey) {
      return NextResponse.json({ success: false, message: 'providerKey is required' }, { status: 400 })
    }

    const queryVariants = Array.from(
      new Set(
        [q, normalizeText(q), compactText(q), normalizeText(q).replace(/\s+/g, '-')]
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    )
    console.info(
      `[providers.options.search] provider=${providerKey} slug=${slug || '-'} q="${q}" variants=${queryVariants.join('|')}`
    )

    const adapter = getProviderAdapters().find((item) => String(item.key || '').toLowerCase() === providerKey)
    const adapterAvailable = Boolean(adapter && adapter.isAvailable())
    const slot = adapter?.slot || (providerKey === 'dailycard' ? 'primary' : providerKey === 'go4card' ? 'secondary' : '')
    if (!adapter) {
      console.info(`[providers.options.search] provider=${providerKey} adapter=missing`)
    } else if (!adapterAvailable) {
      console.info(`[providers.options.search] provider=${providerKey} adapter=unavailable`)
    }
    const sourceRows: Array<{
      providerProductId: string
      providerProductName: string
      source: 'review' | 'live'
      confidence?: number
      score?: number
      matchType?: 'exact' | 'contains' | 'fuzzy'
      variantSafe?: boolean
    }> = []

    let rawReviewCount = 0
    if (slot && q) {
      const tokenList = tokenize(q)
      const reviewRows = await ProviderProductReview.find({
        providerSlot: slot,
        $or: [
          ...queryVariants.map((variant) => ({ providerProductName: { $regex: escapeRegex(variant), $options: 'i' } })),
          ...tokenList.map((token) => ({ providerProductName: { $regex: escapeRegex(token), $options: 'i' } })),
        ],
      })
        .select('providerProductId providerProductName confidence')
        .sort({ confidence: -1, updatedAt: -1 })
        .limit(Math.max(limit * 5, 120))
        .lean()

      rawReviewCount = Array.isArray(reviewRows) ? reviewRows.length : 0
      for (const row of reviewRows as any[]) {
        sourceRows.push({
          providerProductId: String(row?.providerProductId || '').trim(),
          providerProductName: String(row?.providerProductName || '').trim(),
          source: 'review',
          confidence: Number(row?.confidence || 0),
          score: similarityScore(q, String(row?.providerProductName || '')),
          matchType: detectMatchType(q, String(row?.providerProductName || '')),
          variantSafe: isVariantSafe(q, String(row?.providerProductName || '')),
        })
      }
    }

    let rawLiveCount = 0
    let go4cardFullCount = 0
    let go4cardFilteredCount = 0

    if (adapter && adapterAvailable && q) {
      try {
        // Go4Card: use the exact same source as connection test when available.
        if (providerKey === 'go4card') {
          const go4Adapter = adapter as typeof adapter & {
            fetchProductsFromConnectionProbeSource?: () => Promise<any[]>
          }
          const usingProbeSource = typeof go4Adapter.fetchProductsFromConnectionProbeSource === 'function'
          const fullRows = usingProbeSource
            ? await go4Adapter.fetchProductsFromConnectionProbeSource!()
            : await adapter.fetchProducts()
          console.info(
            `[providers.options.search] provider=go4card sourceFunction=${usingProbeSource ? 'fetchProductsFromConnectionProbeSource' : 'fetchProducts'}`
          )
          const rowsSafe = Array.isArray(fullRows) ? fullRows : []
          go4cardFullCount = rowsSafe.length
          rawLiveCount = rowsSafe.length
          console.info(
            `[providers.options.search] provider=go4card beforeLocalFilter=${rowsSafe.length} query="${q}"`
          )
          const filteredLive = rowsSafe
            .filter((row) => localNameMatch(q, String(row?.providerProductName || row?.displayName || '')))
            .sort((a, b) => {
              const sa = similarityScore(q, String(a?.providerProductName || a?.displayName || ''))
              const sb = similarityScore(q, String(b?.providerProductName || b?.displayName || ''))
              return sb - sa
            })
          go4cardFilteredCount = filteredLive.length
          console.info(
            `GO4CARD MATCH DEBUG: fullCount=${go4cardFullCount} query="${q}" filteredCount=${go4cardFilteredCount}`
          )
          for (const row of filteredLive.slice(0, Math.max(limit * 4, 80))) {
            sourceRows.push({
              providerProductId: String(row?.providerProductId || '').trim(),
              providerProductName: String(row?.providerProductName || row?.displayName || '').trim(),
              source: 'live',
              score: similarityScore(q, String(row?.providerProductName || row?.displayName || '')),
              matchType: detectMatchType(q, String(row?.providerProductName || row?.displayName || '')),
              variantSafe: isVariantSafe(q, String(row?.providerProductName || row?.displayName || '')),
            })
          }
        } else {
          for (const variant of queryVariants.slice(0, 4)) {
            const liveRows = await adapter.fetchProducts(variant)
            rawLiveCount += Array.isArray(liveRows) ? liveRows.length : 0
            for (const row of (Array.isArray(liveRows) ? liveRows : []).slice(0, limit)) {
              sourceRows.push({
                providerProductId: String(row?.providerProductId || '').trim(),
                providerProductName: String(row?.providerProductName || row?.displayName || '').trim(),
                source: 'live',
                score: similarityScore(q, String(row?.providerProductName || row?.displayName || '')),
                matchType: detectMatchType(q, String(row?.providerProductName || row?.displayName || '')),
                variantSafe: isVariantSafe(q, String(row?.providerProductName || row?.displayName || '')),
              })
            }
          }
        }
      } catch {
        console.warn(
          `[providers.options.search] provider=${providerKey} live_fetch_failed q="${q}"`
        )
        // Keep search resilient even if provider endpoint is slow.
      }
    }

    const deduped = new Map<string, (typeof sourceRows)[number]>()
    for (const item of sourceRows) {
      const key = `${item.providerProductId}|${item.providerProductName}`.toLowerCase()
      if (!item.providerProductId || !item.providerProductName || deduped.has(key)) continue
      deduped.set(key, item)
    }

    const sortedRows = Array.from(deduped.values())
      .sort((a, b) => {
        const aType = a.matchType || 'fuzzy'
        const bType = b.matchType || 'fuzzy'
        const rank = (x: string) => (x === 'exact' ? 0 : x === 'contains' ? 1 : 2)
        if (rank(aType) !== rank(bType)) return rank(aType) - rank(bType)
        if (a.variantSafe !== b.variantSafe) return a.variantSafe ? -1 : 1
        if (Number(a.score || 0) !== Number(b.score || 0)) return Number(b.score || 0) - Number(a.score || 0)
        return Number(b.confidence || 0) - Number(a.confidence || 0)
      })
    const data = sortedRows.slice(0, limit)
    console.info(
      `[providers.options.search] provider=${providerKey} rawReview=${rawReviewCount} rawLive=${rawLiveCount} merged=${sourceRows.length} dedup=${deduped.size} returned=${data.length}`
    )

    return NextResponse.json({
      success: true,
      data,
      meta: {
        adapterAvailable,
        slot,
        rawReviewCount,
        rawLiveCount,
        go4cardFullCount,
        go4cardFilteredCount,
        mergedCount: sourceRows.length,
        dedupCount: deduped.size,
        returnedCount: data.length,
        queryVariants,
      },
    })
  }

  if (action === 'audit') {
    const catalogProducts = await getCatalogProducts()
    const optionRows = await ProductProviderOption.find({})
      .select('internalSlug providerKey providerProductId providerProductName active fallbackEnabled priority')
      .lean()
    const policyRows = await ProductRoutingPolicy.find({})
      .select('internalSlug routingMode forcedProviderKey')
      .lean()

    const optionsBySlug = new Map<string, any[]>()
    for (const row of optionRows as any[]) {
      const key = n(row?.internalSlug)
      if (!key) continue
      if (!optionsBySlug.has(key)) optionsBySlug.set(key, [])
      optionsBySlug.get(key)!.push(row)
    }

    const policyBySlug = new Map<string, any>()
    for (const policy of policyRows as any[]) {
      const key = n(policy?.internalSlug)
      if (!key) continue
      policyBySlug.set(key, policy)
    }

    const rows = catalogProducts.map((product) => {
      const internalSlug = n(product?.slug)
      const options = optionsBySlug.get(internalSlug) || []
      const activeOptions = options.filter((item) => item?.active !== false)
      const providers = Array.from(
        new Set(
          activeOptions
            .map((item) => n(item?.providerKey))
            .filter(Boolean)
        )
      )
      const policy = policyBySlug.get(internalSlug)
      const status =
        providers.length >= 2
          ? 'ready_multi'
          : providers.length === 1
            ? 'ready_single'
            : 'missing_all'

      return {
        internalSlug,
        productName: String(product?.name || '').trim() || internalSlug,
        category: String(product?.category || '').trim() || '',
        activeProviderCount: providers.length,
        activeProviders: providers,
        optionCount: options.length,
        status,
        routingMode: String(policy?.routingMode || 'cheapest'),
        forcedProviderKey: String(policy?.forcedProviderKey || '').trim() || undefined,
      }
    })

    const summary = {
      totalProducts: rows.length,
      readyMulti: rows.filter((item) => item.status === 'ready_multi').length,
      readySingle: rows.filter((item) => item.status === 'ready_single').length,
      missingAll: rows.filter((item) => item.status === 'missing_all').length,
    }

    return NextResponse.json({ success: true, data: { summary, rows } })
  }

  const query = slug ? { internalSlug: slug } : {}
  const rows = await ProductProviderOption.find(query).sort({ internalSlug: 1, priority: 1, updatedAt: -1 }).lean()

  const policy = slug
    ? await ProductRoutingPolicy.findOne({ internalSlug: slug }).lean()
    : null

  const legacyMappings = slug
    ? await ProductProviderMapping.find({ internalSlug: slug, active: true })
        .select('providerSlot providerProductId providerProductName active fallbackEnabled priority')
        .lean()
    : []

  return NextResponse.json({
    success: true,
    data: {
      options: rows,
      policy: policy || null,
      legacyMappings,
    },
  })
}

async function patchHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()

  const internalSlug = n(body?.internalSlug || '')
  const providerKey = n(body?.providerKey || '')
  const providerProductId = String(body?.providerProductId || '').trim()
  if (!internalSlug || !providerKey || !providerProductId) {
    return NextResponse.json(
      { success: false, message: 'internalSlug, providerKey, providerProductId are required' },
      { status: 400 }
    )
  }

  const updated = await ProductProviderOption.findOneAndUpdate(
    { internalSlug, providerKey, providerProductId },
    {
      $set: {
        internalSlug,
        providerKey,
        providerProductId,
        providerProductName: String(body?.providerProductName || '').trim() || undefined,
        active: body?.active !== false,
        fallbackEnabled: body?.fallbackEnabled !== false,
        priority: Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 100,
        fixedUnitCost: Number.isFinite(Number(body?.fixedUnitCost)) ? Number(body.fixedUnitCost) : undefined,
        metadata:
          typeof body?.metadata === 'object' && body?.metadata
            ? body.metadata
            : undefined,
        updatedBy: admin.userId,
      },
    },
    { upsert: true, new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

async function postHandler(req: NextRequest, admin: JWTPayload) {
  await connectDB()
  const body = await req.json()
  const internalSlug = n(body?.internalSlug || '')
  const routingMode = n(body?.routingMode || 'cheapest')
  const forcedProviderKey = n(body?.forcedProviderKey || '')

  if (!internalSlug) {
    return NextResponse.json({ success: false, message: 'internalSlug is required' }, { status: 400 })
  }
  if (!['cheapest', 'priority', 'forced'].includes(routingMode)) {
    return NextResponse.json({ success: false, message: 'Invalid routing mode' }, { status: 400 })
  }

  const updated = await ProductRoutingPolicy.findOneAndUpdate(
    { internalSlug },
    {
      $set: {
        internalSlug,
        routingMode,
        forcedProviderKey: routingMode === 'forced' ? forcedProviderKey || undefined : undefined,
        updatedBy: admin.userId,
      },
    },
    { upsert: true, new: true }
  ).lean()

  return NextResponse.json({ success: true, data: updated })
}

async function deleteHandler(req: NextRequest) {
  await connectDB()
  const body = await req.json()
  const internalSlug = n(body?.internalSlug || '')
  const providerKey = n(body?.providerKey || '')
  const providerProductId = String(body?.providerProductId || '').trim()
  if (!internalSlug || !providerKey || !providerProductId) {
    return NextResponse.json(
      { success: false, message: 'internalSlug, providerKey, providerProductId are required' },
      { status: 400 }
    )
  }

  await ProductProviderOption.deleteOne({ internalSlug, providerKey, providerProductId })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, (r, u) => patchHandler(r, u))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, (r, u) => postHandler(r, u))
}

export async function DELETE(req: NextRequest) {
  return withAdminAuth(req, () => deleteHandler(req))
}
