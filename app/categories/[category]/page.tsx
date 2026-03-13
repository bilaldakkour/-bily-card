import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { categories, getCategoryBySlug } from '@/lib/data'
import { getCatalogDisplayProducts } from '@/lib/data/catalogProducts'
import { normalizeCategory } from '@/lib/data/catalogNormalization'

interface CategoryPageProps {
  params: {
    category: string
  }
  searchParams: {
    search?: string;
    sort?: string;
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category: categorySlug } = params
  const { search = '', sort = 'name' } = searchParams

  // Find the category
  const category = getCategoryBySlug(categorySlug)
  if (!category) {
    notFound()
  }

  // Filter products by category
  const products = await getCatalogDisplayProducts()

  let filteredProducts = products.filter(
    (product) => product.category === categorySlug || normalizeCategory(product) === categorySlug
  )

  if (search) {
    filteredProducts = filteredProducts.filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.shortDescription.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Sort products
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
    <div className="min-h-screen">
      <PageHeader
        title={category.name}
        subtitle={category.description}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: category.name, href: `/categories/${category.slug}` }
        ]}
      />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <ProductGrid
          products={filteredProducts}
          emptyMessage={{
            title: "No products found",
            description: `No products available in the ${category.name} category yet.`
          }}
        />
      </div>
    </div>
  )
}
