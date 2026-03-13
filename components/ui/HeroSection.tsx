'use client'

import Link from 'next/link'
import { Shield, Zap, HeadphonesIcon, ArrowRight, Trophy, Sparkles, CreditCard } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,18,34,0.96),rgba(3,9,20,0.92))] px-5 py-8 shadow-[0_24px_80px_rgba(2,6,23,0.55)] sm:px-7 lg:px-10 lg:py-10">
      <div className="absolute inset-0">
        <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_0%,transparent_18%,transparent_80%,rgba(255,255,255,0.04)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Global Gaming Marketplace
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] text-white md:text-5xl lg:text-6xl xl:text-7xl">
                Recharge Faster.
                <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-400 to-orange-400 bg-clip-text text-transparent">
                  Play Without Waiting.
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                Premium top-ups for PUBG, Free Fire, Steam Wallet, TikTok Coins, gift cards,
                and more. Built for instant delivery, secure checkout, and a storefront that
                feels like a real esports marketplace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-sm font-bold text-white">Secure Payments</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">Protected checkout and trusted processing.</p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15">
                  <Zap className="h-5 w-5 text-yellow-400" />
                </div>
                <p className="text-sm font-bold text-white">Instant Delivery</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">Fast fulfillment built for active players.</p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15">
                  <HeadphonesIcon className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-sm font-bold text-white">24/7 Support</p>
                <p className="mt-1 text-xs leading-6 text-slate-300">Always-on help through direct channels.</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/products"
                className="inline-flex items-center justify-center space-x-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-7 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(14,165,233,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:from-cyan-400 hover:to-blue-500"
              >
                <span>Browse Products</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">PUBG UC</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">Steam Wallet</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">TikTok Coins</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-xl">
              <div className="glass-panel relative overflow-hidden rounded-[32px] p-5 sm:p-6">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

                <div className="mb-5 flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Featured Wallet</p>
                    <p className="mt-1 text-lg font-black text-white">Premium Credits Hub</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">Delivery</p>
                    <p className="text-sm font-black text-white">Instant</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-orange-400/20 bg-[linear-gradient(145deg,rgba(249,115,22,0.18),rgba(15,23,42,0.7))] p-5">
                    <div className="mb-8 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
                        <Trophy className="h-5 w-5 text-orange-300" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                        Top Seller
                      </span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200">PUBG Mobile</p>
                    <p className="mt-2 text-2xl font-black text-white">UC Packages</p>
                    <p className="mt-3 text-sm leading-7 text-slate-200/80">
                      Fast refill packages with a premium storefront feel and quick order flow.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.7))] p-5">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15">
                        <CreditCard className="h-5 w-5 text-cyan-200" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Steam Wallet</p>
                      <p className="mt-2 text-lg font-black text-white">Cards & Codes</p>
                    </div>

                    <div className="rounded-[28px] border border-fuchsia-400/20 bg-[linear-gradient(145deg,rgba(217,70,239,0.18),rgba(15,23,42,0.7))] p-5">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15">
                        <Sparkles className="h-5 w-5 text-fuchsia-200" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-fuchsia-200">TikTok Coins</p>
                      <p className="mt-2 text-lg font-black text-white">Creator Boost</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
