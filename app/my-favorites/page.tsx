'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { useFavorites } from '@/hooks/useFavorites'
import type { Product } from '@/lib/data'

type PricingResponse = {
  success?: boolean
  data?: {
    products?: Product[]
  }
}

export default function MyFavoritesPage() {
  const { favorites } = useFavorites()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const token = localStorage.getItem('bilycard_token')
        const response = await fetch('/api/pricing/effective', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
        })

        const payload = (await response.json()) as PricingResponse

        if (!response.ok || !payload?.success || !Array.isArray(payload?.data?.products)) {
          setProducts([])
          return
        }

        setProducts(payload.data.products)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [])

  const favoriteProducts = useMemo(() => {
    const set = new Set(favorites)
    return products.filter((product) => set.has(String(product.slug || '').toLowerCase()))
  }, [products, favorites])

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
              <Heart className="h-7 w-7 fill-pink-500 text-pink-400" />
              My Favorites
            </h1>
            <p className="mt-2 text-slate-400">
              Your saved products in one place.
            </p>
          </div>

          <Link
            href="/products"
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Browse Products
          </Link>
        </div>

        <ProductGrid
          products={favoriteProducts}
          loading={loading}
          emptyMessage={{
            title: 'No favorites yet',
            description: 'Tap the heart icon on any product to add it here.',
          }}
        />
      </div>
    </main>
  )
}
