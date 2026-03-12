import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingCart, Zap } from 'lucide-react'
import { Badge } from './Badge'
import { Button } from './Button'
import FavoriteButton from './FavoriteButton'
import type { Product } from '@/lib/data'

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
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
    in_stock: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30',
    limited: 'text-amber-300 bg-amber-500/20 border-amber-400/30',
    out_of_stock: 'text-red-300 bg-red-500/20 border-red-400/30',
  }

  const accentClass =
    accentByCategory[product.category] || 'text-blue-300 bg-blue-500/15 border-blue-400/30'

  return (
    <Link href={`/products/${product.slug}`} className={`group relative rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/20 ${className}`}>
      {/* Badge */}
      {(product.featured || product.bestSeller) && (
        <div className="absolute top-6 left-6 z-20 flex gap-3">
          {product.bestSeller && (
            <Badge variant="primary" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shadow-lg">
              <Zap className="h-3.5 w-3.5" />
              Best Seller
            </Badge>
          )}
          {product.featured && (
            <Badge variant="secondary" className="px-3 py-1.5 text-xs font-bold shadow-lg">
              Featured
            </Badge>
          )}
        </div>
      )}

      <div className="absolute right-6 top-6 z-20">
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stockColorByStatus[product.stockStatus]}`}>
            {stockLabelByStatus[product.stockStatus]}
          </span>
          <FavoriteButton slug={product.slug} />
        </div>
      </div>

      {/* Image Container */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
        />
        {/* Fallback overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-900/60 flex items-center justify-center">
          <div className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity duration-300">🎮</div>
        </div>

        {/* Image overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-300"></div>
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-4">
        <div className="space-y-2">
          <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-widest ${accentClass}`}>
            {product.platform}
          </span>
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 group-hover:text-blue-50 transition-colors duration-300">
            {product.name}
          </h3>

          <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
            {product.shortDescription}
          </p>

          <p className="text-xs font-medium text-slate-500">
            Delivery: {product.deliveryTime}
          </p>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 transition-colors duration-300 ${
                  i < 4 ? 'fill-yellow-400 text-yellow-400 group-hover:fill-yellow-300 group-hover:text-yellow-300' : 'text-slate-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-slate-400 font-medium">(4.8)</span>
        </div>

        <div className="flex items-end justify-end gap-4 pt-2">
          <span className="inline-flex">
            <Button size="sm" className="shadow-lg hover:shadow-xl hover:shadow-blue-500/30">
              <ShoppingCart className="h-4 w-4" />
              View Product
            </Button>
          </span>
        </div>
      </div>

      {/* Premium glow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-600/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"></div>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 h-40 w-40 bg-gradient-to-bl from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -z-10 group-hover:from-blue-500/20 group-hover:via-purple-500/10 transition-all duration-500"></div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 h-32 w-32 bg-gradient-to-tr from-purple-500/5 to-transparent rounded-full blur-2xl -z-10 group-hover:from-purple-500/10 transition-all duration-500"></div>
    </Link>
  )
}