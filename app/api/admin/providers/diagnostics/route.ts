import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/middleware'
import { connectDB } from '@/lib/db/mongodb'
import { getCatalogProducts } from '@/lib/data/catalogProducts'
import Order from '@/lib/models/Order'
import ProductProviderMapping from '@/lib/models/ProductProviderMapping'
import { selectBestProviderForProduct } from '@/lib/orders/providerRoutingService'
import { detectProviderInputRequirements } from '@/lib/providers/inputRequirements'
import { mapProviderOrderStatus, mapNormalizedOrderStatusToLocal } from '@/lib/providers/statusMapping'
import { computeProviderHealthSnapshot } from '@/lib/providers/health'

function n(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

async function getHandler(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const days = Math.max(1, Math.min(60, Number(searchParams.get('days') || 7)))
    const lowMarginThreshold = Math.max(0, Math.min(100, Number(searchParams.get('lowMarginThreshold') || 5)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const orders = await Order.find({ createdAt: { $gte: since } })
      .select(
        'orderId productSlug status providerSlot providerStatus providerResponse providerUnitCost providerTotalCost total grossProfit createdAt updatedAt'
      )
      .sort({ createdAt: -1 })
      .lean()

    const byProvider: Record<string, { total: number; success: number; failed: number; fallback: number; avgResponseMs: number; sumResponseMs: number; countedResponseMs: number }> = {}
    const lowMarginOrders: Array<{ orderId: string; productSlug: string; total: number; providerTotalCost: number; grossProfit: number }> = []
    const adapterKeys = new Set<string>()

    for (const row of orders as any[]) {
      const slot = String(row?.providerSlot || 'manual')
      const adapter = String(row?.providerResponse?._providerAdapter || 'unknown')
      const providerKey = slot === 'manual' ? 'manual' : `${slot}:${adapter}`
      adapterKeys.add(providerKey)
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = {
          total: 0,
          success: 0,
          failed: 0,
          fallback: 0,
          avgResponseMs: 0,
          sumResponseMs: 0,
          countedResponseMs: 0,
        }
      }
      const stat = byProvider[providerKey]
      stat.total += 1

      const status = String(row?.status || '').toLowerCase()
      if (status === 'completed') stat.success += 1
      if (['failed', 'rejected', 'refunded'].includes(status)) stat.failed += 1
      if (Boolean(row?.providerResponse?._routingMeta?.fallbackUsed)) stat.fallback += 1

      const responseMs = n(row?.providerResponse?._timingMs)
      if (responseMs > 0) {
        stat.sumResponseMs += responseMs
        stat.countedResponseMs += 1
      }

      const total = n(row?.total)
      const providerTotalCost = n(row?.providerTotalCost)
      const grossProfit = n(row?.grossProfit)
      const marginPct = total > 0 ? (grossProfit / total) * 100 : 0
      if (total > 0 && marginPct < lowMarginThreshold) {
        lowMarginOrders.push({
          orderId: String(row?.orderId || ''),
          productSlug: String(row?.productSlug || ''),
          total,
          providerTotalCost,
          grossProfit,
        })
      }
    }

    for (const key of Object.keys(byProvider)) {
      const stat = byProvider[key]
      stat.avgResponseMs =
        stat.countedResponseMs > 0
          ? Number((stat.sumResponseMs / stat.countedResponseMs).toFixed(2))
          : 0
      delete (stat as any).sumResponseMs
      delete (stat as any).countedResponseMs
    }

    const mappings = await ProductProviderMapping.find({})
      .select('internalSlug providerSlot active fallbackEnabled lastSyncedCost stockStatus updatedAt metadata')
      .lean()
    const healthSnapshot = await computeProviderHealthSnapshot({ forceRefresh: true, days })

    const staleMappings = (mappings as any[])
      .filter((row) => {
        const updatedAt = row?.updatedAt ? new Date(row.updatedAt).getTime() : 0
        return updatedAt > 0 && Date.now() - updatedAt > 7 * 24 * 60 * 60 * 1000
      })
      .map((row) => ({
        internalSlug: String(row?.internalSlug || ''),
        providerSlot: String(row?.providerSlot || ''),
        updatedAt: row?.updatedAt,
      }))

    const catalogProducts = await getCatalogProducts()
    const requirementDiagnostics = catalogProducts.slice(0, 200).map((product) => {
      const slug = String(product.slug || '').toLowerCase()
      const mapping = (mappings as any[]).find((m) => String(m?.internalSlug || '') === slug)
      const req = detectProviderInputRequirements({
        params: mapping?.metadata?.params ?? null,
        qtyValues: mapping?.metadata?.qty_values ?? null,
      })
      return {
        slug,
        requiresExtraInput: req.requiresExtraInput,
        requiredFields: req.requiredFields,
        quantityRule: req.quantityRule,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        windowDays: days,
        lowMarginThreshold,
        totals: {
          orders: orders.length,
          providers: Array.from(adapterKeys),
          mappingRows: mappings.length,
        },
        providerStats: byProvider,
        providerHealthSnapshot: healthSnapshot,
        lowMarginOrders: lowMarginOrders.slice(0, 100),
        staleMappings,
        statusReference: {
          go4card: {
            accept: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('go4card', 'accept')),
            wait: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('go4card', 'wait')),
            reject: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('go4card', 'reject')),
          },
          generic: {
            completed: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('dailycard', 'completed')),
            pending: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('dailycard', 'pending')),
            failed: mapNormalizedOrderStatusToLocal(mapProviderOrderStatus('dailycard', 'failed')),
          },
        },
        requirementDiagnostics,
      },
    })
  } catch (error) {
    console.error('Admin provider diagnostics GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load provider diagnostics' },
      { status: 500 }
    )
  }
}

