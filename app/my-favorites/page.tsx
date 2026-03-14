'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import UserPageLayout from '@/components/shared/UserPageLayout'
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
    <UserPageLayout
      title="My Favorites"
      subtitle="Your saved products in one place."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'My Favorites', href: '/my-favorites' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
      action={
        <Link
          href="/products"
          className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Browse Products
        </Link>
      }
    >
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-400/20 bg-pink-500/10">
            <Heart className="h-5 w-5 fill-pink-500 text-pink-400" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-pink-300">
              Saved Items
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Quick access to products you want to revisit later.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:p-5">
        <ProductGrid
          products={favoriteProducts}
          loading={loading}
          emptyMessage={{
            title: 'No favorites yet',
            description: 'Tap the heart icon on any product to add it here.',
          }}
        />
      </div>
    </UserPageLayout>
  )
}
