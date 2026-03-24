'use client'

import { memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Zap } from 'lucide-react'
import FavoriteButton from './FavoriteButton'
import { premiumBadgeBase, premiumBadgeTone } from './badgeSystem'
import type { ProductListItem } from '@/lib/data'

interface ProductCardProps {
  product: ProductListItem
  className?: string
  onProductSelect?: (product: ProductListItem) => void
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

export const ProductCard = memo(function ProductCard({
  product,
  className = '',
  onProductSelect,
}: ProductCardProps) {
  const normalizedStockStatus = String(product.stockStatus || '').trim().toLowerCase()
  const isOutOfStock =
    normalizedStockStatus === 'out_of_stock' ||
    normalizedStockStatus === 'paused' ||
    normalizedStockStatus === 'unavailable'

  const accentByCategory: Record<string, string> = {
    cards: 'border-[#d4a940]/28 bg-[#d4a940]/14 text-[#f6d88d]',
    applications: 'border-[#9b78ff]/26 bg-[#9b78ff]/12 text-[#ddd0ff]',
    games: 'border-[#3a7bff]/24 bg-[#3a7bff]/12 text-[#bfccff]',
    wallets: 'border-[#7e57ff]/24 bg-[#7e57ff]/12 text-[#d7c7ff]',
    balance: 'border-[#46a0ff]/24 bg-[#46a0ff]/12 text-[#c4ddff]',
  }

  const deliveryBadgeRaw = String(product.deliveryTime || '').toLowerCase()
  const deliveryLabel =
    deliveryBadgeRaw.includes('instant') || deliveryBadgeRaw.includes('auto')
      ? 'فوري'
      : deliveryBadgeRaw
        ? 'سريع'
        : 'سريع'
  const safeImageSrc = getSafeImageSrc(product.image)
  const useUnoptimizedImage = safeImageSrc.startsWith('http://') || safeImageSrc.startsWith('https://')

  const accentClass =
    accentByCategory[String(product.category || '').toLowerCase()] ||
    'border-[#46a0ff]/24 bg-[#46a0ff]/12 text-[#c4ddff]'
  const hasFeatured = Boolean((product as ProductListItem & { featured?: boolean }).featured)

  const primaryBadge = product.bestSeller
    ? { label: 'الأكثر مبيعاً', className: premiumBadgeTone.offer, icon: <Zap className="h-3 w-3" /> }
    : hasFeatured
      ? { label: 'عرض خاص', className: premiumBadgeTone.offer, icon: null }
      : { label: 'تسليم فوري', className: premiumBadgeTone.instant, icon: null }

  const ctaLabel = isOutOfStock ? 'غير متوفر' : 'اشحن الآن'

  return (
    <article
      className={`group relative flex h-full min-h-[11.8rem] flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(5,10,22,0.96))] shadow-[0_14px_30px_rgba(2,6,23,0.24)] transition-all duration-300 ${
        isOutOfStock
          ? 'cursor-not-allowed opacity-80'
          : 'active:scale-[0.99] md:hover:-translate-y-1 md:hover:border-[#d4a940]/30 md:hover:shadow-[0_20px_40px_rgba(46,91,255,0.24)]'
      } ${className}`}
    >
      {!isOutOfStock &&
        (onProductSelect ? (
          <button
            type="button"
            onClick={() => onProductSelect(product)}
            className="absolute inset-0 z-10 rounded-[22px]"
            aria-label={`فتح ${product.name}`}
          >
            <span className="sr-only">{`فتح ${product.name}`}</span>
          </button>
        ) : (
          <Link
            href={`/products/${product.slug}`}
            className="absolute inset-0 z-10 rounded-[22px]"
            aria-label={`فتح ${product.name}`}
          >
            <span className="sr-only">{`فتح ${product.name}`}</span>
          </Link>
        ))}

      <div className="absolute left-2 top-2 z-20 flex items-center gap-1">
        <span
          className={`hidden items-center gap-1 sm:inline-flex ${premiumBadgeBase} px-2 py-1 text-[10px] ${primaryBadge.className}`}
        >
          {primaryBadge.icon}
          {primaryBadge.label}
        </span>
        <span
          className={`inline-flex rounded-full border px-1.5 py-[2px] text-[9px] font-semibold sm:hidden ${primaryBadge.className}`}
        >
          {primaryBadge.label}
        </span>
      </div>

      <div className="absolute right-2 top-2 z-20">
        <FavoriteButton slug={product.slug} className="scale-[0.9]" />
      </div>

      <div className="relative h-28 w-full overflow-hidden sm:h-32 md:h-36 lg:h-40">
        <Image
          src={safeImageSrc}
          alt={product.name}
          fill
          unoptimized={useUnoptimizedImage}
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, (max-width: 1440px) 20vw, 15vw"
          className={`${
            isOutOfStock
              ? 'object-cover grayscale opacity-40'
              : 'object-cover transition duration-500 group-hover:scale-105'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent opacity-70" />

        {isOutOfStock ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/58">
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/28 bg-rose-500/14 px-2 py-0.5 text-[10px] font-semibold text-rose-100">
              <Lock className="h-3 w-3" />
              غير متاح
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span
            className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${accentClass}`}
          >
            {product.platform}
          </span>
          <span className="text-xs font-semibold text-slate-400">{deliveryLabel}</span>
        </div>

        <h3 className="line-clamp-2 min-h-[44px] text-sm font-semibold text-white">{product.name}</h3>

        <span className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)] transition md:group-hover:from-cyan-400 md:group-hover:to-sky-500">
          {ctaLabel}
        </span>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[#9b78ff]/12 blur-3xl transition-all duration-500 group-hover:bg-[#d4a940]/14" />
    </article>
  )
})
