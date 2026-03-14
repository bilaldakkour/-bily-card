'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart } from 'lucide-react'
import {
  MobileEmptyState,
  MobilePanel,
  MobileSectionHeading,
  mobilePrimaryButtonClass,
} from '@/components/shared/MobileDesignSystem'
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
      mobileTitle="المفضلة"
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
        <Link href="/products" className={mobilePrimaryButtonClass}>
          Browse Products
        </Link>
      }
    >
      <MobilePanel tone="soft">
        <MobileSectionHeading
          eyebrow="Saved Picks"
          title="منتجاتك المفضلة"
          description="كل المنتجات التي حفظتها صارت مجمعة هنا ضمن عرض أخف وأنسب للموبايل."
          action={
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-pink-400/18 bg-pink-500/10 text-pink-200">
              <Heart className="h-5 w-5 fill-pink-500 text-pink-400" />
            </div>
          }
        />
      </MobilePanel>

      <div className="hidden md:block">
        <MobilePanel className="p-4 sm:p-5">
          <ProductGrid
            products={favoriteProducts}
            loading={loading}
            emptyMessage={{
              title: 'No favorites yet',
              description: 'Tap the heart icon on any product to add it here.',
            }}
          />
        </MobilePanel>
      </div>

      <div className="space-y-3 md:hidden">
        {!loading && favoriteProducts.length === 0 ? (
          <MobileEmptyState
            title="لا يوجد مفضلة بعد"
            description="اضغط على أيقونة القلب في أي منتج ليظهر هنا لاحقاً."
            action={
              <Link href="/products" className={mobilePrimaryButtonClass}>
                تصفح المنتجات
              </Link>
            }
          />
        ) : null}

        {favoriteProducts.map((product) => (
          <MobilePanel
            key={`mobile-${product.id}`}
            tone="soft"
            className="flex items-center justify-between gap-3 px-3.5 py-3.5"
          >
            <div className="min-w-0 flex-1 text-right">
              <div className="mb-2 inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                متوفر
              </div>
              <p className="truncate text-lg font-semibold text-white">{product.name}</p>
              <p className="mt-1 text-sm text-slate-400">{product.platform || 'Bily Card'}</p>
              <Link
                href={`/products/${product.slug}`}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-cyan-200"
              >
                عرض المنتج
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.06]">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            </div>
          </MobilePanel>
        ))}
      </div>
    </UserPageLayout>
  )
}
