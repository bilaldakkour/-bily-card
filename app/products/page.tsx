import { Suspense } from 'react'
import { ProductsPageClient } from '@/components/products/ProductsPageClient'
import UserSidebar from '@/components/shared/UserSidebar'
import { getCatalogDisplayProducts } from '@/lib/data/catalogProducts'
import { getCategoryLabel, normalizeCategory } from '@/lib/data/catalogNormalization'

const CATEGORY_ORDER = [
  'cards',
  'applications',
  'games',
  'wallets',
  'balance',
  'social-media',
  'entertainment',
  'accounts-subscriptions',
  'redemption-coupons',
]

interface ProductsPageProps {
  searchParams?: {
    search?: string;
    category?: string;
    sort?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search = '', category = '', sort = 'name' } = searchParams ?? {}
  const catalogProducts = await getCatalogDisplayProducts()

  const safeProducts = Array.isArray(catalogProducts)
    ? catalogProducts.map((product) => ({
        ...product,
        category: normalizeCategory(product),
      }))
    : []

  const categorySet = new Set(safeProducts.map((product) => product.category).filter(Boolean))
  const safeCategories = Array.from(categorySet).map((categoryName) => ({
    id: categoryName,
    name: getCategoryLabel(categoryName),
  })).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.id)
    const bi = CATEGORY_ORDER.indexOf(b.id)
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  const categoryOptions = safeCategories.map(cat => ({
    id: cat.id,
    name: cat.name
  }))

  return (
    <div className="min-h-screen">
      <div className="relative mx-auto max-w-[1480px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />
        <div className="relative lg:pr-[372px]">
          <div className="min-w-0 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.86),rgba(4,10,22,0.96))] p-3 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:rounded-[30px] sm:p-6">
            <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><span className="text-slate-400">Loading...</span></div>}>
              <ProductsPageClient
                initialProducts={safeProducts}
                categories={categoryOptions}
                initialSearch={search}
                initialCategory={category}
                initialSort={sort}
              />
            </Suspense>
          </div>

          <aside className="lg:contents">
            <div className="hidden lg:block lg:fixed lg:top-[88px] lg:h-[calc(100vh-108px)] lg:w-[352px] lg:right-[max(1.5rem,calc((100vw-1480px)/2+1.5rem))]">
              <UserSidebar desktopSticky={false} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
