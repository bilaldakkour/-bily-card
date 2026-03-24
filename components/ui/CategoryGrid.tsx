import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { SectionTitle } from './SectionTitle'
import type { Category } from '@/lib/data'

interface CategoryGridProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
}

const getSafeImageSrc = (value: unknown) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw || raw === '.' || raw === 'null' || raw === 'undefined') return '/placeholder.png'
  if (raw.startsWith('/')) return raw

  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return '/placeholder.png'
    if (parsed.hostname === 'dailycard-media.s3.amazonaws.com') return raw
    return '/placeholder.png'
  } catch {
    return '/placeholder.png'
  }
}

export function CategoryGrid({ categories, title = "Shop by Category", subtitle }: CategoryGridProps) {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle title={title} subtitle={subtitle} />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 overflow-hidden transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                <Image
                  src={getSafeImageSrc(category.image)}
                  alt={category.name}
                  fill
                  unoptimized={String(getSafeImageSrc(category.image)).startsWith('http://') || String(getSafeImageSrc(category.image)).startsWith('https://')}
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Fallback overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/60 flex items-center justify-center">
                  <div className="text-4xl opacity-40">🎮</div>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {category.name}
                    </h3>
                    <p className="text-slate-300 text-sm">
                      {category.productCount} products
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Premium glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
