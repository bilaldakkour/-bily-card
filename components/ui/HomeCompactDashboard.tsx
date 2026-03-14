'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import UserSidebar from '@/components/shared/UserSidebar'
import MobileUserShell from '@/components/shared/MobileUserShell'
import FavoriteButton from '@/components/ui/FavoriteButton'
import Footer from '@/components/ui/Footer'
import HeroSection from '@/components/ui/HeroSection'
import TopPromoCarousel from '@/components/ui/TopPromoCarousel'
import ProductDetails from '@/components/products/ProductDetails'
import { useLanguage } from '@/hooks/useLanguage'
import { notifySessionExpired } from '@/lib/utils/sessionNotice'
import { bilycardProducts } from '@/lib/data/bilycardProducts'
import { groupCatalogProducts } from '@/lib/data/catalogGrouping'
import { classifyCatalogProduct } from '@/lib/data/catalogTaxonomy'
import type { Product } from '@/lib/data'
import {
  ArrowLeft,
  Flame,
  ChevronRight,
  Sparkles,
  Trophy,
  Shield,
  CreditCard,
  AppWindow,
  Gamepad2,
  WalletCards,
  BadgeDollarSign,
  UserRoundCog,
  Ticket,
  TrendingUp,
  X,
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [mobileBannerIndex, setMobileBannerIndex] = useState(0)

  const rankedProducts = useMemo(() => {
    const available = groupCatalogProducts(
      bilycardProducts.filter((product) => product.stockStatus !== 'out_of_stock')
    )

    if (!topSellingSlugs.length) return available

    const rank = new Map(topSellingSlugs.map((slug, idx) => [slug, idx]))
    const getRank = (slug: string) => (rank.has(slug) ? Number(rank.get(slug)) : Number.MAX_SAFE_INTEGER)

    return [...available]
      .sort((a, b) => {
        const aRank = Math.min(...[a.slug, ...(a.childSlugs || [])].map((slug) => getRank(String(slug).toLowerCase())))
        const bRank = Math.min(...[b.slug, ...(b.childSlugs || [])].map((slug) => getRank(String(slug).toLowerCase())))
        return aRank - bRank
      })
  }, [topSellingSlugs])

  const popularProducts = useMemo(() => rankedProducts.slice(0, 4), [rankedProducts])

  const mostSoldPackages = useMemo(
    () =>
      rankedProducts
        .filter((product) =>
          product.groupChildren.some((child) =>
            child.inputFields?.some((field) => field.name === 'package' && field.type === 'select')
          )
        )
        .slice(0, 4),
    [rankedProducts]
  )

  const mostSoldCards = useMemo(
    () =>
      rankedProducts
        .filter((product) => classifyCatalogProduct(product).category === 'cards')
        .slice(0, 4),
    [rankedProducts]
  )

  const mobileFeaturedProducts = useMemo(() => rankedProducts.slice(0, 6), [rankedProducts])
  const mobileBannerSlides = useMemo(
    () => [
      '/games/playstation.jpg',
      '/games/pubg.jpg',
      '/games/google-play.jpg',
    ],
    []
  )

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
    setIsClient(true)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMobileBannerIndex((current) => (current + 1) % mobileBannerSlides.length)
    }, 3200)

    return () => window.clearInterval(interval)
  }, [mobileBannerSlides.length])

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

  const renderPopularSection = (title: string, items: typeof popularProducts) => (
    <div className="glass-panel rounded-[24px] p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <Flame className="h-5 w-5 text-red-400" />
          {title}
        </h2>
        <Link href="/products" className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
          {t('home.popular.viewAll')}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((card, index) => (
          <article
            key={`${title}-${card.id}`}
            className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(5,10,22,0.96))] shadow-[0_16px_34px_rgba(2,6,23,0.24)] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_22px_44px_rgba(8,47,73,0.28)]"
          >
            <button
              type="button"
              onClick={() => handleProductSelect(card)}
              className="absolute inset-0 z-10 rounded-[24px]"
              aria-label={`Open ${card.name}`}
            />
            <div className="absolute right-2 top-2 z-20">
              <FavoriteButton slug={card.slug} />
            </div>
            <div className="relative h-40 w-full overflow-hidden">
              <Image src={card.image} alt={card.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent opacity-70" />
              <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-white">
                {index === 0 ? 'HOT' : index === 1 ? 'TOP' : index === 2 ? 'FAST' : 'TREND'}
              </div>
            </div>
            <div className="p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  Game Store
                </span>
                <span className="text-xs font-semibold text-slate-400">Instant</span>
              </div>
              <h3 className="line-clamp-2 min-h-[44px] text-sm font-semibold text-white">{card.name}</h3>
              <div className="mt-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-center text-sm font-bold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)]">
                {t('home.popular.buyNow')}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )

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
    if (!selectedProduct) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalVisible(false)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    const raf = window.requestAnimationFrame(() => {
      setIsModalVisible(true)
    })

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
      window.cancelAnimationFrame(raf)
    }
  }, [selectedProduct])

  useEffect(() => {
    if (isModalVisible || !selectedProduct) return

    const timeout = window.setTimeout(() => {
      setSelectedProduct(null)
    }, 180)

    return () => window.clearTimeout(timeout)
  }, [isModalVisible, selectedProduct])

  const handleProductSelect = useCallback((product: Product) => {
    const productVariants = product.groupChildren?.length ? product.groupChildren : [product]
    const isPackageProduct = productVariants.some((child) =>
      child.inputFields?.some((field) => field.name === 'package' && field.type === 'select')
    )

    if (isPackageProduct) {
      window.location.href = `/products/${product.slug}`
      return
    }

    setSelectedProduct(product)
    setIsModalVisible(false)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false)
  }, [])

  return (
    <>
      <div className="mx-auto max-w-[1480px] px-4 pt-3 sm:px-5 md:hidden">
        <MobileUserShell />
      </div>

      <main className="mx-auto max-w-[1480px] px-4 pb-12 pt-0 sm:px-5 lg:px-6">
        <section className="space-y-4 md:hidden">
          <div className="overflow-hidden rounded-[30px] border border-rose-300/12 bg-[linear-gradient(145deg,#091323,#161420)] p-3 shadow-[0_24px_70px_rgba(2,6,23,0.32)] ring-1 ring-cyan-400/10">
            <div className="relative h-[148px] overflow-hidden rounded-[24px]">
              <Image
                src={mobileBannerSlides[mobileBannerIndex]}
                alt="Featured banner"
                fill
                className="object-cover transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,10,24,0.6),rgba(5,10,24,0.14))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,113,133,0.16),transparent_34%)]" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-4">
                <div className="flex items-center gap-2">
                  {mobileBannerSlides.map((slide, index) => (
                    <button
                      key={slide}
                      type="button"
                      onClick={() => setMobileBannerIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        mobileBannerIndex === index ? 'w-6 bg-cyan-300' : 'w-2.5 bg-white/45'
                      }`}
                      aria-label={`Go to banner ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur">
                  {'\u0645\u0645\u064a\u0632'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[30px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(11,19,34,0.98),rgba(21,23,38,0.94))] p-4 shadow-[0_18px_50px_rgba(2,6,23,0.22)]">
            {[
              { label: '\u0627\u0644\u0631\u0635\u064a\u062f', icon: BadgeDollarSign, href: '/products?category=balance', active: false },
              { label: '\u0627\u0644\u0645\u062d\u0627\u0641\u0638', icon: WalletCards, href: '/products?category=wallets', active: false },
              { label: '\u0627\u0644\u0623\u0644\u0639\u0627\u0628', icon: Gamepad2, href: '/products?category=games', active: false },
              { label: '\u0627\u0644\u062a\u0637\u0628\u064a\u0642\u0627\u062a', icon: AppWindow, href: '/products?category=applications', active: false },
              { label: '\u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a', icon: CreditCard, href: '/products?category=cards', active: false },
              { label: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627\u064b', icon: Flame, href: '/products?sort=popular', active: true },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.label} href={item.href} className="flex flex-col items-center gap-2 text-center">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full border ${
                      item.active
                        ? 'border-rose-300/60 bg-[linear-gradient(145deg,rgba(125,211,252,0.12),rgba(251,113,133,0.12))] text-rose-200 shadow-[0_0_0_1px_rgba(251,113,133,0.12)]'
                        : 'border-slate-600/70 bg-white/[0.015] text-slate-200'
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className={`text-base ${item.active ? 'text-rose-200' : 'text-slate-200'}`}>{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="space-y-1 px-1 text-right">
            <h2 className="text-[2.2rem] font-black leading-none text-rose-300">{'\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627\u064b'}</h2>
            <p className="text-[1.6rem] font-bold text-sky-200">{'\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0623\u0639\u0644\u0649 \u0637\u0644\u0628\u0627\u064b'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {mobileFeaturedProducts.map((product) => (
              <button
                key={`mobile-home-${product.id}`}
                type="button"
                onClick={() => handleProductSelect(product)}
                className="group overflow-hidden rounded-[28px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(11,19,34,0.96),rgba(24,24,36,0.92))] text-right shadow-[0_20px_40px_rgba(2,6,23,0.3)]"
              >
                <div className="relative h-[188px] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.18),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(251,113,133,0.18),transparent_35%),linear-gradient(180deg,#102033,#171523)]">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,24,0.12),rgba(5,10,24,0.84))]" />
                  <div className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-sky-400 to-rose-400 px-3 py-1 text-xs font-bold text-slate-950">
                    {'\u0641\u0648\u0631\u064a'}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 space-y-2 p-3.5 text-right">
                    <div className="flex items-center justify-between text-rose-200">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-semibold text-sky-100">
                        ${Number(product.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-[1.05rem] font-bold text-white">
                      {product.name}
                    </h3>
                    <p className="line-clamp-3 text-xs leading-5 text-slate-200/90">
                      {product.shortDescription || '\u0627\u0634\u062d\u0646 \u0645\u0646\u062a\u062c\u0643 \u0627\u0644\u0645\u0641\u0636\u0644 \u0628\u0633\u0631\u0639\u0629 \u0648\u0628\u0623\u0645\u0627\u0646.'}
                    </p>
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-200">
                      {'\u0627\u0636\u063a\u0637 \u0644\u0644\u0639\u0631\u0636'}
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="relative lg:pr-[372px]">
          <section className="hidden space-y-4 md:block">
            <TopPromoCarousel showQuickTabs={false} />

            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="hidden xl:block">
                <div className="glass-panel w-full rounded-[24px] p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    {t('home.left.highlights')}
                  </h3>

                  <div className="space-y-2.5">
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <p className="text-xs text-cyan-300">{t('home.left.dailyDeals')}</p>
                      <p className="mt-1 text-xl font-bold text-white">{t('home.left.dailyDealsValue')}</p>
                    </div>

                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <p className="text-xs text-violet-300">{t('home.left.fastestDelivery')}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                        <Trophy className="h-4 w-4 text-violet-300" />
                        {t('home.left.fastestDeliveryValue')}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <p className="text-xs text-emerald-300">{t('home.left.protectedOrders')}</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                        <Shield className="h-4 w-4 text-emerald-300" />
                        {t('home.left.protectedOrdersValue')}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(7,14,27,0.95),rgba(4,9,18,0.92))] p-4 shadow-[0_20px_50px_rgba(2,6,23,0.3)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.14),transparent_45%)]" />
            <div className="relative mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{t('home.hero.badge')}</p>
                <h3 className="text-lg font-semibold text-white">{t('home.quick.title')}</h3>
              </div>
              <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white">
                View all categories
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div dir={isRTL ? 'rtl' : 'ltr'} className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickTabs.map((tab) => {
                const Icon = tab.icon
                return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`group relative overflow-hidden rounded-[22px] border bg-gradient-to-br px-3.5 py-3.5 shadow-[0_0_0_1px_rgba(15,23,42,0.25),0_16px_34px_rgba(2,6,23,0.24)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(2,6,23,0.3)] ${tab.cardClass}`}
                >
                  <div className={`absolute inset-0 opacity-60 ${tab.textureClass}`} />
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.25),transparent_35%)]" />
                  <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl transition duration-300 group-hover:scale-110 ${tab.glowClass}`} />

                  <div className="relative flex min-h-[52px] items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tab.iconClass} shadow-lg`}>
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

              </div>
            </div>

            <div className="space-y-4">
              {renderPopularSection(t('home.popular.title'), popularProducts)}
              {renderPopularSection('الباقات الأكثر مبيعاً', mostSoldPackages)}
              {renderPopularSection('البطاقات الأكثر مبيعاً', mostSoldCards)}
            </div>

            <HeroSection />
        </section>

          <aside className="lg:contents">
            <div className="hidden lg:block lg:fixed lg:top-[88px] lg:z-30 lg:h-[calc(100vh-108px)] lg:w-[352px] lg:right-[max(1.5rem,calc((100vw-1480px)/2+1.5rem))]">
              <UserSidebar desktopSticky={false} />
            </div>
          </aside>
        </div>

      </main>
      {isClient && selectedProduct && createPortal(
        <div
          className={`fixed inset-0 z-[80] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.72),rgba(2,6,23,0.88))] p-3 backdrop-blur-md transition-all duration-200 sm:p-4 ${
            isModalVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal()
            }
          }}
        >
          <div
            className={`relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-[760px] items-center justify-center transition-all duration-300 sm:max-h-[calc(100vh-2rem)] ${
              isModalVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.97] opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-3 top-3 z-20 rounded-full border border-white/10 bg-slate-950/75 p-2.5 text-slate-300 shadow-[0_12px_30px_rgba(2,6,23,0.35)] transition hover:border-cyan-400/30 hover:bg-slate-900 hover:text-white sm:right-4 sm:top-4"
              aria-label="Close product popup"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,14,26,0.98),rgba(4,10,20,0.99))] p-3 shadow-[0_30px_90px_rgba(2,6,23,0.45)] ring-1 ring-cyan-400/8 sm:max-h-[calc(100vh-2rem)] sm:rounded-[30px] sm:p-4">
              <ProductDetails product={selectedProduct} compact />
            </div>
          </div>
        </div>,
        document.body
      )}
      <Footer withRightRailOffset />
    </>
  )
}