async function postHandler(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const slug = String(body?.slug || '').trim().toLowerCase()
    const quantity = Math.max(1, Math.floor(n(body?.quantity || 1)))
    const productId = String(body?.productId || '').trim()
    const productName = String(body?.productName || '').trim() || slug
    const providerMode = String(body?.providerMode || 'primary').trim().toLowerCase()
    const packageOption = String(body?.packageOption || '').trim()

    if (!slug && !productId) {
      return NextResponse.json(
        { success: false, message: 'slug or productId is required for dry-run' },
        { status: 400 }
      )
    }

    const selection = await selectBestProviderForProduct({
      productSlug: slug || productId,
      productId: productId || slug,
      productName: productName || slug || productId,
      packageOption: packageOption || undefined,
      providerMode,
    })

    const simulated = selection.candidates.map((candidate, index) => ({
      order: index + 1,
      providerSlot: candidate.providerSlot,
      providerAdapterKey: candidate.providerAdapter.key,
      providerProductId: candidate.providerProductId,
      unitCost: candidate.unitCost,
      stockStatus: candidate.stockStatus,
      fallbackEnabled: candidate.fallbackEnabled,
      wouldBeSelected: index === 0,
      requirements: detectProviderInputRequirements({
        params: (candidate.rawQuote as any)?.params ?? null,
        qtyValues: (candidate.rawQuote as any)?.qty_values ?? null,
      }),
    }))

    return NextResponse.json({
      success: true,
      data: {
        input: { slug, productId, productName, quantity, providerMode, packageOption },
        selectionReason: selection.reason,
        preflightAttempts: selection.attempts,
        simulatedCandidates: simulated,
        recommendation: simulated[0] || null,
      },
    })
  } catch (error) {
    console.error('Admin provider diagnostics POST error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to run provider dry-run diagnostics' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return withAdminAuth(req, () => getHandler(req))
}

export async function POST(req: NextRequest) {
  return withAdminAuth(req, () => postHandler(req))
}
