'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Search, X } from 'lucide-react'
import type { Product, ProductListItem } from '@/lib/data'
import {
  getDisplayProductsSnapshot,
  subscribeDisplayProducts,
} from '@/lib/search/displayProductsStore'

interface GlobalSearchOverlayProps {
  open: boolean
  query: string
  onQueryChange: (value: string) => void
  onClose: () => void
}

const MAX_RESULTS = 12
const ProductDetails = dynamic(() => import('@/components/products/ProductDetails'), { ssr: false })

function normalizeSearchText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .trim()
}

function pickProductImage(product: ProductListItem) {
  const raw = String(product?.image || '').trim()
  if (!raw || raw === '.' || raw === 'null' || raw === 'undefined') return '/placeholder.png'
  return raw
}

export default function GlobalSearchOverlay({
  open,
  query,
  onQueryChange,
  onClose,
}: GlobalSearchOverlayProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null)
  const [isProductModalVisible, setIsProductModalVisible] = useState(false)
  const catalogItems = useSyncExternalStore(subscribeDisplayProducts, getDisplayProductsSnapshot, () => [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (selectedProduct) {
        setIsProductModalVisible(false)
        return
      }
      onClose()
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, selectedProduct])

  useEffect(() => {
    if (!selectedProduct) return
    const raf = window.requestAnimationFrame(() => {
      setIsProductModalVisible(true)
    })
    return () => window.cancelAnimationFrame(raf)
  }, [selectedProduct])

  useEffect(() => {
    if (isProductModalVisible || !selectedProduct) return
    const timeout = window.setTimeout(() => {
      setSelectedProduct(null)
    }, 180)
    return () => window.clearTimeout(timeout)
  }, [isProductModalVisible, selectedProduct])

  const normalizedQuery = normalizeSearchText(query)

  const filteredProducts = useMemo(() => {
    const source = Array.isArray(catalogItems) ? catalogItems : []

    if (!normalizedQuery) {
      return source
        .filter((product) => Boolean(product?.featured || product?.bestSeller))
        .slice(0, MAX_RESULTS)
    }

    return source
      .filter((product) =>
        [
          product.name,
          product.shortDescription,
          product.platform,
          product.slug,
          product.category,
          product.groupSlug,
          ...(Array.isArray(product.childSlugs) ? product.childSlugs : []),
          ...(Array.isArray(product.groupChildren) ? product.groupChildren.map((item) => item?.name) : []),
        ].some((field) => normalizeSearchText(field).includes(normalizedQuery))
      )
      .slice(0, MAX_RESULTS)
  }, [catalogItems, normalizedQuery])

  const openProduct = async (slug: string) => {
    try {
      setSelectedProductSlug(slug)
      setSelectedProduct(null)
      setIsProductModalVisible(false)

      const response = await fetch(`/api/catalog/products/${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.success || !payload?.data) {
        return
      }

      setSelectedProduct(payload.data as Product)
    } finally {
      setSelectedProductSlug(null)
    }
  }

  const openProductsPage = () => {
    onClose()
    const next = query.trim()
    router.push(next ? `/products?search=${encodeURIComponent(next)}` : '/products')
  }

  const clearSearch = () => {
    if (query.trim()) {
      onQueryChange('')
      return
    }
    onClose()
  }

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-[121] mx-auto flex h-full w-full max-w-[980px] items-start justify-center px-3 pt-12 sm:px-4 sm:pt-16">
        <div className="w-full rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(6,14,30,0.98),rgba(5,10,22,0.99))] p-3 shadow-[0_30px_90px_rgba(2,6,23,0.55)] ring-1 ring-white/[0.04] sm:p-4">
          <div className="mb-3 flex items-center gap-2">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="ابحث عن المنتجات..."
                className="h-11 w-full rounded-[16px] border border-white/12 bg-white/[0.04] px-10 text-sm text-white placeholder-slate-500 focus:border-cyan-400/40 focus:outline-none"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openProductsPage()
                }}
                dir="rtl"
              />
            </label>

            <button
              type="button"
              onClick={clearSearch}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/12 bg-white/[0.04] text-slate-300 hover:text-white"
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto pr-1">
            {!normalizedQuery ? (
              filteredProducts.length > 0 ? (
                <div className="space-y-1.5">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        void openProduct(product.slug)
                      }}
                      className="flex w-full items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] p-2 text-right transition hover:border-cyan-400/24 hover:bg-white/[0.05]"
                    >
                      <img
                        src={pickProductImage(product)}
                        alt={product.name}
                        className="h-11 w-11 rounded-[10px] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {product.platform || product.category || 'Bily Card'}
                        </p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-300">
                  ابدأ بالكتابة للبحث عن المنتجات
                </div>
              )
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-300">
                لا توجد نتائج مطابقة
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      void openProduct(product.slug)
                    }}
                    className="flex w-full items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] p-2 text-right transition hover:border-cyan-400/24 hover:bg-white/[0.05]"
                  >
                    <img
                      src={pickProductImage(product)}
                      alt={product.name}
                      className="h-11 w-11 rounded-[10px] object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                      <p className="truncate text-xs text-slate-400">
                        {product.platform || product.category || 'Bily Card'}
                      </p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {query.trim() ? (
            <button
              type="button"
              onClick={openProductsPage}
              className="mt-3 w-full rounded-[14px] border border-cyan-400/20 bg-cyan-500/10 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/15"
            >
              عرض كل النتائج
            </button>
          ) : null}
        </div>
      </div>

      {selectedProductSlug && !selectedProduct ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.68),rgba(2,6,23,0.82))] p-3 backdrop-blur-sm">
          <div className="rounded-[20px] border border-[#3a7bff]/20 bg-[linear-gradient(180deg,rgba(8,18,34,0.96),rgba(6,13,26,0.98))] px-5 py-4 text-center shadow-[0_20px_46px_rgba(2,6,23,0.32)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
            <p className="mt-4 text-sm font-medium text-slate-200">جاري تحميل تفاصيل المنتج...</p>
          </div>
        </div>
      ) : null}

      {selectedProduct ? (
        <div
          className={`fixed inset-0 z-[130] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.72),rgba(2,6,23,0.88))] p-3 backdrop-blur-md transition-all duration-200 sm:p-4 ${
            isProductModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsProductModalVisible(false)
            }
          }}
        >
          <div
            className={`relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[760px] items-center justify-center transition-all duration-300 sm:max-h-[calc(100vh-2rem)] ${
              isProductModalVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.97] opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsProductModalVisible(false)}
              className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-slate-950/75 p-2.5 text-slate-300 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition hover:border-cyan-400/30 hover:bg-slate-900 hover:text-white sm:right-4 sm:top-4"
              aria-label="إغلاق نافذة المنتج"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,10,20,0.99))] p-3 shadow-[0_30px_90px_rgba(2,6,23,0.45)] ring-1 ring-cyan-400/8 sm:max-h-[calc(100vh-2rem)] sm:rounded-[30px] sm:p-4">
              <ProductDetails product={selectedProduct} compact />
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  )
}
