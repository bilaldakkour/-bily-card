import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { connectDB } from '@/lib/db/mongodb'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import {
  applyPricingMapToProducts,
  getEffectivePriceForProduct,
  getEffectivePricingContext,
} from '@/lib/pricing/engine'
import { getCatalogProductBySlug, getCatalogProducts } from '@/lib/data/catalogProducts'
import Product from '@/lib/models/Product'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

export const dynamic = 'force-dynamic'

const PROVIDER_BASE =
  process.env.DAILYCARD_API_BASE ||
  process.env.PROVIDER_API_URL ||
  'https://dailycard.shop/UAPI/api-keys'

const PROVIDER_KEY = process.env.DAILYCARD_API_KEY || process.env.PROVIDER_API_KEY || ''
const PROVIDER_SECRET = process.env.DAILYCARD_API_SECRET || process.env.PROVIDER_API_SECRET || ''

const globalPricingState = globalThis as typeof globalThis & {
  __effectivePricingWarnedKeys?: Set<string>
}

function warnOnce(key: string, message: string, details?: unknown) {
  const warned = (globalPricingState.__effectivePricingWarnedKeys ||= new Set<string>())
  if (warned.has(key)) return
  warned.add(key)

  if (typeof details !== 'undefined') {
    console.warn(message, details)
    return
  }

  console.warn(message)
}

function providerEnabled() {
  return Boolean(PROVIDER_KEY && PROVIDER_SECRET)
}

function providerHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': PROVIDER_KEY,
    'X-API-Secret': PROVIDER_SECRET,
  }
}

function normalizeId(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function isLikelyProviderBackedProduct(productId: string) {
  const normalized = String(productId || '').trim().toLowerCase()
  if (!normalized) return false
  if (/^\d+$/.test(normalized)) return true
  return normalized.startsWith('pkg-')
}

function normalizePrice(value: unknown): number | null {
  const price = Number(value)
  if (Number.isFinite(price) && price > 0) return price
  return null
}

function extractProviderRows(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.products)) return payload.products
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function extractProviderProductId(row: any): string {
  const candidates = [
    row?.id,
    row?.product_id,
    row?.provider_product_id,
    row?.productId,
    row?.sku,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeId(candidate)
    if (normalized) return normalized
  }

  return ''
}

function extractProviderPrice(row: any): number | null {
  const candidates = [
    row?.price,
    row?.selling_price,
    row?.final_price,
    row?.amount,
    row?.cost,
    row?.unit_price,
  ]

  for (const candidate of candidates) {
    const value = Number(candidate)
    if (Number.isFinite(value) && value > 0) {
      return value
    }
  }

  return null
}

async function fetchProviderProducts(params: Record<string, string | number>) {
  const response = await axios.get(`${PROVIDER_BASE}/products/`, {
    headers: providerHeaders(),
    params,
    timeout: 15000,
  })

  return extractProviderRows(response.data)
}

function findPriceByProviderProductId(rows: any[], providerProductId: string): number | null {
  const normalizedTargetId = normalizeId(providerProductId)
  if (!normalizedTargetId || !rows.length) return null

  const exact = rows.find((row) => extractProviderProductId(row) === normalizedTargetId)
  if (exact) return extractProviderPrice(exact)

  const compactTarget = normalizedTargetId.replace(/^pkg-/, '')
  const secondary = rows.find((row) => {
    const rowId = extractProviderProductId(row)
    const compactRowId = rowId.replace(/^pkg-/, '')
    return rowId === compactTarget || compactRowId === compactTarget
  })

  if (secondary) return extractProviderPrice(secondary)

  return null
}

async function getLiveProviderPriceByProductId(providerProductId: string): Promise<number | null> {
  if (!providerEnabled()) return null

  const cleanProductId = normalizeId(providerProductId)
  if (!cleanProductId) return null

  try {
    try {
      const rows = await fetchProviderProducts({
        page: 1,
        page_size: 100,
        search: cleanProductId,
      })

      const matchedPrice = findPriceByProviderProductId(rows, cleanProductId)
      if (matchedPrice !== null) return matchedPrice
    } catch (error: any) {
      const status = error?.response?.status

      if (status && status !== 500) {
        console.warn('Provider search lookup failed:', status)
      } else {
        warnOnce(
          'provider-search-500-fallback',
          'Provider search lookup returned 500, falling back to local filtering.'
        )
      }
    }

    try {
      const rows = await fetchProviderProducts({
        page: 1,
        page_size: 100,
      })

      const matchedPrice = findPriceByProviderProductId(rows, cleanProductId)
      if (matchedPrice !== null) return matchedPrice
    } catch (error: any) {
      warnOnce(
        'provider-full-list-failed',
        'Provider full list lookup failed:',
        error?.response?.status || error?.message || error
      )
    }
  } catch (error) {
    console.error('Live provider pricing lookup failed:', error)
  }

  return null
}

