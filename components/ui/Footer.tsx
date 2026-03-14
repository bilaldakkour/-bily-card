import Link from 'next/link'
import { Truck, Shield, HeadphonesIcon, Clock, Mail, Phone, MapPin, Gamepad2, ChevronRight } from 'lucide-react'

type FooterProps = {
  withRightRailOffset?: boolean
}

export default function Footer({ withRightRailOffset = false }: FooterProps) {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(4,10,20,0.98),rgba(3,8,18,1))] py-12 sm:py-16">
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
      </div>

      <div className={`relative mx-auto px-4 sm:px-6 ${withRightRailOffset ? 'max-w-[1480px] lg:pr-[392px]' : 'max-w-7xl'}`}>
        <div className="mb-10 rounded-[30px] border border-white/10 bg-white/[0.03] px-5 py-6 shadow-[0_24px_60px_rgba(2,6,23,0.28)] sm:px-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Bily Card Network</p>
              <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                Built for modern gaming top-ups, gift cards, and instant digital delivery.
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_34px_rgba(14,165,233,0.28)] transition-all hover:-translate-y-0.5 hover:from-cyan-400 hover:to-sky-500"
            >
              Explore Catalog
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10">
                <Gamepad2 className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-lg font-black tracking-[0.18em] text-white">BILY CARD</p>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Gaming top-up marketplace</p>
              </div>
            </div>

            <p className="max-w-md text-sm leading-7 text-slate-300">
              A modern storefront for digital top-ups, gaming credits, subscriptions, and
              instant wallet products with a premium global-gaming look.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Fast Delivery</p>
                <p className="mt-2 text-sm font-semibold text-white">Optimized for instant fulfillment.</p>
              </div>
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Secure Checkout</p>
                <p className="mt-2 text-sm font-semibold text-white">Trusted payment and order handling.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Why Choose Us</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <Truck className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Fast Delivery</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className="text-slate-300">100% Secure</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <HeadphonesIcon className="h-5 w-5 text-purple-400" />
                <span className="text-slate-300">24/7 Support</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <Clock className="h-5 w-5 text-yellow-400" />
                <span className="text-slate-300">Easy Refunds</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/products" className="block text-slate-300 transition-colors hover:text-white">
                All Products
              </Link>
              <Link href="/categories/pubg" className="block text-slate-300 transition-colors hover:text-white">
                PUBG UC
              </Link>
              <Link href="/categories/freefire" className="block text-slate-300 transition-colors hover:text-white">
                Free Fire Diamonds
              </Link>
              <Link href="/categories/steam" className="block text-slate-300 transition-colors hover:text-white">
                Steam Wallet
              </Link>
              <Link href="/contact" className="block text-slate-300 transition-colors hover:text-white">
                Contact Us
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Support</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href="mailto:support@bilycard.com" className="text-slate-300 transition-colors hover:text-white">
                  support@bilycard.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <a href="tel:+96171985887" className="text-slate-300 transition-colors hover:text-white">
                  +961 71 985 887
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <a
                  href="https://wa.me/96171985887"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 transition-colors hover:text-white"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <h4 className="text-sm font-bold text-white">Stay Updated</h4>
              <p className="mt-2 text-sm text-slate-400">
                Get notified about new products and special offers.
              </p>
              <div className="mt-4 flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-900/90 px-3 py-2.5 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
                <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2.5 text-white transition-all hover:from-cyan-400 hover:to-sky-500">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10">
                <span className="text-sm font-black text-white">B</span>
              </div>
              <span className="text-lg font-black text-white">Bily Card</span>
            </div>
            <p className="text-center text-sm text-slate-400 md:text-right">
              © 2024 Bily Card. All rights reserved. Gaming top-ups made modern.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
