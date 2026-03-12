'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductFilters } from '@/components/ui/ProductFilters'
import { ProductGrid } from '@/components/ui/ProductGrid'
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

    // Filter by search term
    if (searchQuery) {
      results = results.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
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
          return (
            Number(topSellingMap[String(b.slug).toLowerCase()] || 0) -
            Number(topSellingMap[String(a.slug).toLowerCase()] || 0)
          )
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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
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
        emptyMessage={{
          title: "No products found",
          description: "Try adjusting your search terms or browse different categories."
        }}
      />
    </div>
  )
}