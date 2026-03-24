import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import { getCatalogProducts } from '@/lib/data/catalogProducts'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import ProviderProductReview from '@/lib/models/ProviderProductReview'
import { getProviderAdapters } from '@/lib/providers/registry'
import { JWTPayload } from '@/lib/types'

async function getHandler(req: NextRequest, _admin: JWTPayload) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const slug = String(searchParams.get('slug') || '').trim().toLowerCase()
    const grouped = searchParams.get('grouped') === '1'

    const query = slug ? { internalSlug: slug } : {}
    const rows = await ProductProviderMapping.find(query)
      .sort({ internalSlug: 1, priority: 1, providerSlot: 1 })
      .lean()

    if (!grouped) {
      return NextResponse.json({ success: true, data: rows })
    }

    const catalogProducts = await getCatalogProducts()
    const catalogMap = new Map(
      catalogProducts.map((product) => [String(product.slug || '').toLowerCase(), product])
    )

    const groupedMap = new Map<string, any>()
    for (const row of rows as any[]) {
      const internalSlug = String(row?.internalSlug || '').toLowerCase()
      if (!internalSlug) continue
      if (!groupedMap.has(internalSlug)) {
        const product = catalogMap.get(internalSlug)
        groupedMap.set(internalSlug, {
          internalSlug,
          productName: String(product?.name || internalSlug),
          category: String(product?.category || ''),
          primary: null,
          secondary: null,
          status: 'missing_primary',
        })
      }

      const bucket = groupedMap.get(internalSlug)
      if (row?.providerSlot === 'primary') bucket.primary = row
      if (row?.providerSlot === 'secondary') bucket.secondary = row
    }

    const data = Array.from(groupedMap.values()).map((item: any) => {
      const primaryActive = item.primary && item.primary.active !== false
      const secondaryActive = item.secondary && item.secondary.active !== false
      const requirements =
        item.primary?.metadata?.requirements ||
        item.secondary?.metadata?.requirements ||
        null
      const activeCount = [item.primary, item.secondary].filter((row) => row && row.active !== false).length
      const sourceType = activeCount >= 2 ? 'multi_source' : activeCount === 1 ? 'single_source' : 'unmapped'

      let status = 'fully_mapped'
      if (!item.primary && !item.secondary) status = 'orphaned'
      else if (!item.primary) status = 'missing_primary'
      else if (!item.secondary) status = 'missing_secondary'
      else if (!primaryActive && !secondaryActive) status = 'inactive_only'
      else if (primaryActive && !secondaryActive) status = 'secondary_inactive'
      else if (!primaryActive && secondaryActive) status = 'primary_inactive'

      return {
        ...item,
        status,
        sourceType,
        requirements,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Admin provider mappings GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch provider mappings' },
      { status: 500 }
    )
  }
}

async function patchHandler(req: NextRequest, admin: JWTPayload) {
  try {
    await connectDB()
    const body = await req.json()
    const internalSlug = String(body?.internalSlug || '').trim().toLowerCase()
    const providerSlot = String(body?.providerSlot || '').trim().toLowerCase()
    const providerProductId = String(body?.providerProductId || '').trim()

    if (!internalSlug || !providerProductId || !['primary', 'secondary'].includes(providerSlot)) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid mapping payload' },
        { status: 400 }
      )
    }

    const updated = await ProductProviderMapping.findOneAndUpdate(
      { internalSlug, providerSlot, providerProductId },
      {
        $set: {
          internalSlug,
          providerSlot,
          providerProductId,
          providerProductName: String(body?.providerProductName || '').trim() || undefined,
          active: body?.active !== false,
          fallbackEnabled: body?.fallbackEnabled !== false,
          priority: Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 100,
          lastSyncedCost: Number.isFinite(Number(body?.lastSyncedCost))
            ? Number(body.lastSyncedCost)
            : undefined,
          currency: String(body?.currency || 'USD').trim() || 'USD',
          stockStatus: String(body?.stockStatus || 'unknown').trim() || 'unknown',
          deliveryType: String(body?.deliveryType || '').trim() || undefined,
          manualPriceOverride: Number.isFinite(Number(body?.manualPriceOverride))
            ? Number(body.manualPriceOverride)
            : undefined,
          marginRule: String(body?.marginRule || '').trim() || undefined,
          categoryMapping: String(body?.categoryMapping || '').trim() || undefined,
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
  } catch (error) {
    console.error('Admin provider mappings PATCH error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update provider mapping' },
      { status: 500 }
    )
  }
}

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

