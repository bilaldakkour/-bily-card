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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="group relative rounded-2xl bg-slate-900/80 backdrop-blur border border-white/10 overflow-hidden transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              {/* Badge */}
              {product.badge && (
                <div className="absolute top-4 left-4 z-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white flex items-center space-x-1">
                  <Zap className="h-3 w-3" />
                  <span>{product.badge}</span>
                </div>
              )}

              {/* Image Container with fixed height */}
              <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Fallback overlay if image fails */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/40 flex items-center justify-center">
                  <div className="text-5xl opacity-30">🎮</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="mb-3">
                  <span className="text-xs font-medium text-blue-400 uppercase tracking-widest">
                    {product.category}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-3 line-clamp-2">
                  {product.name}
                </h3>

                <div className="flex items-center space-x-1 mb-4">
                  <div className="flex items-center space-x-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(product.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 ml-2">({product.rating})</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-white">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-xs text-slate-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
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