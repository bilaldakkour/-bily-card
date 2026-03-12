'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import UserSidebar from '@/components/shared/UserSidebar'
import FavoriteButton from '@/components/ui/FavoriteButton'
import { useLanguage } from '@/hooks/useLanguage'
import { notifySessionExpired } from '@/lib/utils/sessionNotice'
import { bilycardProducts } from '@/lib/data/bilycardProducts'
import {
  Flame,
  ChevronRight,
  Bell,
  MessageCircle,
  Sparkles,
  Trophy,
  Shield,
  Zap,
  BadgeCheck,
  Headphones,
  CreditCard,
  AppWindow,
  Gamepad2,
  WalletCards,
  BadgeDollarSign,
  UserRoundCog,
  Ticket,
  TrendingUp,
} from 'lucide-react'

type MeResponse = {
  success?: boolean
  data?: {
    walletBalance?: {
      usd?: number
      lbp?: number
    }
  }
}

type TopSellingItem = {
  slug: string
  name: string
  sold: number
}

export default function HomeCompactDashboard() {
  const { t, isRTL } = useLanguage()
  const [walletUsd, setWalletUsd] = useState(0)
  const [walletLbp, setWalletLbp] = useState(0)
  const [topSellingSlugs, setTopSellingSlugs] = useState<string[]>([])
  const [topSellingSections, setTopSellingSections] = useState<{
    products: TopSellingItem[]
    packages: TopSellingItem[]
    cards: TopSellingItem[]
  }>({ products: [], packages: [], cards: [] })

  const popularProducts = (() => {
    const available = bilycardProducts.filter((product) => product.stockStatus !== 'out_of_stock')
    if (!topSellingSlugs.length) return available.slice(0, 4)

    const rank = new Map(topSellingSlugs.map((slug, idx) => [slug, idx]))
    return [...available]
      .sort((a, b) => {
        const ar = rank.has(a.slug) ? Number(rank.get(a.slug)) : Number.MAX_SAFE_INTEGER
        const br = rank.has(b.slug) ? Number(rank.get(b.slug)) : Number.MAX_SAFE_INTEGER
        return ar - br
      })
      .slice(0, 4)
  })()

  const orderPreviewProducts = bilycardProducts
    .filter((product) => product.stockStatus !== 'out_of_stock')
    .slice(0, 3)

  const quickTabs = [
    {
      key: 'best-selling',
      label: 'BEST SELLERS',
      subtitle: 'Top sold items',
      chip: 'TREND',
      href: '/products?sort=popular',
      icon: TrendingUp,
      cardClass: 'from-rose-500/25 via-orange-500/20 to-yellow-500/20 border-rose-300/30 hover:border-rose-200/60',
      iconClass: 'from-rose-500 to-orange-400',
      glowClass: 'from-rose-400/35 to-orange-400/0',
      textureClass: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.10)_0%,transparent_35%),repeating-linear-gradient(45deg,rgba(255,255,255,0.07)_0_2px,transparent_2px_10px)]',
    },
    {
      key: 'cards',
      label: 'CARDS',
      subtitle: 'Gift cards',
      chip: 'PIN',
      href: '/products?category=cards',
      icon: CreditCard,
      cardClass: 'from-sky-500/25 via-blue-500/20 to-cyan-500/20 border-sky-300/30 hover:border-sky-200/60',
      iconClass: 'from-sky-500 to-cyan-400',
      glowClass: 'from-sky-400/35 to-cyan-400/0',
      textureClass: 'bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.16)_0_2px,transparent_2px),radial-gradient(circle_at_65%_65%,rgba(255,255,255,0.10)_0_1.5px,transparent_1.5px)] bg-[length:22px_22px,18px_18px]',
    },
    {
      key: 'applications',
      label: 'APPS',
      subtitle: 'Live apps',
      chip: 'LIVE',
      href: '/products?category=applications',
      icon: AppWindow,
      cardClass: 'from-fuchsia-500/25 via-violet-500/20 to-indigo-500/20 border-fuchsia-300/30 hover:border-fuchsia-200/60',
      iconClass: 'from-fuchsia-500 to-violet-400',
      glowClass: 'from-fuchsia-400/35 to-violet-400/0',
      textureClass: 'bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_12px),repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_12px)]',
    },
    {
      key: 'games',
      label: 'GAMES',
      subtitle: 'Game topups',
      chip: 'XP',
      href: '/products?category=games',
      icon: Gamepad2,
      cardClass: 'from-emerald-500/25 via-teal-500/20 to-cyan-500/20 border-emerald-300/30 hover:border-emerald-200/60',
      iconClass: 'from-emerald-500 to-teal-400',
      glowClass: 'from-emerald-400/35 to-teal-400/0',
      textureClass: 'bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_15%_85%,rgba(255,255,255,0.10),transparent_28%)]',
    },
    {
      key: 'wallets',
      label: 'WALLETS',
      subtitle: 'Crypto wallets',
      chip: 'CRYPTO',
      href: '/products?category=wallets',
      icon: WalletCards,
      cardClass: 'from-indigo-500/25 via-blue-500/20 to-purple-500/20 border-indigo-300/30 hover:border-indigo-200/60',
      iconClass: 'from-indigo-500 to-blue-400',
      glowClass: 'from-indigo-400/35 to-blue-400/0',
      textureClass: 'bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.08)_0_2px,transparent_2px_11px)]',
    },
    {
      key: 'balance',
      label: 'BALANCE',
      subtitle: 'Mobile recharge',
      chip: 'TOPUP',
      href: '/products?category=balance',
      icon: BadgeDollarSign,
      cardClass: 'from-lime-500/25 via-emerald-500/20 to-green-500/20 border-lime-300/30 hover:border-lime-200/60',
      iconClass: 'from-lime-500 to-emerald-400',
      glowClass: 'from-lime-400/35 to-emerald-400/0',
      textureClass: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[length:16px_16px]',
    },
    {
      key: 'accounts',
      label: 'ACCOUNTS',
      subtitle: 'Subscriptions',
      chip: 'PREMIUM',
      href: '/products?category=accounts-subscriptions',
      icon: UserRoundCog,
      cardClass: 'from-amber-500/25 via-orange-500/20 to-red-500/20 border-amber-300/30 hover:border-amber-200/60',
      iconClass: 'from-amber-500 to-orange-400',
      glowClass: 'from-amber-400/35 to-orange-400/0',
      textureClass: 'bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_3px,transparent_3px_12px)]',
    },
    {
      key: 'redemption',
      label: 'COUPONS',
      subtitle: 'Redemption tools',
      chip: 'TOOLS',
      href: '/products?category=redemption-coupons',
      icon: Ticket,
      cardClass: 'from-purple-500/25 via-fuchsia-500/20 to-pink-500/20 border-purple-300/30 hover:border-purple-200/60',
      iconClass: 'from-purple-500 to-fuchsia-400',
      glowClass: 'from-purple-400/35 to-fuchsia-400/0',
      textureClass: 'bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_2px,transparent_2px),linear-gradient(130deg,rgba(255,255,255,0.08),transparent_40%)] bg-[length:20px_20px,auto]',
    },
  ]

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) return

    const loadMe = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('bilycard_token')
          localStorage.removeItem('token')
          localStorage.removeItem('adminToken')
          notifySessionExpired('انتهت الجلسة، سجل دخولك من جديد')
          setWalletUsd(0)
          setWalletLbp(0)
          return
        }

        const data: MeResponse = await res.json()

        if (res.ok && data?.success) {
          setWalletUsd(Number(data?.data?.walletBalance?.usd || 0))
          setWalletLbp(Number(data?.data?.walletBalance?.lbp || 0))
        }
      } catch {
        setWalletUsd(0)
        setWalletLbp(0)
      }
    }

    void loadMe()
  }, [])

  useEffect(() => {
    const loadTopSelling = async () => {
      try {
        const res = await fetch('/api/products/top-selling', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data?.success || !Array.isArray(data?.data)) return

        const slugs = data.data
          .map((item: { slug?: string }) => String(item?.slug || '').toLowerCase())
          .filter(Boolean)

        setTopSellingSlugs(slugs)
      } catch {
        setTopSellingSlugs([])
      }
    }

    void loadTopSelling()
  }, [])

  useEffect(() => {
    const loadSections = async () => {
      try {
        const res = await fetch('/api/products/top-selling/sections', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data?.success || !data?.data) return

        setTopSellingSections({
          products: Array.isArray(data.data.products) ? data.data.products.slice(0, 10) : [],
          packages: Array.isArray(data.data.packages) ? data.data.packages.slice(0, 10) : [],
          cards: Array.isArray(data.data.cards) ? data.data.cards.slice(0, 10) : [],
        })
      } catch {
        setTopSellingSections({ products: [], packages: [], cards: [] })
      }
    }

    void loadSections()
  }, [])

  return (
    <main className="mx-auto max-w-[1520px] px-4 pb-12 pt-6 lg:px-7 lg:pr-28">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
        <aside className="hidden lg:block">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              {t('home.left.highlights')}
            </h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                <p className="text-sm text-cyan-300">{t('home.left.dailyDeals')}</p>
                <p className="mt-1 text-2xl font-bold text-white">{t('home.left.dailyDealsValue')}</p>
              </div>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                <p className="text-sm text-violet-300">{t('home.left.fastestDelivery')}</p>
                <p className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
                  <Trophy className="h-4 w-4 text-violet-300" />
                  {t('home.left.fastestDeliveryValue')}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-300">{t('home.left.protectedOrders')}</p>
                <p className="mt-1 flex items-center gap-2 text-base font-semibold text-white">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  {t('home.left.protectedOrdersValue')}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 md:p-7">
            <div className="absolute left-4 top-4 z-10 hidden rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200 md:block">
              {t('home.hero.badge')}
            </div>
            <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
              <Image
                src="/games/pubg.jpg"
                alt="Gaming"
                fill
                className="object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-slate-950" />
            </div>

            <div className="relative max-w-2xl">
              <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
                {t('home.hero.title1')}
                <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {t('home.hero.title2')}
                </span>
              </h1>
              <p className="mt-3 text-slate-300 md:text-xl">
                {t('home.hero.subtitle')}
              </p>

              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-500 hover:to-cyan-500"
              >
                {t('home.hero.cta')}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.14),transparent_45%)]" />
            <h3 className="relative mb-4 text-center text-xl font-semibold text-white">{t('home.quick.title')}</h3>
            <div dir={isRTL ? 'rtl' : 'ltr'} className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickTabs.map((tab) => {
                const Icon = tab.icon
                return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br px-4 py-3 shadow-[0_0_0_1px_rgba(15,23,42,0.25)] transition duration-300 hover:-translate-y-1 hover:shadow-xl ${tab.cardClass}`}
                >
                  <div className={`absolute inset-0 opacity-60 ${tab.textureClass}`} />
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.25),transparent_35%)]" />
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl transition duration-300 group-hover:scale-110 ${tab.glowClass}`} />

                  <div className="relative flex min-h-[52px] items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${tab.iconClass} shadow-lg`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black leading-tight tracking-[0.02em] text-white [text-wrap:balance]">
                        {tab.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-tight text-slate-100/90">{tab.subtitle}</p>
                    </div>
                  </div>

                  <div className="relative mt-2 flex items-center justify-end">
                    <span className="rounded-full border border-white/30 bg-black/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/90">
                      {tab.chip}
                    </span>
                  </div>
                </Link>
              )})}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Flame className="h-5 w-5 text-red-400" />
                {t('home.popular.title')}
              </h2>
              <Link href="/products" className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10">
                {t('home.popular.viewAll')}
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {popularProducts.map((card, index) => (
                <Link
                  key={card.id}
                  href={`/products/${card.slug}`}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/80 transition hover:-translate-y-0.5 hover:border-blue-500/40"
                >
                  <div className="absolute right-2 top-2 z-20">
                    <FavoriteButton slug={card.slug} />
                  </div>
                  <div className="relative h-36 w-full">
                    <Image src={card.image} alt={card.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/30 to-transparent" />
                    <div className="absolute left-2 top-2 rounded-md border border-white/20 bg-black/35 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                      {index === 0 ? 'HOT' : index === 1 ? 'TOP' : index === 2 ? 'FAST' : 'TREND'}
                    </div>
                  </div>
                  <div className="p-3.5">
                    <h3 className="line-clamp-1 text-base font-semibold text-white">{card.name}</h3>
                    <div className="mt-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-2 text-center text-sm font-medium text-white">
                      {t('home.popular.buyNow')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {[
              { title: 'Most Sold Products', items: topSellingSections.products },
              { title: 'Most Sold Packages', items: topSellingSections.packages },
              { title: 'Most Sold Cards', items: topSellingSections.cards },
            ].map((section) => (
              <div key={section.title} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">
                  {section.title}
                </h3>

                {section.items.length === 0 ? (
                  <p className="text-sm text-slate-400">No sales data yet</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.slice(0, 10).map((item, idx) => (
                      <Link
                        key={`${section.title}-${item.slug || item.name}-${idx}`}
                        href={item.slug ? `/products/${item.slug}` : '/products'}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-2 text-sm hover:bg-white/10"
                      >
                        <span className="line-clamp-1 text-slate-200">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="ml-2 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                          {item.sold}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 to-slate-950/70 p-4">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <Zap className="h-4 w-4 text-blue-300" />
                {t('home.features.instant.title')}
              </p>
              <p className="text-sm text-slate-300">{t('home.features.instant.subtitle')}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-slate-950/70 p-4">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <BadgeCheck className="h-4 w-4 text-emerald-300" />
                {t('home.features.secure.title')}
              </p>
              <p className="text-sm text-slate-300">{t('home.features.secure.subtitle')}</p>
            </div>
            <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-slate-950/70 p-4">
              <p className="flex items-center gap-2 text-base font-semibold text-white">
                <Headphones className="h-4 w-4 text-violet-300" />
                {t('home.features.support.title')}
              </p>
              <p className="text-sm text-slate-300">{t('home.features.support.subtitle')}</p>
              <Link
                href="https://wa.me/96171985887"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm font-medium text-emerald-300 hover:bg-emerald-600/30"
              >
                <MessageCircle className="h-4 w-4" />
                {t('home.features.support.whatsapp')}
              </Link>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
            <h3 className="mb-4 text-xl font-semibold text-white">{t('home.right.walletBalance')}</h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-xs text-emerald-300">USD</p>
                <p className="text-3xl font-bold text-emerald-400">${walletUsd.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
                <p className="text-xs text-fuchsia-300">LBP</p>
                <p className="text-2xl font-bold text-fuchsia-400">{walletLbp.toFixed(0)}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/wallet" className="rounded-lg bg-blue-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500">
                {t('home.right.addFunds')}
              </Link>
              <Link href="/wallet" className="rounded-lg bg-white/10 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/15">
                {t('home.right.withdraw')}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">{t('home.right.orders')}</h3>
              <Link href="/my-orders" className="text-sm text-blue-300 hover:text-blue-200">
                {t('home.popular.viewAll')}
              </Link>
            </div>

            <div className="space-y-3 text-sm">
              {orderPreviewProducts.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug}`}
                  className="flex items-center justify-between rounded-lg bg-white/5 p-2.5 transition hover:bg-white/10"
                >
                  <span className="line-clamp-1 text-slate-200">{item.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${index === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {index === 0 ? t('home.right.pending') : t('home.right.completed')}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-slate-300 lg:flex">
            <span>{t('home.right.notifications')}</span>
            <Bell className="h-4 w-4" />
          </div>
        </aside>
      </div>

      <UserSidebar />
    </main>
  )
}
