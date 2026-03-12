import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import ProductDetails from '@/components/products/ProductDetails'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { Button } from '@/components/ui/Button'
import { getCatalogBestSellingProducts, getCatalogProductBySlug } from '@/lib/data/catalogProducts'

export const dynamic = 'force-dynamic'

interface ProductPageProps {
  params: {
    slug: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getCatalogProductBySlug(params.slug)

  if (!product) {
    notFound()
  }

  if (product.stockStatus === 'out_of_stock') {
    notFound()
  }

  const relatedProducts = (await getCatalogBestSellingProducts())
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3)

  return (
    <div className="min-h-screen">
      <PageHeader
        title={product.name}
        subtitle={product.shortDescription || product.fullDescription}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Products', href: '/products' },
          { label: product.name, href: `/products/${product.slug}` }
        ]}
        action={
          <Link href="/products">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        }
      />

      <div className="mx-auto max-w-7xl px-6 py-12">
        <ProductDetails product={product} />

        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-16">
            <div className="mb-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-white">Related Products</h2>
              <p className="text-slate-400">More products you might like</p>
            </div>

            <ProductGrid products={relatedProducts} />
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-white/10 bg-slate-900/50 p-8">
          <h3 className="mb-4 text-xl font-bold text-white">Important Notes</h3>
          <div className="space-y-3 text-slate-400">
            <p>• All digital products are delivered instantly after payment confirmation.</p>
            <p>• Please ensure your account details are entered correctly to avoid delivery issues.</p>
            <p>• For gaming top-ups, make sure your game account is active and accessible.</p>
            <p>• Refunds are available within 24 hours if the product hasn't been delivered.</p>
            <p>• Contact our support team if you encounter any issues with your order.</p>
          </div>
        </div>
      </div>
    </div>
  )
}