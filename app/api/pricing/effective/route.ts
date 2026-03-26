import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_COOKIE_NAME } from '@/lib/auth/cookies'
import {
  applyPricingMapToProducts,
  getEffectivePriceForProduct,
  getEffectivePricingContext,
} from '@/lib/pricing/engine'
import { getCatalogProductBySlug, getCatalogProducts } from '@/lib/data/catalogProducts'
import Product from '@/lib/models/Product'
import { normalizeProductProviderMode } from '@/lib/products/providerMode'
import { isTestModeEnabled, logTestMode } from '@/lib/utils/testMode'

export const dynamic = 'force-dynamic'

const globalPricingState = globalThis as typeof globalThis & {
  __effectivePricingSlugCache?: Map<string, { expiresAt: number; payload: any }>
  __effectivePricingSlugInFlight?: Map<string, Promise<any>>
}

const EFFECTIVE_PRICING_CACHE_TTL_MS = 5 * 60 * 1000

function normalizePackageOptionKey(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return '__default__'
  const [left] = raw.split(' - ')
  return left.trim() || '__default__'
}

function buildPricingRequestCacheKey(input: {
  slug: string
  packageOption?: string
  userId?: string | null
}) {
  return `${String(input.userId || 'guest')}|${String(input.slug || '').trim().toLowerCase()}|${normalizePackageOptionKey(input.packageOption)}`
}

function getEffectivePricingSlugCache() {
  return (globalPricingState.__effectivePricingSlugCache ||= new Map<string, { expiresAt: number; payload: any }>())
}

function getEffectivePricingSlugInFlight() {
  return (globalPricingState.__effectivePricingSlugInFlight ||= new Map<string, Promise<any>>())
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
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    if (isTestModeEnabled()) {
      const token =
        extractToken(request.headers.get('authorization')) ||
        request.cookies.get(AUTH_COOKIE_NAME)?.value ||
        null
      const user = token ? verifyToken(token) : null
      const userId = user?.userId || null
      const { searchParams } = new URL(request.url)
      const slug = searchParams.get('slug')
      const packageOption = String(searchParams.get('packageOption') || '').trim()

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
          packageOption: packageOption || undefined,
          preferCachedCost: true,
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
          userProductDiscountMap: {},
          products: catalogProducts,
        },
        testMode: true,
      })
    }

    await connectDB()

    const token =
      extractToken(request.headers.get('authorization')) ||
      request.cookies.get(AUTH_COOKIE_NAME)?.value ||
      null
    const user = token ? verifyToken(token) : null
    const userId = user?.userId || null

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const packageOption = String(searchParams.get('packageOption') || '').trim()

    if (slug) {
      const requestCacheKey = buildPricingRequestCacheKey({
        slug,
        packageOption,
        userId,
      })
      const responseCache = getEffectivePricingSlugCache()
      const now = Date.now()
      const cached = responseCache.get(requestCacheKey)
      if (cached && cached.expiresAt > now) {
        return NextResponse.json(cached.payload)
      }
      if (cached && cached.expiresAt <= now) {
        responseCache.delete(requestCacheKey)
      }

      const inFlight = getEffectivePricingSlugInFlight()
      const pending = inFlight.get(requestCacheKey)
      if (pending) {
        const payload = await pending
        return NextResponse.json(payload)
      }

      const resolver = (async () => {
        const catalogProduct = await getCatalogProductBySlug(slug)
        let fallbackPrice: number | undefined = undefined
        const catalogPrice = normalizePrice(catalogProduct?.price)
        const catalogProviderId = String(catalogProduct?.id || '')
        const productProviderMode = normalizeProductProviderMode(
          catalogProduct?.providerMode,
          catalogProduct
            ? String(catalogProduct.id || '').startsWith('manual-')
              ? 'manual'
              : 'primary'
            : isLikelyProviderBackedProduct(catalogProviderId)
              ? 'primary'
              : 'manual'
        )
        const isProviderBasedProduct = productProviderMode !== 'manual'

        if (!isProviderBasedProduct && catalogProduct) {
          if (isLikelyProviderBackedProduct(catalogProviderId)) {
            const localStoredPrice = await getLocalStoredPriceByProviderProductId(catalogProviderId)
            fallbackPrice =
              typeof localStoredPrice === 'number' && localStoredPrice > 0
                ? localStoredPrice
                : catalogPrice ?? undefined
          } else {
            fallbackPrice = catalogPrice ?? undefined
          }
        }

        const data = await getEffectivePriceForProduct({
          slug,
          userId,
          fallbackPrice,
          packageOption: packageOption || undefined,
          preferCachedCost: true,
        })

        if (!isProviderBasedProduct && (!Number.isFinite(data.basePrice) || data.basePrice <= 0)) {
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

        return { success: true, data }
      })()

      inFlight.set(requestCacheKey, resolver)
      try {
        const payload = await resolver
        responseCache.set(requestCacheKey, {
          expiresAt: Date.now() + EFFECTIVE_PRICING_CACHE_TTL_MS,
          payload,
        })
        return NextResponse.json(payload)
      } finally {
        inFlight.delete(requestCacheKey)
      }
    }

    const { productMap, userPercent, userProductDiscountMap } = await getEffectivePricingContext(userId)
    const catalogProducts = await getCatalogProducts()
    const pricedProducts = applyPricingMapToProducts(
      catalogProducts,
      productMap,
      userPercent,
      userProductDiscountMap
    )

    return NextResponse.json({
      success: true,
      data: {
        userPercent,
        productMap,
        userProductDiscountMap,
        products: pricedProducts,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to compute effective pricing' },
      { status: 500 }
    )
  }
}
