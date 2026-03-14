import Image from 'next/image'
import Link from 'next/link'
import { Lock, Zap } from 'lucide-react'
import { Badge } from './Badge'
import FavoriteButton from './FavoriteButton'
import type { Product } from '@/lib/data'

interface ProductCardProps {
  product: Product
  className?: string
  onProductSelect?: (product: Product) => void
}

export function ProductCard({ product, className = '', onProductSelect }: ProductCardProps) {
  const isOutOfStock = product.stockStatus === 'out_of_stock'

  const accentByCategory: Record<string, string> = {
    cards: 'border-blue-400/18 bg-blue-500/10 text-blue-200',
    applications: 'border-cyan-400/18 bg-cyan-500/10 text-cyan-200',
    games: 'border-emerald-400/18 bg-emerald-500/10 text-emerald-200',
    wallets: 'border-indigo-400/18 bg-indigo-500/10 text-indigo-200',
    balance: 'border-sky-400/18 bg-sky-500/10 text-sky-200',
  }

  const stockColorByStatus: Record<Product['stockStatus'], string> = {
    in_stock: 'border-emerald-400/22 bg-emerald-500/12 text-emerald-200',
    limited: 'border-amber-400/22 bg-amber-500/12 text-amber-200',
    out_of_stock: 'border-rose-300/22 bg-rose-500/12 text-rose-200',
  }

  const stockLabelByStatus: Record<Product['stockStatus'], string> = {
    in_stock: 'Ready',
    limited: 'Limited',
    out_of_stock: 'Closed',
  }

  const deliveryBadge =
    String(product.deliveryTime || '').toLowerCase().includes('instant') ||
    String(product.deliveryTime || '').toLowerCase().includes('auto')
      ? 'Instant'
      : product.deliveryTime

  const accentClass =
    accentByCategory[String(product.category || '').toLowerCase()] ||
    'border-cyan-400/18 bg-cyan-500/10 text-cyan-200'

  return (
    <article
      className={`group relative overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,34,0.98),rgba(6,13,26,0.98))] shadow-[0_16px_38px_rgba(2,6,23,0.18)] ring-1 ring-white/[0.025] transition-all duration-300 sm:rounded-[26px] sm:shadow-[0_24px_60px_rgba(2,6,23,0.22)] ${
        isOutOfStock
          ? 'cursor-not-allowed opacity-80'
          : 'hover:-translate-y-1 hover:border-cyan-300/24 hover:shadow-[0_24px_60px_rgba(14,165,233,0.12)]'
      } ${className}`}
    >
      {!isOutOfStock &&
        (onProductSelect ? (
          <button
            type="button"
            onClick={() => onProductSelect(product)}
            className="absolute inset-0 z-10 rounded-[20px] sm:rounded-[26px]"
            aria-label={`Open ${product.name}`}
          >
            <span className="sr-only">{`Open ${product.name}`}</span>
          </button>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-10 rounded-[20px] sm:rounded-[26px]"
            aria-label={`Open ${product.name}`}
          >
            <span className="sr-only">{`Open ${product.name}`}</span>
          </Link>
        ))}

      <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5 sm:left-3 sm:top-3">
        {product.bestSeller ? (
          <Badge
            variant="primary"
            className="hidden items-center gap-1 px-2.5 py-1 text-[10px] font-bold shadow-lg sm:inline-flex"
          >
            <Zap className="h-3 w-3" />
            Best Seller
          </Badge>
        ) : null}
        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:hidden ${stockColorByStatus[product.stockStatus]}`}>
          {stockLabelByStatus[product.stockStatus]}
        </span>
      </div>

      <div className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3">
        <FavoriteButton slug={product.slug} className="scale-90 sm:scale-100" />
      </div>

      <div className="relative h-24 overflow-hidden border-b border-white/6 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(11,17,31,0.96),rgba(8,14,26,1))] sm:h-40">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className={`${isOutOfStock ? 'object-cover grayscale' : 'object-contain p-2 transition duration-500 group-hover:scale-[1.03] sm:p-4'}`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,29,0.06),rgba(8,15,29,0.34))]" />

        {isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/58">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/28 bg-rose-500/14 px-3 py-1 text-xs font-semibold text-rose-100">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </span>
          </div>
        ) : null}
      </div>

      <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] sm:px-2.5 sm:py-1 sm:text-[10px] ${accentClass}`}>
            {product.platform}
          </span>
          <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">
            {deliveryBadge || 'Fast'}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[2rem] text-[0.76rem] font-bold leading-snug text-white sm:min-h-[3rem] sm:text-[1.1rem] sm:font-extrabold">
          {product.name}
        </h3>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[0.84rem] font-black text-cyan-200 sm:text-lg">
            ${Number(product.startingPrice ?? product.price ?? 0).toFixed(2)}
          </span>
          <span className="rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100 sm:hidden">
            Open
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-400/6 blur-3xl transition-all duration-500 group-hover:bg-cyan-400/10" />
    </article>
  )
}
