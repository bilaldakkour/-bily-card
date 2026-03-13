import Link from 'next/link'
import type { Product } from '@/lib/data/products'

type Section = {
  key: string
  title: string
  subtitle: string
  href: string
  products: Product[]
  tone: string
}

type HomeContentDailyInspiredProps = {
  topSelling: Product[]
  sections: Section[]
  mode?: 'full' | 'sections-only'
}

function ProductTile({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group rounded-2xl border border-white/10 bg-slate-900/70 p-3 transition hover:-translate-y-0.5 hover:border-amber-300/50"
    >
      <div className="mb-3 overflow-hidden rounded-xl bg-slate-800">
        <img
          src={product.image}
          alt={product.name}
          className="h-28 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-white">{product.name}</h3>
      <p className="mt-1 text-xs text-slate-400">{product.platform}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-amber-300">${Number(product.price || 0).toFixed(2)}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            product.stockStatus === 'out_of_stock'
              ? 'bg-red-500/20 text-red-200'
              : product.stockStatus === 'limited'
                ? 'bg-yellow-500/20 text-yellow-200'
                : 'bg-emerald-500/20 text-emerald-200'
          }`}
        >
          {product.stockStatus === 'out_of_stock'
            ? 'Out'
            : product.stockStatus === 'limited'
              ? 'Limited'
              : 'Ready'}
        </span>
      </div>
    </Link>
  )
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className={`text-xl font-black tracking-tight ${section.tone}`}>{section.title}</h2>
          <p className="text-sm text-slate-400">{section.subtitle}</p>
        </div>
        <Link
          href={section.href}
          className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
        >
          عرض الكل
        </Link>
      </div>

      {section.products.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {section.products.map((product) => (
            <ProductTile key={`${section.key}-${product.slug}`} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
          لا يوجد عناصر متاحة حالياً.
        </div>
      )}
    </section>
  )
}

export default function HomeContentDailyInspired({
  topSelling,
  sections,
  mode = 'full',
}: HomeContentDailyInspiredProps) {
  const sectionsOnly = mode === 'sections-only'

  return (
    <main
      className={`mx-auto px-4 sm:px-6 lg:px-8 ${
        sectionsOnly ? 'max-w-[1520px] pb-12 lg:pr-28' : 'max-w-7xl py-8'
      }`}
    >
      {!sectionsOnly ? (
        <>
          <section className="mb-8 overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Bily Card</p>
            <h1 className="text-3xl font-black text-white md:text-4xl">محتوى متجدد بأسعار يومية</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              نفس بيانات المزود بشكل مباشر مع واجهة خاصة بموقعك: أقسام واضحة، ترتيب ثابت، وتسعير متزامن تلقائياً.
            </p>
          </section>

          <section className="mb-8 rounded-3xl border border-white/10 bg-slate-950/70 p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">الأكثر مبيعاً</h2>
                <p className="text-sm text-slate-400">المنتجات الأعلى طلباً حالياً</p>
              </div>
              <Link
                href="/products?sort=popular"
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
              >
                ترتيب الأكثر طلباً
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {topSelling.map((product) => (
                <ProductTile key={`top-${product.slug}`} product={product} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white md:text-2xl">التصنيفات السريعة</h2>
            <Link
              href="/products"
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
            >
              عرض كل المنتجات
            </Link>
          </div>
        </section>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <SectionBlock key={section.key} section={section} />
        ))}
      </div>
    </main>
  )
}
