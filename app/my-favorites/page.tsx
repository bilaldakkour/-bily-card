'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createPortal } from 'react-dom'
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
import { isProductAvailable } from '@/lib/products/stock'
import { fetchPricingEffectiveClient } from '@/lib/utils/clientDataCache'

const ProductDetails = dynamic(() => import('@/components/products/ProductDetails'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[480px] rounded-[24px] border border-white/10 bg-slate-900/50" />
  ),
})

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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const token = localStorage.getItem('bilycard_token')
        const payload = (await fetchPricingEffectiveClient({
          token,
        })) as PricingResponse['data']

        if (!Array.isArray(payload?.products)) {
          setProducts([])
          return
        }

        setProducts(payload.products)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    void loadProducts()
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!selectedProduct) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalVisible(false)
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    const raf = window.requestAnimationFrame(() => setIsModalVisible(true))

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

  const handleProductSelect = async (product: Product) => {
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
      window.location.href = `/products/${product.slug}`
    } finally {
      setSelectedProductSlug(null)
    }
  }

  const handleCloseModal = () => {
    setIsModalVisible(false)
  }

  const favoriteProducts = useMemo(() => {
    const set = new Set(favorites)
    return products
      .filter((product) => set.has(String(product.slug || '').toLowerCase()))
      .sort((a, b) => {
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
        if (aAvailable === bAvailable) return 0
        return aAvailable ? -1 : 1
      })
  }, [products, favorites])

  const pageCopy = {
    title: 'المفضلة',
    subtitle: 'منتجاتك المحفوظة في مكان واحد.',
    breadcrumbHome: 'الرئيسية',
    browseProducts: 'تصفح المنتجات',
    eyebrow: 'اختيارات محفوظة',
    headingTitle: 'منتجاتك المفضلة',
    headingDescription: 'كل المنتجات التي حفظتها مجمعة هنا ضمن عرض مرتب وواضح.',
    emptyTitle: 'لا توجد مفضلة بعد',
    emptyDescription: 'اضغط على أيقونة القلب في أي منتج ليظهر هنا.',
    available: 'متوفر',
    viewProduct: 'عرض المنتج',
    emptyGridTitle: 'لا توجد مفضلة بعد',
    emptyGridDescription: 'اضغط على أيقونة القلب في أي منتج ليظهر هنا.',
  }

  return (
    <UserPageLayout
      title={pageCopy.title}
      mobileTitle={pageCopy.title}
      subtitle={pageCopy.subtitle}
      breadcrumbs={[
        { label: pageCopy.breadcrumbHome, href: '/' },
        { label: pageCopy.title, href: '/my-favorites' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
      action={
        <Link href="/products" className={mobilePrimaryButtonClass}>
          {pageCopy.browseProducts}
        </Link>
      }
    >
      <MobilePanel tone="soft" className="p-2.5 sm:p-3.5">
        <MobileSectionHeading
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.headingTitle}
          description={pageCopy.headingDescription}
          action={
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-pink-400/18 bg-pink-500/10 text-pink-200">
              <Heart className="h-4 w-4 fill-pink-500 text-pink-400" />
            </div>
          }
        />
      </MobilePanel>

      <div className="hidden md:block">
        <MobilePanel className="p-2.5 sm:p-3.5">
          <ProductGrid
            products={favoriteProducts}
            loading={loading}
            onProductSelect={(product) => void handleProductSelect(product as Product)}
            emptyMessage={{
              title: pageCopy.emptyGridTitle,
              description: pageCopy.emptyGridDescription,
            }}
          />
        </MobilePanel>
      </div>

      <div className="space-y-2 md:hidden">
        {!loading && favoriteProducts.length === 0 ? (
          <MobileEmptyState
            title={pageCopy.emptyTitle}
            description={pageCopy.emptyDescription}
            action={
              <Link href="/products" className={mobilePrimaryButtonClass}>
                {pageCopy.browseProducts}
              </Link>
            }
          />
        ) : null}

        {favoriteProducts.map((product) => (
          <MobilePanel
            key={`mobile-${product.id}`}
            tone="soft"
            className="flex items-center justify-between gap-2 px-2.5 py-2.5"
          >
            <div className="min-w-0 flex-1 text-right">
              <div className="mb-1.5 inline-flex rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                {pageCopy.available}
              </div>
              <p className="truncate text-sm font-semibold text-white">{product.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">{product.platform || 'Bily Card'}</p>
              <button
                type="button"
                onClick={() => void handleProductSelect(product)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-200"
              >
                {pageCopy.viewProduct}
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.06]">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            </div>
          </MobilePanel>
        ))}
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
            if (event.target === event.currentTarget) handleCloseModal()
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
              ×
            </button>

            <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,10,20,0.99))] p-3 shadow-[0_30px_90px_rgba(2,6,23,0.45)] ring-1 ring-cyan-400/8 sm:max-h-[calc(100vh-2rem)] sm:rounded-[30px] sm:p-4">
              <ProductDetails product={selectedProduct} compact />
            </div>
          </div>
        </div>,
        document.body
      )}
    </UserPageLayout>
  )
}
