'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingCart, Zap } from 'lucide-react'

const products = [
  {
    id: 'free-fire-diamonds-100',
    name: 'Free Fire Diamonds',
    price: 4.99,
    originalPrice: 5.99,
    image: '/games/free-fire.jpg',
    rating: 4.8,
    category: 'Free Fire',
    badge: 'Best Seller'
  },
  {
    id: 'pubg-uc-60',
    name: 'PUBG UC 60',
    price: 2.99,
    originalPrice: 3.49,
    image: '/games/pubg.jpg',
    rating: 4.9,
    category: 'PUBG Mobile',
    badge: 'Popular'
  },
  {
    id: 'steam-gift-card-10',
    name: 'Steam Wallet $10',
    price: 10.00,
    originalPrice: 10.00,
    image: '/games/steam.jpg',
    rating: 5.0,
    category: 'Steam',
    badge: 'Instant'
  },
  {
    id: 'tiktok-coins-100',
    name: 'TikTok Coins 100',
    price: 1.99,
    originalPrice: 2.49,
    image: '/games/tiktok.jpg',
    rating: 4.7,
    category: 'TikTok',
    badge: 'Trending'
  },
  {
    id: 'google-play-5',
    name: 'Google Play $5',
    price: 5.00,
    originalPrice: 5.00,
    image: '/games/google-play.jpg',
    rating: 4.8,
    category: 'Google Play',
    badge: 'Gift Card'
  },
  {
    id: 'playstation-10',
    name: 'PlayStation $10',
    price: 10.00,
    originalPrice: 10.00,
    image: '/games/playstation.jpg',
    rating: 4.9,
    category: 'PlayStation',
    badge: 'Digital'
  }
]

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

export default function BestSellingProducts() {
  return (
    <section className="py-14 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
            Best Selling Products
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Our most popular top-up products with instant delivery
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-[18px] border border-white/10 bg-slate-900/80 backdrop-blur transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              {/* Badge */}
              {product.badge && (
                <div className="absolute left-2 top-2 z-10 flex items-center space-x-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                  <Zap className="h-3 w-3" />
                  <span>{product.badge}</span>
                </div>
              )}

              {/* Image Container with fixed height */}
              <div className="relative h-24 w-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 sm:h-28">
                {(() => {
                  const safeImageSrc = getSafeImageSrc(product.image)
                  const useUnoptimizedImage = safeImageSrc.startsWith('http://') || safeImageSrc.startsWith('https://')
                  return (
                <Image
                  src={safeImageSrc}
                  alt={product.name}
                  fill
                  unoptimized={useUnoptimizedImage}
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                  )
                })()}
                {/* Fallback overlay if image fails */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/40 flex items-center justify-center">
                  <div className="text-5xl opacity-30">🎮</div>
                </div>
              </div>

              {/* Content */}
              <div className="flex h-full flex-1 flex-col justify-between p-2.5">
                <div className="mb-2">
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-blue-400">
                    {product.category}
                  </span>
                </div>

                <h3 className="mb-2 line-clamp-2 min-h-[2.2rem] text-[11px] font-bold text-white sm:text-sm">
                  {product.name}
                </h3>

                <div className="mb-2 flex items-center space-x-1">
                  <div className="flex items-center space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(product.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-[10px] text-slate-400">({product.rating})</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                    View details
                  </div>
                </div>
              </div>

              {/* Premium glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"></div>
              
              {/* Corner accent */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl -z-10 group-hover:from-blue-500/20 transition-colors duration-300"></div>
            </Link>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-10 text-center">
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 rounded-xl border border-white/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10 px-8 py-3 text-white font-semibold transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <span>View All Products</span>
            <ShoppingCart className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
