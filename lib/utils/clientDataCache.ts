import type { Product, ProductListItem } from '@/lib/data'

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

type EffectivePricingData = {
  productMap?: Record<string, number>
  userPercent?: number
  userProductDiscountMap?: Record<string, number>
  productPercent?: number
  products?: Product[]
}

type TopSellingItem = {
  slug?: string
  sold?: number
}

type SupportContactPayload = {
  email?: string
  phoneDisplay?: string
  phoneTel?: string
  whatsappNumber?: string
  whatsappUrl?: string
}

const responseCache = new Map<string, CacheEntry<unknown>>()
const inflightRequests = new Map<string, Promise<unknown>>()

function getCachedValue<T>(key: string) {
  const cached = responseCache.get(key)
  if (!cached || cached.expiresAt <= Date.now()) {
    responseCache.delete(key)
    return null
  }

  return cached.data as T
}

async function fetchCachedResource<T>({
  key,
  ttlMs,
  force = false,
  loader,
}: {
  key: string
  ttlMs: number
  force?: boolean
  loader: () => Promise<T>
}) {
  if (force) {
    responseCache.delete(key)
    inflightRequests.delete(key)
  } else {
    const cached = getCachedValue<T>(key)
    if (cached) return cached

    const pending = inflightRequests.get(key)
    if (pending) {
      return pending as Promise<T>
    }
  }

  const request = loader()
    .then((data) => {
      responseCache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
      })
      return data
    })
    .finally(() => {
      inflightRequests.delete(key)
    })

  inflightRequests.set(key, request as Promise<unknown>)
  return request
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}))
}

export async function fetchCatalogProductsClient(force = false) {
  return fetchCachedResource<ProductListItem[]>({
    key: 'catalog-products',
    ttlMs: 15_000,
    force,
    loader: async () => {
      const response = await fetch('/api/catalog/products', {
        cache: 'no-store',
      })
      const payload = await readJson(response)

      if (!response.ok || !payload?.success || !Array.isArray(payload?.data)) {
        throw new Error('Failed to load catalog products')
      }

      return payload.data as ProductListItem[]
    },
  })
}

export async function fetchTopSellingProductsClient(force = false) {
  return fetchCachedResource<TopSellingItem[]>({
    key: 'top-selling-products',
    ttlMs: 15_000,
    force,
    loader: async () => {
      const response = await fetch('/api/products/top-selling', {
        cache: 'no-store',
      })
      const payload = await readJson(response)

      if (!response.ok || !payload?.success || !Array.isArray(payload?.data)) {
        throw new Error('Failed to load top selling products')
      }

      return payload.data as TopSellingItem[]
    },
  })
}

export async function fetchPricingEffectiveClient({
  token,
  slug,
  force = false,
}: {
  token?: string | null
  slug?: string
  force?: boolean
}) {
  const normalizedSlug = String(slug || '').trim().toLowerCase()
  const cacheKey = `pricing-effective:${token || 'guest'}:${normalizedSlug || 'all'}`
  const search = normalizedSlug ? `?slug=${encodeURIComponent(normalizedSlug)}` : ''

  return fetchCachedResource<EffectivePricingData>({
    key: cacheKey,
    ttlMs: 15_000,
    force,
    loader: async () => {
      const response = await fetch(`/api/pricing/effective${search}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
      })
      const payload = await readJson(response)

      if (!response.ok || !payload?.success) {
        throw new Error('Failed to load pricing data')
      }

      return (payload?.data || {}) as EffectivePricingData
    },
  })
}

export async function fetchSupportContactClient(force = false) {
  return fetchCachedResource<SupportContactPayload>({
    key: 'support-contact',
    ttlMs: 60_000,
    force,
    loader: async () => {
      const response = await fetch('/api/support-contact', {
        cache: 'no-store',
      })
      const payload = await readJson(response)

      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error('Failed to load support contact')
      }

      return payload.data as SupportContactPayload
    },
  })
}
