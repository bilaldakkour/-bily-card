'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ProductGrid } from '@/components/ui/ProductGrid'
import type { Product, ProductListItem } from '@/lib/data'
import { isManualCountProduct } from '@/lib/pricing/manualCount'
import { isProductAvailable } from '@/lib/products/stock'
import {
  fetchCatalogProductsClient,
  fetchPricingEffectiveClient,
  fetchTopSellingProductsClient,
} from '@/lib/utils/clientDataCache'

const ProductDetails = dynamic(() => import('@/components/products/ProductDetails'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[480px] rounded-[24px] border border-white/10 bg-slate-900/50" />
  ),
})

interface ProductsPageClientProps {
  initialProducts: ProductListItem[]
  initialSearch?: string
  initialCategory?: string
  initialSort?: string
}

export function ProductsPageClient({
  initialProducts,
  initialSearch = '',
  initialCategory = '',
  initialSort = 'name'
}: ProductsPageClientProps) {
  const router = useRouter()
  const [catalogProducts, setCatalogProducts] = useState<ProductListItem[]>(initialProducts)
  const [catalogLoaded, setCatalogLoaded] = useState(initialProducts.length > 0)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState(initialSort)
  const [productPercentMap, setProductPercentMap] = useState<Record<string, number>>({})
  const [manualCountPriceMap, setManualCountPriceMap] = useState<Record<string, true>>({})
  const [userPercent, setUserPercent] = useState(0)
  const [userProductDiscountMap, setUserProductDiscountMap] = useState<Record<string, number>>({})
  const [topSellingMap, setTopSellingMap] = useState<Record<string, number>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setSearchQuery(initialSearch || '')
  }, [initialSearch])

  useEffect(() => {
    setSelectedCategory(initialCategory || '')
  }, [initialCategory])

  useEffect(() => {
    setSortBy(initialSort || 'name')
  }, [initialSort])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    let active = true

    const loadCatalog = async () => {
      try {
        const data = await fetchCatalogProductsClient()
        if (!active) return
        setCatalogProducts(data)
        setCatalogLoaded(true)
      } catch {
        if (!active) return
        setCatalogLoaded(initialProducts.length > 0)
      }
    }

    void loadCatalog()

    return () => {
      active = false
    }
  }, [initialProducts.length])

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')

    const loadPricing = async () => {
      try {
        const data = await fetchPricingEffectiveClient({ token })
        setProductPercentMap(data?.productMap || {})
        setUserPercent(Number(data?.userPercent || 0))
        setUserProductDiscountMap(data?.userProductDiscountMap || {})
        setManualCountPriceMap(
          Array.isArray(data?.products)
            ? (data.products as Product[]).reduce<Record<string, true>>((acc, product) => {
                const slug = String(product.slug || '').trim().toLowerCase()
                if (slug && isManualCountProduct(product)) {
                  acc[slug] = true
                }
                return acc
              }, {})
            : {}
        )
      } catch {
        setProductPercentMap({})
        setManualCountPriceMap({})
        setUserPercent(0)
        setUserProductDiscountMap({})
      }
    }

    void loadPricing()
  }, [])

  useEffect(() => {
    const loadTopSelling = async () => {
      try {
        const map: Record<string, number> = {}
        for (const item of await fetchTopSellingProductsClient()) {
          const slug = String(item?.slug || '').toLowerCase()
          if (!slug) continue
          map[slug] = Number(item?.sold || 0)
        }
        setTopSellingMap(map)
      } catch {
        setTopSellingMap({})
      }
    }

    void loadTopSelling()
  }, [])

  const applyPercent = (basePrice: number, productPercent: number, perUserPercent: number) => {
    const totalPercent = Number(productPercent || 0) - Number(perUserPercent || 0)
    const next = Number(basePrice) * (1 + totalPercent / 100)
    return Number(Math.max(0, next).toFixed(6))
  }

  const pricedProducts = useMemo(
    () =>
      catalogProducts.map((product) => {
        const normalizedSlug = String(product.slug || '').toLowerCase()
        if (manualCountPriceMap[normalizedSlug]) {
          return {
            ...product,
            price: Number(product.price || 0),
            startingPrice:
              typeof product.startingPrice === 'number'
                ? Number(product.startingPrice || 0)
                : product.startingPrice,
          }
        }

        const productPercent = Number(productPercentMap[String(product.slug).toLowerCase()] || 0)
        const effectiveUserPercent = Number(
          userProductDiscountMap[String(product.slug || '').toLowerCase()] ?? userPercent
        )
        return {
          ...product,
          price: applyPercent(product.price, productPercent, effectiveUserPercent),
          startingPrice:
            typeof product.startingPrice === 'number'
              ? applyPercent(product.startingPrice, productPercent, effectiveUserPercent)
              : product.startingPrice,
        }
      }),
    [catalogProducts, manualCountPriceMap, productPercentMap, userPercent, userProductDiscountMap]
  )

  // Filter and sort products based on current state
  const filteredProducts = useMemo(() => {
    let results = [...pricedProducts]
    const orderMap = new Map(pricedProducts.map((product, index) => [product.id, index]))
    const getPopularityScore = (product: ProductListItem) => {
      const slugs = [product.slug, ...(Array.isArray(product.childSlugs) ? product.childSlugs : [])]
      return slugs.reduce(
        (total, slug) => total + Number(topSellingMap[String(slug).toLowerCase()] || 0),
        0
      )
    }

    // Filter by search term
    if (searchQuery) {
      results = results.filter(product =>
        [
          product.name,
          product.shortDescription,
          product.platform,
          product.slug,
          product.category,
          ...(Array.isArray(product.groupChildren) ? product.groupChildren.map((child) => child.name) : []),
        ].some((value) => String(value || '').toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Filter by category
    if (selectedCategory) {
      results = results.filter(product => product.category === selectedCategory)
    }

    // Sort products
    results.sort((a, b) => {
      const aAvailable = isProductAvailable({
        stockQuantityValue: a.stockQuantity,
        legacyStatusValue: a.stockStatus,
        saleEnabledValue: a.saleEnabled,
      })
      const bAvailable = isProductAvailable({
        stockQuantityValue: b.stockQuantity,
        legacyStatusValue: b.stockStatus,
        saleEnabledValue: b.saleEnabled,
      })

      if (aAvailable !== bAvailable) {
        return aAvailable ? -1 : 1
      }

      switch (sortBy) {
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'newest':
          return (orderMap.get(b.id) ?? 0) - (orderMap.get(a.id) ?? 0)
        case 'popular':
          return getPopularityScore(b) - getPopularityScore(a)
        default:
          return a.name.localeCompare(b.name)
      }
    })

    return results
  }, [pricedProducts, searchQuery, selectedCategory, sortBy, topSellingMap])

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedCategory) params.set('category', selectedCategory)
    if (sortBy !== 'name') params.set('sort', sortBy)

    const queryString = params.toString()
    router.replace(`/products${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [searchQuery, selectedCategory, sortBy, router])

  // Update URL effect
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateUrl()
    }, 180)

    return () => window.clearTimeout(timeout)
  }, [searchQuery, selectedCategory, sortBy, updateUrl])

  useEffect(() => {
    if (!selectedProduct) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalVisible(false)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    const raf = window.requestAnimationFrame(() => {
      setIsModalVisible(true)
    })

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
      window.cancelAnimationFrame(raf)
    }
  }, [selectedProduct])

  useEffect(() => {
    if (isModalVisible || !selectedProduct) return

    const timeout = window.setTimeout(() => {
      setSelectedProduct(null)
    }, 180)

    return () => window.clearTimeout(timeout)
  }, [isModalVisible, selectedProduct])

  const handleProductSelect = useCallback(async (product: ProductListItem) => {
    try {
      setSelectedProductSlug(product.slug)
      setSelectedProduct(null)
      setIsModalVisible(false)

      const res = await fetch(`/api/catalog/products/${encodeURIComponent(product.slug)}`, {
        cache: 'no-store',
      })
      const data = await res.json()

      if (!res.ok || !data?.success || !data?.data) {
        throw new Error(data?.message || 'Failed to load product details')
      }

      setSelectedProduct(data.data as Product)
    } catch {
      router.push(`/products/${product.slug}`)
    } finally {
      setSelectedProductSlug(null)
    }
  }, [router])

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false)
  }, [])

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-0.5 py-1 sm:px-0">
        <ProductGrid
          products={filteredProducts}
          loading={!catalogLoaded && initialProducts.length === 0}
          onProductSelect={handleProductSelect}
          emptyMessage={{
            title: 'لا توجد منتجات مطابقة',
            description: 'جرّب تعديل كلمات البحث أو اختيار تصنيف مختلف.'
          }}
        />
      </div>

      {isClient && selectedProductSlug && !selectedProduct && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.68),rgba(2,6,23,0.82))] p-3 backdrop-blur-sm">
          <div className="rounded-[20px] border border-[#3a7bff]/20 bg-[linear-gradient(180deg,rgba(8,18,34,0.96),rgba(6,13,26,0.98))] px-5 py-4 text-center shadow-[0_20px_46px_rgba(2,6,23,0.32)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
            <p className="mt-4 text-sm font-medium text-slate-200">جاري تحميل تفاصيل المنتج...</p>
          </div>
        </div>,
        document.body
      )}

      {isClient && selectedProduct && createPortal(
        <div
          className={`fixed inset-0 z-[80] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.72),rgba(2,6,23,0.88))] p-3 backdrop-blur-md transition-all duration-200 sm:p-4 ${
            isModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal()
            }
          }}
        >
          <div
            className={`relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[760px] items-center justify-center transition-all duration-300 sm:max-h-[calc(100vh-2rem)] ${
              isModalVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.97] opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-slate-950/75 p-2.5 text-slate-300 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition hover:border-cyan-400/30 hover:bg-slate-900 hover:text-white sm:right-4 sm:top-4"
              aria-label="إغلاق نافذة المنتج"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,10,20,0.99))] p-3 shadow-[0_30px_90px_rgba(2,6,23,0.45)] ring-1 ring-cyan-400/8 sm:max-h-[calc(100vh-2rem)] sm:rounded-[30px] sm:p-4">
              <ProductDetails product={selectedProduct} compact />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
