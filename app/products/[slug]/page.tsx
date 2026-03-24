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

  const relatedProducts = (await getCatalogDisplayBestSellingProducts())
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 3)

  return (
    <div className="relative min-h-screen">
      <div className="md:hidden">
        <MobilePageBackdrop />
      </div>

      <div className="md:hidden">
        <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-2 sm:px-5">
          <MobileUserShell title={product.name} />
        </div>
      </div>

      <div className="hidden md:block">
        <PageHeader
          title={product.name}
          subtitle={product.shortDescription || product.fullDescription}
          breadcrumbs={[
            { label: 'الرئيسية', href: '/' },
            { label: 'المنتجات', href: '/products' },
            { label: product.name, href: `/products/${product.slug}` },
          ]}
          action={
            <Link href="/products">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                العودة للمنتجات
              </Button>
            </Link>
          }
        />
      </div>

      <div className="relative mx-auto max-w-[1480px] px-3 pb-9 pt-2 sm:px-5 lg:px-6">
        <div className="absolute inset-x-4 top-0 -z-10 h-36 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(46,91,255,0.18),transparent_70%)] blur-3xl sm:inset-x-5 lg:inset-x-6" />

        <MobilePanel className="p-2.5 sm:p-4">
          <div className="mb-3 md:hidden">
            <MobileSectionHeading
              eyebrow={product.platform || 'منتج رقمي'}
              title={product.name}
              description={product.shortDescription || product.fullDescription}
            />
          </div>

          <ProductDetails product={product} />

          {relatedProducts.length > 0 && (
            <MobilePanel className="mt-4 p-3 sm:p-3.5" tone="soft">
              <MobileSectionHeading
                eyebrow="منتجات إضافية"
                title="منتجات مشابهة"
                description="منتجات من نفس التصنيف ضمن نفس عرض الهاتف."
              />

              <div className="mt-3">
                <ProductGrid products={relatedProducts} />
              </div>
            </MobilePanel>
          )}

          <MobilePanel className="mt-4 p-3 sm:p-3.5" tone="soft">
            <MobileSectionHeading
              eyebrow="ملاحظات"
              title="ملاحظات مهمة"
              description="معلومات مختصرة لتجربة شراء أوضح وأسهل."
            />
            <ul className="mt-3 grid gap-2 text-xs leading-6 text-slate-400 sm:grid-cols-2 sm:text-sm">
              <li>يتم تسليم المنتجات الرقمية فور تأكيد الطلب وفق حالة المنتج.</li>
              <li>تأكد من إدخال بيانات الحساب بشكل صحيح لتجنب أي تأخير.</li>
              <li>في شحن الألعاب، تأكد أن الحساب نشط وقابل للاستقبال.</li>
              <li>سياسة الاسترجاع تخضع لشروط المتجر وحالة الطلب.</li>
              <li>يمكنك التواصل مع الدعم عند مواجهة أي مشكلة في الطلب.</li>
            </ul>
          </MobilePanel>
        </MobilePanel>
      </div>
    </div>
  )
}
