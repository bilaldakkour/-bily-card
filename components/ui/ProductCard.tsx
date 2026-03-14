import Image from 'next/image'
import Link from 'next/link'
import { Lock, Zap } from 'lucide-react'
import { Badge } from './Badge'
import FavoriteButton from './FavoriteButton'
import type { Product } from '@/lib/data'

interface ProductCardProps {
  product: Product;
  className?: string;
  onProductSelect?: (product: Product) => void;
}

export function ProductCard({ product, className = '', onProductSelect }: ProductCardProps) {
  const isOutOfStock = product.stockStatus === 'out_of_stock'

  const accentByCategory: Record<string, string> = {
    pubg: 'text-amber-300 bg-amber-500/15 border-amber-400/30',
    freefire: 'text-orange-300 bg-orange-500/15 border-orange-400/30',
    steam: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/30',
    tiktok: 'text-pink-300 bg-pink-500/15 border-pink-400/30',
    playstation: 'text-blue-300 bg-blue-500/15 border-blue-400/30',
    'google-play': 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30',
  }

  const stockLabelByStatus: Record<Product['stockStatus'], string> = {
    in_stock: 'In Stock',
    limited: 'Limited',
    out_of_stock: 'Out of Stock',
  }

  const stockColorByStatus: Record<Product['stockStatus'], string> = {
    in_stock: 'text-emerald-200 bg-emerald-500/20 border-emerald-400/30',
    limited: 'text-amber-200 bg-amber-500/20 border-amber-400/30',
    out_of_stock: 'text-red-200 bg-red-500/20 border-red-400/30',
  }

  const accentClass =
    accentByCategory[product.category] || 'text-blue-200 bg-blue-500/15 border-blue-400/30'
  const deliveryBadge =
    String(product.deliveryTime || '').toLowerCase().includes('instant') ||
    String(product.deliveryTime || '').toLowerCase().includes('auto')
      ? 'Instant'
      : product.deliveryTime

  const cardClassName = `group relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,34,0.98),rgba(7,13,25,0.98))] shadow-[0_22px_60px_rgba(2,6,23,0.2)] backdrop-blur-xl transition-all duration-500 ${
    isOutOfStock
      ? 'cursor-not-allowed opacity-80'
      : 'hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_26px_70px_rgba(56,189,248,0.12)]'
  } ${className}`

  return (
    <article className={cardClassName}>
      {!isOutOfStock && (
        onProductSelect ? (
          <button
            type="button"
            onClick={() => onProductSelect(product)}
            className="absolute inset-0 z-10 rounded-[26px]"
            aria-label={`Open ${product.name}`}
          />
        ) : (
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-10 rounded-[26px]"
            aria-label={`Open ${product.name}`}
          />
        )
      )}

      {(product.featured || product.bestSeller) && (
        <div className="absolute left-4 top-4 z-20 flex gap-2">
          {product.bestSeller && (
            <Badge
              variant="primary"
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold shadow-lg"
            >
              <Zap className="h-3 w-3" />
              Best Seller
            </Badge>
          )}
          {product.featured && (
            <Badge variant="secondary" className="px-2.5 py-1 text-[10px] font-bold shadow-lg">
              Featured
            </Badge>
          )}
        </div>
      )}

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${stockColorByStatus[product.stockStatus]}`}
          >
            {stockLabelByStatus[product.stockStatus]}
          </span>
          {!isOutOfStock && deliveryBadge ? (
            <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-100">
              {deliveryBadge}
            </span>
          ) : null}
        </div>
        <FavoriteButton slug={product.slug} />
      </div>

      <div className="relative h-36 w-full overflow-hidden border-b border-white/6 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(11,17,31,0.96),rgba(8,14,26,1))] sm:h-40">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`transition-all duration-700 ${
            isOutOfStock
              ? 'object-cover grayscale'
              : 'object-contain p-4 group-hover:scale-[1.03]'
          }`}
        />

        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/55">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200">
              <Lock className="h-4 w-4" />
              Locked
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/40" />
      </div>

      <div className="relative space-y-3 p-4">
        <div className="space-y-1">
          <span
            className={`inline-block rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${accentClass}`}
          >
            {product.platform}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="line-clamp-2 min-h-[3rem] text-[1.2rem] font-extrabold leading-tight text-white transition-colors duration-300 group-hover:text-cyan-50">
            {product.name}
          </h3>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-[linear-gradient(180deg,rgba(56,189,248,0.04),transparent_24%,transparent_76%,rgba(96,165,250,0.03))] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-cyan-400/6 blur-3xl transition-all duration-500 group-hover:bg-cyan-400/10" />
    </article>
  )
}
