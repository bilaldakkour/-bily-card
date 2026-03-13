import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductsPageClient } from '@/components/products/ProductsPageClient'
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
      <PageHeader
        title="All Products"
        subtitle="Discover our complete collection of gaming top-ups and digital products"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' }
        ]}
      />

      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="text-slate-400">Loading...</span></div>}>
        <ProductsPageClient
          initialProducts={safeProducts}
          categories={categoryOptions}
          initialSearch={search}
          initialCategory={category}
          initialSort={sort}
        />
      </Suspense>
    </div>
  )
}
