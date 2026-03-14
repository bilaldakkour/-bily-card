import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileUserShell from '@/components/shared/MobileUserShell'
import ProductDetails from '@/components/products/ProductDetails'
import { ProductGrid } from '@/components/ui/ProductGrid'
import { Button } from '@/components/ui/Button'
import {
  getCatalogDisplayBestSellingProducts,
  getCatalogDisplayProductBySlug,
} from '@/lib/data/catalogProducts'

export const dynamic = 'force-dynamic'

interface ProductPageProps {
  params: {
    slug: string
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getCatalogDisplayProductBySlug(params.slug)

  if (!product) {
    notFound()
  }

  if (product.stockStatus === 'out_of_stock') {
    notFound()
  }

  const relatedProducts = (await getCatalogDisplayBestSellingProducts())
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3)

  return (
    <div className="min-h-screen">
      <div className="md:hidden">
        <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-3 sm:px-5">
          <MobileUserShell title={product.name} />
        </div>
      </div>

      <div className="hidden md:block">
        <PageHeader
          title={product.name}
          subtitle={product.shortDescription || product.fullDescription}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: product.name, href: `/products/${product.slug}` },
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
      </div>

      <div className="relative mx-auto max-w-[1480px] px-4 pb-12 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.86),rgba(4,10,22,0.96))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-xl sm:p-6">
          <ProductDetails product={product} />

          {relatedProducts.length > 0 && (
            <div className="mt-10 rounded-[26px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Related Products</h2>
                  <p className="text-sm text-slate-400">More products you might like</p>
                </div>
              </div>

              <ProductGrid products={relatedProducts} />
            </div>
          )}

          <div className="mt-8 rounded-[26px] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h3 className="mb-4 text-xl font-bold text-white">Important Notes</h3>
            <ul className="grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
              <li>All digital products are delivered instantly after payment confirmation.</li>
              <li>Please ensure your account details are entered correctly to avoid delivery issues.</li>
              <li>For gaming top-ups, make sure your game account is active and accessible.</li>
              <li>Refunds are available within 24 hours if the product hasn&apos;t been delivered.</li>
              <li>Contact our support team if you encounter any issues with your order.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