async function getLocalStoredPriceByProviderProductId(
  providerProductId: string
): Promise<number | null> {
  const normalizedTarget = normalizeId(providerProductId)
  if (!normalizedTarget) return null

  const compactTarget = normalizedTarget.replace(/^pkg-/, '')
  const candidateIds = Array.from(
    new Set(
      [
        normalizedTarget,
        compactTarget,
        `pkg-${compactTarget}`,
        providerProductId,
        providerProductId.replace(/^pkg-/i, ''),
      ].filter(Boolean)
    )
  )

  try {
    const localProductDoc = await Product.findOne({
      providerProductId: { $in: candidateIds },
    })
      .select('sellingPrice costPrice')
      .lean()

    const localProduct = Array.isArray(localProductDoc)
      ? (localProductDoc[0] as { sellingPrice?: number; costPrice?: number } | undefined)
      : (localProductDoc as { sellingPrice?: number; costPrice?: number } | null)

    if (!localProduct) return null

    const sellingPrice = normalizePrice(localProduct.sellingPrice)
    if (sellingPrice !== null) return sellingPrice

    return normalizePrice(localProduct.costPrice)
  } catch (error: any) {
    console.warn(
      'Local price fallback lookup failed:',
      error?.response?.status || error?.code || error?.message || error
    )
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    if (isTestModeEnabled()) {
      const token = extractToken(request.headers.get('authorization'))
      const user = token ? verifyToken(token) : null
      const userId = user?.userId || null
      const { searchParams } = new URL(request.url)
      const slug = searchParams.get('slug')

      if (slug) {
        const catalogProduct = await getCatalogProductBySlug(slug)
        const fallbackPrice = normalizePrice(catalogProduct?.price) ?? 0

        logTestMode('pricing/effective slug', {
          userId,
          slug,
          fallbackPrice,
        })

        const data = await getEffectivePriceForProduct({
          slug,
          userId,
          fallbackPrice,
        })

        return NextResponse.json({
          success: true,
          data: {
            ...data,
            productPercent: Number(data.productPercent || 0),
            userPercent: Number(data.userPercent || 0),
          },
          testMode: true,
        })
      }

      const catalogProducts = await getCatalogProducts()
      logTestMode('pricing/effective catalog', {
        userId,
        products: catalogProducts.length,
      })

      return NextResponse.json({
        success: true,
        data: {
          userPercent: 0,
          productMap: {},
          products: catalogProducts,
        },
        testMode: true,
      })
    }

    await connectDB()

    const token = extractToken(request.headers.get('authorization'))
    const user = token ? verifyToken(token) : null
    const userId = user?.userId || null

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (slug) {
      const catalogProduct = await getCatalogProductBySlug(slug)
      let fallbackPrice: number | undefined = undefined
      const catalogPrice = normalizePrice(catalogProduct?.price)
      const catalogProviderId = String(catalogProduct?.id || '')

      if (catalogProduct && isLikelyProviderBackedProduct(catalogProviderId)) {
        const livePrice = await getLiveProviderPriceByProductId(catalogProviderId)

        if (typeof livePrice === 'number' && Number.isFinite(livePrice) && livePrice > 0) {
          fallbackPrice = livePrice
        } else {
          const localStoredPrice = await getLocalStoredPriceByProviderProductId(catalogProviderId)
          fallbackPrice =
            (typeof localStoredPrice === 'number' && localStoredPrice > 0
              ? localStoredPrice
              : catalogPrice ?? undefined)
        }
      } else if (catalogProduct) {
        fallbackPrice = catalogPrice ?? undefined
      }

      const data = await getEffectivePriceForProduct({
        slug,
        userId,
        fallbackPrice,
      })

      if (!Number.isFinite(data.basePrice) || data.basePrice <= 0) {
        const safeFallback =
          catalogPrice ??
          (catalogProviderId
            ? await getLocalStoredPriceByProviderProductId(catalogProviderId)
            : null)

        if (typeof safeFallback === 'number' && safeFallback > 0) {
          data.basePrice = safeFallback
          data.effectivePrice = safeFallback
        }
      }

      return NextResponse.json({ success: true, data })
    }

    const { productMap, userPercent } = await getEffectivePricingContext(userId)
    const catalogProducts = await getCatalogProducts()
    const pricedProducts = applyPricingMapToProducts(catalogProducts, productMap, userPercent)

    return NextResponse.json({
      success: true,
      data: {
        userPercent,
        productMap,
        products: pricedProducts,
      },
    })
  } catch (error) {
    console.error('Pricing effective error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to compute effective pricing' },
      { status: 500 }
    )
  }
}
