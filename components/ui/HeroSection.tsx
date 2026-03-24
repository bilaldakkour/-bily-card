'use client'

import Link from 'next/link'
import { Shield, Zap, HeadphonesIcon, ArrowRight, Trophy, Sparkles, CreditCard } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

export default function HeroSection() {
  const { language, isRTL } = useLanguage()
  const isArabic = language === 'ar'
  const copy = isArabic
    ? {
        badge: 'متجر الألعاب الرقمي',
        title1: 'اشحن أسرع.',
        title2: 'العب بدون انتظار.',
        subtitle:
          'شحنات مميزة لـ PUBG وFree Fire وSteam Wallet وTikTok Coins وبطاقات الهدايا والمزيد. تجربة مبنية على التسليم الفوري والدفع الآمن.',
        secureTitle: 'دفع آمن',
        secureDesc: 'إتمام شراء محمي ومعالجة موثوقة.',
        instantTitle: 'تسليم فوري',
        instantDesc: 'تنفيذ سريع مصمم للاعبين النشطين.',
        supportTitle: 'دعم مباشر',
        supportDesc: 'مساعدة متاحة عبر قنوات التواصل المباشرة.',
        browse: 'تصفح المنتجات',
        featuredWallet: 'المحفظة المميزة',
        premiumHub: 'مركز الرصيد المميز',
        delivery: 'التسليم',
        instant: 'فوري',
        topSeller: 'الأكثر مبيعاً',
        cardsCodes: 'بطاقات وأكواد',
        creatorBoost: 'تعزيز المنشئ',
        packageDesc: 'باقات شحن سريعة مع تجربة مرتبة وسير طلبات واضح.',
      }
    : {
        badge: 'Global Gaming Marketplace',
        title1: 'Recharge Faster.',
        title2: 'Play Without Waiting.',
        subtitle:
          'Premium top-ups for PUBG, Free Fire, Steam Wallet, TikTok Coins, gift cards, and more. Built for instant delivery, secure checkout, and a storefront that feels like a real esports marketplace.',
        secureTitle: 'Secure Payments',
        secureDesc: 'Protected checkout and trusted processing.',
        instantTitle: 'Instant Delivery',
        instantDesc: 'Fast fulfillment built for active players.',
        supportTitle: '24/7 Support',
        supportDesc: 'Always-on help through direct channels.',
        browse: 'Browse Products',
        featuredWallet: 'Featured Wallet',
        premiumHub: 'Premium Credits Hub',
        delivery: 'Delivery',
        instant: 'Instant',
        topSeller: 'Top Seller',
        cardsCodes: 'Cards & Codes',
        creatorBoost: 'Creator Boost',
        packageDesc: 'Fast refill packages with a premium storefront feel and quick order flow.',
      }
  const strongLine = isArabic
    ? 'اشحن فوراً خلال لحظات، وابدأ اللعب بدون أي تأخير.'
    : 'Top up in moments and jump back into the game with zero delay.'
  const topUpNowLabel = isArabic ? 'اشحن الآن' : 'Top Up Now'

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,18,34,0.96),rgba(3,9,20,0.92))] px-4 py-6 shadow-[0_22px_70px_rgba(2,6,23,0.52)] sm:px-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0">
        <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute right-0 top-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_0%,transparent_18%,transparent_80%,rgba(255,255,255,0.04)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <div className="space-y-5">
            <div className={`inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200 ${isArabic ? 'tracking-[0.06em]' : 'uppercase tracking-[0.22em]'}`}>
              <Sparkles className="h-3.5 w-3.5" />
              {copy.badge}
            </div>

            <div className={`space-y-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              <h1 className="max-w-3xl text-3xl font-black leading-[1.06] text-white md:text-4xl lg:text-5xl xl:text-6xl">
                {copy.title1}
                <span className="mt-2 block bg-gradient-to-r from-cyan-300 via-sky-400 to-orange-400 bg-clip-text text-transparent">
                  {copy.title2}
                </span>
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base md:leading-7">
                {copy.subtitle}
              </p>
              <p className="max-w-2xl text-sm font-extrabold leading-6 text-cyan-200 md:text-base md:leading-7">
                {strongLine}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
                  <Shield className="h-4 w-4 text-green-400" />
                </div>
                <p className="text-sm font-bold text-white">{copy.secureTitle}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{copy.secureDesc}</p>
              </div>

              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
                  <Zap className="h-4 w-4 text-yellow-400" />
                </div>
                <p className="text-sm font-bold text-white">{copy.instantTitle}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{copy.instantDesc}</p>
              </div>

              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15">
                  <HeadphonesIcon className="h-4 w-4 text-blue-400" />
                </div>
                <p className="text-sm font-bold text-white">{copy.supportTitle}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-300">{copy.supportDesc}</p>
              </div>
            </div>

            <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <Link
                href="/products"
                className="inline-flex items-center justify-center space-x-2 rounded-xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(249,115,22,0.2))] px-5 py-2.5 text-sm font-black text-amber-100 shadow-[0_14px_32px_rgba(245,158,11,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-200/40 hover:text-white"
              >
                <span>{topUpNowLabel}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(14,165,233,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:from-cyan-400 hover:to-blue-500"
              >
                <span>{copy.browse}</span>
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

              <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">PUBG UC</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Steam Wallet</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">TikTok Coins</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-xl">
              <div className="glass-panel relative overflow-hidden rounded-[28px] p-4 sm:p-5">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">{copy.featuredWallet}</p>
                    <p className="mt-1 text-base font-black text-white">{copy.premiumHub}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">{copy.delivery}</p>
                    <p className="text-xs font-black text-white">{copy.instant}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-orange-400/20 bg-[linear-gradient(145deg,rgba(249,115,22,0.18),rgba(15,23,42,0.7))] p-4">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
                        <Trophy className="h-4 w-4 text-orange-300" />
                      </div>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                        {copy.topSeller}
                      </span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-200">PUBG Mobile</p>
                    <p className="mt-1.5 text-xl font-black text-white">UC Packages</p>
                    <p className="mt-2 text-xs leading-6 text-slate-200/80">
                      {copy.packageDesc}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[24px] border border-cyan-400/20 bg-[linear-gradient(145deg,rgba(56,189,248,0.18),rgba(15,23,42,0.7))] p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                        <CreditCard className="h-4 w-4 text-cyan-200" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">Steam Wallet</p>
                      <p className="mt-1.5 text-base font-black text-white">{copy.cardsCodes}</p>
                    </div>

                    <div className="rounded-[24px] border border-fuchsia-400/20 bg-[linear-gradient(145deg,rgba(217,70,239,0.18),rgba(15,23,42,0.7))] p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15">
                        <Sparkles className="h-4 w-4 text-fuchsia-200" />
                      </div>
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-fuchsia-200">TikTok Coins</p>
                      <p className="mt-1.5 text-base font-black text-white">{copy.creatorBoost}</p>
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
