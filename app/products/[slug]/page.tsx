import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import MobileUserShell from '@/components/shared/MobileUserShell'
import { MobilePageBackdrop, MobilePanel, MobileSectionHeading } from '@/components/shared/MobileDesignSystem'
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
    <div className="relative min-h-screen">
      <div className="md:hidden">
        <MobilePageBackdrop />
      </div>

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

      <div className="relative mx-auto max-w-[1480px] px-3 pb-12 pt-3 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-40 rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />

        <MobilePanel className="p-3 sm:p-6">
          <div className="mb-5 md:hidden">
            <MobileSectionHeading
              eyebrow={product.platform || 'Digital Product'}
              title={product.name}
              description={product.shortDescription || product.fullDescription}
            />
          </div>

          <ProductDetails product={product} />

          {relatedProducts.length > 0 && (
            <MobilePanel className="mt-8 p-4 sm:p-5" tone="soft">
              <MobileSectionHeading
                eyebrow="More"
                title="Related Products"
                description="Products from the same category, shown in the same mobile-friendly layout."
              />

              <div className="mt-5">
                <ProductGrid products={relatedProducts} />
              </div>
            </MobilePanel>
          )}

          <MobilePanel className="mt-8 p-4 sm:p-5" tone="soft">
            <MobileSectionHeading
              eyebrow="Notes"
              title="Important Notes"
              description="Quick reminders to keep the buying flow clear and smooth on every screen."
            />
            <ul className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-2">
              <li>All digital products are delivered instantly after payment confirmation.</li>
              <li>Please ensure your account details are entered correctly to avoid delivery issues.</li>
              <li>For gaming top-ups, make sure your game account is active and accessible.</li>
              <li>Refunds are available within 24 hours if the product has not been delivered.</li>
              <li>Contact our support team if you encounter any issues with your order.</li>
            </ul>
          </MobilePanel>
        </MobilePanel>
      </div>
    </div>
  )
}
