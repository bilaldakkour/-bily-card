'use client'

import Link from 'next/link'
import { Shield, Zap, HeadphonesIcon, ArrowRight } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-14 lg:py-20">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[420px] w-[420px] rounded-full bg-gradient-to-r from-blue-500/8 to-purple-500/8 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 h-[360px] w-[360px] rounded-full bg-gradient-to-r from-purple-500/6 to-pink-500/6 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[580px] w-[580px] rounded-full bg-gradient-to-r from-cyan-500/4 to-blue-500/4 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left side - Content */}
          <div className="space-y-7">
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl xl:text-7xl">
                Top Up Your Favorite{' '}
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient-x">
                  Games
                </span>
              </h1>
              <p className="text-lg text-slate-300 md:text-xl font-medium">
                Fast • Safe • Instant
              </p>
            </div>

            <p className="text-base text-slate-400 max-w-2xl leading-relaxed md:text-lg">
              Buy PUBG UC, Free Fire Diamonds, Steam Wallet and TikTok Coins instantly.
              Get premium gaming credits with secure payment and instant delivery.
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-3 text-slate-300 group">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 group-hover:bg-green-500/30 transition-colors duration-300">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <span className="text-sm font-semibold">Secure Payment</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300 group">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 group-hover:bg-yellow-500/30 transition-colors duration-300">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <span className="text-sm font-semibold">Instant Delivery</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-300 group">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors duration-300">
                  <HeadphonesIcon className="h-5 w-5 text-blue-400" />
                </div>
                <span className="text-sm font-semibold">24/7 Support</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center space-x-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 px-7 py-3.5 text-base font-bold text-white shadow-2xl shadow-blue-500/30 transition-all duration-300 hover:shadow-3xl hover:shadow-blue-500/50 hover:scale-105 active:scale-95 group"
              >
                <span>Browse Products</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </div>

          {/* Right side - Gaming artwork */}
          <div className="relative">
            <div className="relative mx-auto max-w-md lg:max-w-lg">
              {/* Main gaming card */}
              <div className="relative rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-950/90 backdrop-blur-xl p-7 shadow-2xl border border-white/10 hover:border-white/20 transition-all duration-500 group">
                <div className="absolute -top-6 -right-6 h-12 w-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 shadow-xl animate-pulse"></div>
                <div className="absolute -bottom-6 -left-6 h-8 w-8 rounded-xl bg-gradient-to-r from-green-500 to-blue-500 shadow-lg animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                {/* Game icons grid */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col items-center space-y-3 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-4 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 group/game">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-red-600 flex items-center justify-center shadow-lg group-hover/game:shadow-orange-500/30 transition-all duration-300">
                      <span className="text-white font-black text-lg">PUBG</span>
                    </div>
                    <span className="text-sm text-slate-400 font-semibold">UC</span>
                  </div>

                  <div className="flex flex-col items-center space-y-3 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-4 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 group/game">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg group-hover/game:shadow-yellow-500/30 transition-all duration-300">
                      <span className="text-white font-black text-lg">FF</span>
                    </div>
                    <span className="text-sm text-slate-400 font-semibold">Diamonds</span>
                  </div>

                  <div className="flex flex-col items-center space-y-3 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-4 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 group/game">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover/game:shadow-blue-500/30 transition-all duration-300">
                      <span className="text-white font-black text-sm">Steam</span>
                    </div>
                    <span className="text-sm text-slate-400 font-semibold">Wallet</span>
                  </div>

                  <div className="flex flex-col items-center space-y-3 rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-4 border border-white/5 hover:bg-slate-800/60 hover:border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/20 group/game">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover/game:shadow-pink-500/30 transition-all duration-300">
                      <span className="text-white font-black text-sm">TikTok</span>
                    </div>
                    <span className="text-sm text-slate-400 font-semibold">Coins</span>
                  </div>
                </div>

                {/* Enhanced glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"></div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-12 -left-12 h-16 w-16 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 -right-16 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-500/30 to-orange-500/30 blur-xl animate-bounce" style={{ animationDelay: '0.5s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}