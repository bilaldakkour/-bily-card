import { Suspense } from 'react'
import { ProductsPageClient } from '@/components/products/ProductsPageClient'
import { MobilePageBackdrop } from '@/components/shared/MobileDesignSystem'
import UserSidebar from '@/components/shared/UserSidebar'
import MobileUserShell from '@/components/shared/MobileUserShell'
import { getSearchDisplayProducts } from '@/lib/search/getSearchDisplayProducts'

export const revalidate = 120

interface ProductsPageProps {
  searchParams?: {
    search?: string;
    category?: string;
    sort?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search = '', category = '', sort = 'name' } = searchParams ?? {}
  const safeProducts = await getSearchDisplayProducts()

  const shouldDeferFullCatalog = !search && !category && sort === 'name'
  const initialVisibleProducts = shouldDeferFullCatalog ? safeProducts.slice(0, 48) : []

  return (
    <div className="relative min-h-screen">
      <div className="md:hidden">
        <MobilePageBackdrop />
      </div>

      <div className="md:hidden">
        <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-3 sm:px-5">
          <MobileUserShell title="المنتجات" />
        </div>
      </div>

      <div className="relative mx-auto max-w-[1480px] px-3 pb-8 pt-1.5 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-36 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(46,91,255,0.2),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />
        <div className="relative lg:pr-[372px]">
          <div className="theme-premium-panel min-w-0 overflow-hidden rounded-[22px] border p-2 shadow-[0_22px_56px_rgba(2,6,23,0.3)] ring-1 ring-white/[0.03] backdrop-blur-xl sm:rounded-[24px] sm:p-3">
            <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><span className="text-slate-400">جاري التحميل...</span></div>}>
              <ProductsPageClient
                initialProducts={initialVisibleProducts}
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