function scoreNameSimilarity(a: unknown, b: unknown) {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.92
  return Number((jaccard(tokenize(na), tokenize(nb)) * 0.88).toFixed(4))
}

async function postHandler(_req: NextRequest, admin: JWTPayload) {
  try {
    await connectDB()
    const catalogProducts = await getCatalogProducts()
    const catalogNameBySlug = new Map<string, string>()
    for (const product of catalogProducts) {
      const slug = String(product?.slug || '').trim().toLowerCase()
      if (!slug) continue
      catalogNameBySlug.set(slug, String(product?.name || '').trim())
    }

    const allMappings = await ProductProviderMapping.find({ active: true })
      .select('internalSlug providerSlot providerProductId providerProductName priority')
      .lean()

    const primaryBySlug = new Map<string, any>()
    const hasSecondary = new Set<string>()
    const secondaryByProviderId = new Map<string, string>()

    for (const row of allMappings as any[]) {
      const slug = String(row?.internalSlug || '').toLowerCase()
      if (!slug) continue
      const slot = String(row?.providerSlot || '')
      const providerId = String(row?.providerProductId || '').trim().toLowerCase()
      if (slot === 'primary') primaryBySlug.set(slug, row)
      if (slot === 'secondary') {
        hasSecondary.add(slug)
        if (providerId) secondaryByProviderId.set(providerId, slug)
      }
    }

    const missingSecondarySlugs = Array.from(primaryBySlug.keys()).filter((slug) => !hasSecondary.has(slug))
    if (!missingSecondarySlugs.length) {
      return NextResponse.json({
        success: true,
        data: { scanned: 0, linked: 0, skipped: 0, reason: 'no_missing_secondary' },
      })
    }

    const secondaryReviews = await ProviderProductReview.find({
      providerSlot: 'secondary',
      classification: { $nin: ['invalid_or_unusable'] },
      reviewStatus: { $nin: ['ignored'] },
    })
      .select('providerProductId providerProductName suggestedInternalSlug classification confidence reviewStatus rawSnapshot')
      .lean()

    let secondaryLiveProducts: Array<{ providerProductId: string; providerProductName: string; stockStatus?: string; metadata?: any }> = []
    try {
      const secondaryAdapter = getProviderAdapters().find((adapter) => adapter.slot === 'secondary' && adapter.isAvailable())
      if (secondaryAdapter) {
        const liveRows = await secondaryAdapter.fetchProducts()
        secondaryLiveProducts = liveRows
          .map((row) => ({
            providerProductId: String(row?.providerProductId || '').trim(),
            providerProductName: String(row?.providerProductName || row?.displayName || '').trim(),
            stockStatus: String(row?.stockStatus || 'unknown').toLowerCase(),
            metadata: row?.metadata || {},
          }))
          .filter((row) => row.providerProductId && row.providerProductName)
      }
    } catch (error) {
      console.warn('Auto-map missing secondary: live secondary fetch failed, continuing with review rows only', error)
    }

    const liveByExactName = new Map<string, Array<{ providerProductId: string; providerProductName: string; stockStatus?: string; metadata?: any }>>()
    const liveById = new Map<string, { providerProductId: string; providerProductName: string; stockStatus?: string; metadata?: any }>()
    for (const row of secondaryLiveProducts) {
      const key = normalizeText(row.providerProductName)
      if (!key) continue
      if (!liveByExactName.has(key)) liveByExactName.set(key, [])
      liveByExactName.get(key)!.push(row)
      const idKey = String(row.providerProductId || '').trim().toLowerCase()
      if (idKey && !liveById.has(idKey)) liveById.set(idKey, row)
    }

    const bySuggestedSlug = new Map<string, any[]>()
    const byName = new Map<string, any[]>()
    for (const row of secondaryReviews as any[]) {
      const slug = String(row?.suggestedInternalSlug || '').toLowerCase().trim()
      if (slug) {
        if (!bySuggestedSlug.has(slug)) bySuggestedSlug.set(slug, [])
        bySuggestedSlug.get(slug)!.push(row)
      }
      const nameKey = normalizeText(row?.providerProductName || '')
      if (nameKey) {
        if (!byName.has(nameKey)) byName.set(nameKey, [])
        byName.get(nameKey)!.push(row)
      }
    }

    let linked = 0
    let skipped = 0
    const samples: Array<{ slug: string; providerProductId?: string; reason: string }> = []

    for (const slug of missingSecondarySlugs) {
      const primary = primaryBySlug.get(slug)
      const primaryNameKey = normalizeText(primary?.providerProductName || '')
      const primaryProviderId = String(primary?.providerProductId || '').trim().toLowerCase()

      let candidates = (bySuggestedSlug.get(slug) || [])
        .slice()
        .sort((a: any, b: any) => Number(b?.confidence || 0) - Number(a?.confidence || 0))

      if (!candidates.length && primaryProviderId) {
        const sameId = liveById.get(primaryProviderId)
        if (sameId) {
          candidates = [
            {
              providerProductId: sameId.providerProductId,
              providerProductName: sameId.providerProductName,
              classification: 'live_same_id',
              confidence: 1,
              rawSnapshot: {
                stockStatus: sameId.stockStatus || 'unknown',
                metadata: sameId.metadata || {},
              },
            } as any,
          ]
        }
      }

      if (!candidates.length && primaryNameKey) {
        const byNameRows = byName.get(primaryNameKey) || []
        // Exact normalized-name fallback only when unique to avoid risky links.
        if (byNameRows.length === 1) candidates = byNameRows
      }

      if (!candidates.length) {
        const exactKeys = [
          normalizeText(primary?.providerProductName || ''),
          normalizeText(catalogNameBySlug.get(slug) || ''),
          normalizeText(slug.replace(/-/g, ' ')),
        ].filter(Boolean)

        for (const key of exactKeys) {
          const liveMatches = liveByExactName.get(key) || []
          if (liveMatches.length === 1) {
            const one = liveMatches[0]
            candidates = [
              {
                providerProductId: one.providerProductId,
                providerProductName: one.providerProductName,
                classification: 'live_exact_name_match',
                confidence: 0.95,
                rawSnapshot: {
                  stockStatus: one.stockStatus || 'unknown',
                  metadata: one.metadata || {},
                },
              } as any,
            ]
            break
          }
        }
      }

      if (!candidates.length) {
        // Fuzzy fallback based on catalog/primary names to unlock shared products with wording differences.
        const targetNames = [
          primary?.providerProductName,
          catalogNameBySlug.get(slug) || '',
        ]
          .map((value) => String(value || '').trim())
          .filter(Boolean)

        const scored = (secondaryReviews as any[])
          .map((row) => {
            const providerName = String(row?.providerProductName || '').trim()
            const bestScore = targetNames.reduce((max, target) => {
              const next = scoreNameSimilarity(target, providerName)
              return next > max ? next : max
            }, 0)
            return { row, bestScore }
          })
          .filter((entry) => entry.bestScore >= 0.72)
          .sort((a, b) => b.bestScore - a.bestScore)

        if (scored.length) {
          const top = scored[0]
          const second = scored[1]
          const hasSafeMargin = !second || top.bestScore - second.bestScore >= 0.08
          if (hasSafeMargin) {
            candidates = [top.row]
          } else {
            skipped += 1
            if (samples.length < 30) {
              samples.push({
                slug,
                reason: `ambiguous_name_match:${top.bestScore.toFixed(2)}~${second.bestScore.toFixed(2)}`,
              })
            }
            continue
          }
        }
      }

      if (!candidates.length && secondaryLiveProducts.length) {
        const targetNames = [
          primary?.providerProductName,
          catalogNameBySlug.get(slug) || '',
          slug.replace(/-/g, ' '),
        ]
          .map((value) => String(value || '').trim())
          .filter(Boolean)

        const scoredLive = secondaryLiveProducts
          .map((row) => {
            const bestScore = targetNames.reduce((max, target) => {
              const next = scoreNameSimilarity(target, row.providerProductName)
              return next > max ? next : max
            }, 0)
            return { row, bestScore }
          })
          .filter((entry) => entry.bestScore >= 0.78)
          .sort((a, b) => b.bestScore - a.bestScore)

        if (scoredLive.length) {
          const top = scoredLive[0]
          const second = scoredLive[1]
          const hasSafeMargin = !second || top.bestScore - second.bestScore >= 0.06
          if (hasSafeMargin) {
            candidates = [
              {
                providerProductId: top.row.providerProductId,
                providerProductName: top.row.providerProductName,
                classification: 'live_name_match',
                confidence: Number(top.bestScore.toFixed(4)),
                rawSnapshot: {
                  stockStatus: top.row.stockStatus || 'unknown',
                  metadata: top.row.metadata || {},
                },
              } as any,
            ]
          }
        }
      }

      if (!candidates.length) {
        skipped += 1
        if (samples.length < 30) samples.push({ slug, reason: 'no_candidate' })
        continue
      }

      const candidate = candidates[0]
      const providerProductId = String(candidate?.providerProductId || '').trim()
      if (!providerProductId) {
        skipped += 1
        if (samples.length < 30) samples.push({ slug, reason: 'candidate_missing_provider_product_id' })
        continue
      }

      const providerIdKey = providerProductId.toLowerCase()
      const existingSlug = secondaryByProviderId.get(providerIdKey)
      if (existingSlug && existingSlug !== slug) {
        skipped += 1
        if (samples.length < 30) {
          samples.push({
            slug,
            providerProductId,
            reason: `provider_product_already_mapped_to_${existingSlug}`,
          })
        }
        continue
      }

      await ProductProviderMapping.findOneAndUpdate(
        {
          internalSlug: slug,
          providerSlot: 'secondary',
          providerProductId,
        },
        {
          $set: {
            internalSlug: slug,
            providerSlot: 'secondary',
            providerProductId,
            providerProductName: String(candidate?.providerProductName || '').trim() || undefined,
            active: true,
            fallbackEnabled: true,
            priority: 200,
            stockStatus: String((candidate as any)?.rawSnapshot?.stockStatus || 'unknown').toLowerCase() || 'unknown',
            metadata: {
              ...(((candidate as any)?.rawSnapshot?.metadata || {}) as Record<string, unknown>),
              autoLinkedBy: 'auto_map_missing_secondary',
              classification: String(candidate?.classification || ''),
              confidence: Number(candidate?.confidence || 0),
            },
            updatedBy: admin.userId,
          },
          $setOnInsert: {
            currency: 'USD',
          },
        },
        { upsert: true }
      )

      await ProviderProductReview.updateOne(
        { _id: (candidate as any)._id },
        { $set: { reviewStatus: 'linked', updatedBy: admin.userId } }
      )

      secondaryByProviderId.set(providerIdKey, slug)
      linked += 1
    }

    return NextResponse.json({
      success: true,
      data: {
        scanned: missingSecondarySlugs.length,
        linked,
        skipped,
        samples,
        summary: samples.reduce((acc: Record<string, number>, item) => {
          const key = String(item.reason || 'unknown')
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {}),
      },
    })
  } catch (error) {
    console.error('Admin provider mappings POST auto-map error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to auto-map missing secondary products' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, (r, u) => getHandler(r, u))
}

export async function PATCH(req: NextRequest) {
  return withAdminAuth(req, (r, u) => patchHandler(r, u))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, (r, u) => postHandler(r, u))
}
