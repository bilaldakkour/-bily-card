'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ProductFilters } from '@/components/ui/ProductFilters'
import { ProductGrid } from '@/components/ui/ProductGrid'
import ProductDetails from '@/components/products/ProductDetails'
import type { Product, Category } from '@/lib/data'

interface ProductsPageClientProps {
  initialProducts: Product[]
  categories: Array<{ id: string; name: string }>
  initialSearch?: string
  initialCategory?: string
  initialSort?: string
}

export function ProductsPageClient({
  initialProducts,
  categories,
  initialSearch = '',
  initialCategory = '',
  initialSort = 'name'
}: ProductsPageClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState(initialSort)
  const [productPercentMap, setProductPercentMap] = useState<Record<string, number>>({})
  const [userPercent, setUserPercent] = useState(0)
  const [topSellingMap, setTopSellingMap] = useState<Record<string, number>>({})
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')

    const loadPricing = async () => {
      try {
        const res = await fetch('/api/pricing/effective', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        })

        const data = await res.json()
        if (!res.ok || !data?.success) return

        setProductPercentMap(data.data?.productMap || {})
        setUserPercent(Number(data.data?.userPercent || 0))
      } catch {
        setProductPercentMap({})
        setUserPercent(0)
      }
    }

    void loadPricing()
  }, [])

  useEffect(() => {
    const loadTopSelling = async () => {
      try {
        const res = await fetch('/api/products/top-selling', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data?.success || !Array.isArray(data?.data)) return

        const map: Record<string, number> = {}
        for (const item of data.data) {
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
    const totalPercent = Number(productPercent || 0) + Number(perUserPercent || 0)
    const next = Number(basePrice) * (1 + totalPercent / 100)
    return Number(Math.max(0, next).toFixed(6))
  }

  const pricedProducts = useMemo(
    () =>
      initialProducts.map((product) => {
        const productPercent = Number(productPercentMap[String(product.slug).toLowerCase()] || 0)
        return {
          ...product,
          price: applyPercent(product.price, productPercent, userPercent),
          startingPrice:
            typeof product.startingPrice === 'number'
              ? applyPercent(product.startingPrice, productPercent, userPercent)
              : product.startingPrice,
        }
      }),
    [initialProducts, productPercentMap, userPercent]
  )

  // Filter and sort products based on current state
  const filteredProducts = useMemo(() => {
    let results = [...pricedProducts]
    const orderMap = new Map(pricedProducts.map((product, index) => [product.id, index]))
    const getPopularityScore = (product: Product) => {
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
    router.push(`/products${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [searchQuery, selectedCategory, sortBy, router])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Handle category filter
  const handleCategoryFilter = useCallback((category: string) => {
    setSelectedCategory(category)
  }, [])

  // Handle sort
  const handleSort = useCallback((sort: string) => {
    setSortBy(sort)
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('')
    setSortBy('name')
  }, [])

  // Update URL effect
  useEffect(() => {
    updateUrl()
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

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product)
    setIsModalVisible(false)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false)
  }, [])

  return (
    <>
      <div className="mx-auto max-w-[1600px] px-1 py-2 sm:px-0">
        <ProductFilters
          onSearch={handleSearch}
          onCategoryFilter={handleCategoryFilter}
          onSort={handleSort}
          categories={categories}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          sortBy={sortBy}
        />

        <ProductGrid
          products={filteredProducts}
          onProductSelect={handleProductSelect}
          emptyMessage={{
            title: "No products found",
            description: "Try adjusting your search terms or browse different categories."
          }}
        />
      </div>

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
              aria-label="Close product popup"
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
