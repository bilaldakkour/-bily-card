import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/ui/ProductGrid'
import MobileUserShell from '@/components/shared/MobileUserShell'
import { MobilePageBackdrop, MobilePanel, MobileSectionHeading } from '@/components/shared/MobileDesignSystem'
import UserSidebar from '@/components/shared/UserSidebar'
import { getCategoryBySlug } from '@/lib/data'
import { getCatalogDisplayProducts } from '@/lib/data/catalogProducts'
import { normalizeCategory } from '@/lib/data/catalogNormalization'

interface CategoryPageProps {
  params: {
    category: string
  }
  searchParams: {
    search?: string
    sort?: string
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: categorySlug } = params
  const { search = '', sort = 'name' } = searchParams

  const category = getCategoryBySlug(categorySlug)
  if (!category) {
    notFound()
  }

  const products = await getCatalogDisplayProducts()

  let filteredProducts = products.filter(
    (product) => product.category === categorySlug || normalizeCategory(product) === categorySlug
  )

  if (search) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.shortDescription.toLowerCase().includes(search.toLowerCase())
    )
  }

  filteredProducts.sort((a, b) => {
    switch (sort) {
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      case 'newest':
        return new Date(b.id).getTime() - new Date(a.id).getTime()
      case 'popular':
        return (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  return (
    <div className="relative min-h-screen">
      <div className="md:hidden">
        <MobilePageBackdrop />
      </div>

      <div className="md:hidden">
        <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-3 sm:px-5">
          <MobileUserShell title={category.name} />
        </div>
      </div>

      <div className="hidden md:block">
        <PageHeader
          title={category.name}
          subtitle={category.description}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: category.name, href: `/categories/${category.slug}` },
          ]}
        />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />
        <div className="relative lg:pr-[372px]">
          <MobilePanel className="p-3 sm:p-6">
            <div className="mb-4 md:hidden">
              <MobileSectionHeading
                eyebrow="Category"
                title={category.name}
                description={category.description}
              />
            </div>

            <ProductGrid
              products={filteredProducts}
              emptyMessage={{
                title: 'No products found',
                description: `No products available in the ${category.name} category yet.`,
              }}
            />
          </MobilePanel>

          <aside className="lg:contents">
            <div className="hidden lg:block lg:fixed lg:right-[max(1.5rem,calc((100vw-1480px)/2+1.5rem))] lg:top-[88px] lg:h-[calc(100vh-108px)] lg:w-[352px]">
              <UserSidebar desktopSticky={false} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
