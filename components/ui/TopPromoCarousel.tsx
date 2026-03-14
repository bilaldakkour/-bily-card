'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { bilycardProducts } from '@/lib/data/bilycardProducts'
import {
  MessageCircle,
  AppWindow,
  Gamepad2,
  WalletCards,
  Ticket,
  TrendingUp,
  Gift,
  Smartphone,
  Crown,
  ShieldCheck,
} from 'lucide-react'

type TopPromoCarouselProps = {
  compact?: boolean
  showQuickTabs?: boolean
}

export default function TopPromoCarousel({
  compact = false,
  showQuickTabs = true,
}: TopPromoCarouselProps) {
  const slides = useMemo(() => {
    const productSlides = bilycardProducts
      .map((product) => String(product.image || '').trim())
      .filter(Boolean)

    const uniqueSlides = Array.from(new Set(productSlides)).slice(0, 6)

    if (uniqueSlides.length > 0) {
      return uniqueSlides
    }

    return [
      '/games/pubg.jpg',
      '/games/playstation.jpg',
      '/games/free-fire.jpg',
      '/games/steam.jpg',
      '/games/tiktok.jpg',
    ]
  }, [])

  const [slideIndex, setSlideIndex] = useState(0)
  const wheelLockRef = useRef(false)
  const touchStartXRef = useRef<number | null>(null)
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(timer)
  }, [slides.length])

  const goToNextSlide = () => {
    setSlideIndex((prev) => (prev + 1) % slides.length)
  }

  const goToPrevSlide = () => {
    setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    if (wheelLockRef.current) return

    const dominantDelta =
      Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX

    if (Math.abs(dominantDelta) < 8) return

    wheelLockRef.current = true

    if (dominantDelta > 0) {
      goToNextSlide()
    } else {
      goToPrevSlide()
    }

    window.setTimeout(() => {
      wheelLockRef.current = false
    }, 550)
  }

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    touchStartXRef.current = touch.clientX
    touchStartYRef.current = touch.clientY
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current
    const startY = touchStartYRef.current
    const touch = event.changedTouches[0]

    if (startX === null || startY === null) return

    const deltaX = touch.clientX - startX
    const deltaY = touch.clientY - startY

    touchStartXRef.current = null
    touchStartYRef.current = null

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return

    if (deltaX < 0) {
      goToNextSlide()
    } else {
      goToPrevSlide()
    }
  }

  const quickTabs = [
    { key: 'best-selling', label: 'الأكثر مبيعاً', href: '/products?sort=popular', icon: TrendingUp, colorClass: 'text-amber-300 border-amber-400/40 bg-amber-500/10' },
    { key: 'cards', label: 'البطاقات', href: '/products?category=cards', icon: Gift, colorClass: 'text-sky-300 border-sky-400/40 bg-sky-500/10' },
    { key: 'applications', label: 'التطبيقات', href: '/products?category=applications', icon: AppWindow, colorClass: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' },
    { key: 'games', label: 'الألعاب', href: '/products?category=games', icon: Gamepad2, colorClass: 'text-violet-300 border-violet-400/40 bg-violet-500/10' },
    { key: 'wallets', label: 'المحافظ', href: '/products?category=wallets', icon: WalletCards, colorClass: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10' },
    { key: 'balance', label: 'الرصيد', href: '/products?category=balance', icon: Smartphone, colorClass: 'text-lime-300 border-lime-400/40 bg-lime-500/10' },
    { key: 'accounts', label: 'الاشتراكات', href: '/products?category=accounts-subscriptions', icon: Crown, colorClass: 'text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-500/10' },
    { key: 'redemption', label: 'الكوبونات', href: '/products?category=redemption-coupons', icon: Ticket, colorClass: 'text-rose-300 border-rose-400/40 bg-rose-500/10' },
    { key: 'secure', label: 'الدفع الآمن', href: '/wallet', icon: ShieldCheck, colorClass: 'text-blue-300 border-blue-400/40 bg-blue-500/10' },
    { key: 'support', label: 'الدعم', href: 'https://wa.me/96171985887', icon: MessageCircle, colorClass: 'text-teal-300 border-teal-400/40 bg-teal-500/10' },
  ]

  return (
    <div className="space-y-4" dir="rtl">
      <div
        className="mx-auto w-full overflow-hidden rounded-[28px] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(5,15,30,0.96),rgba(8,24,45,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.42)]"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative w-full ${compact ? 'h-[190px] md:h-[230px]' : 'h-[210px] sm:h-[250px] md:h-[300px] lg:h-[328px]'}`}>
          {slides.map((slide, idx) => (
            <Image
              key={slide}
              src={slide}
              alt="Promo"
              fill
              className={`object-cover transition-opacity duration-1000 ${idx === slideIndex ? 'opacity-100' : 'opacity-0'}`}
              priority={idx === 0}
            />
          ))}

          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.64)_38%,rgba(2,6,23,0.18)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.12),transparent_26%)]" />

          <div className={`absolute inset-x-0 bottom-0 ${compact ? 'p-4 md:p-5' : 'p-4 md:p-6 lg:p-7'}`}>
            <span className="inline-flex items-center rounded-full border border-cyan-300/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100">
              BilyCard Premium Banner
            </span>
            <h2 className={`mt-3 max-w-2xl font-extrabold leading-tight text-white ${compact ? 'text-xl md:text-3xl' : 'text-2xl sm:text-3xl md:text-[2.5rem] lg:text-[2.8rem]'}`}>
              Instant Gaming Top-Ups
              <span className="block bg-gradient-to-r from-cyan-300 to-sky-400 bg-clip-text text-transparent">
                Built For Fast Play
              </span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-200 md:text-[15px]">
              Premium recharge experience with modern visuals, secure payments, and instant delivery.
            </p>

            {!compact ? (
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-1 rounded-2xl border border-cyan-400/35 bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30"
              >
                Browse Products
              </Link>
            ) : null}
          </div>

          <div className="absolute bottom-4 left-4 flex items-center gap-2 md:bottom-6 md:left-6">
            {slides.map((slide, idx) => (
              <span
                key={`${slide}-${idx}`}
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  idx === slideIndex ? 'w-8 bg-cyan-300' : 'w-2.5 bg-white/35'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {showQuickTabs ? (
        <div className="mx-auto w-full rounded-[24px] border border-white/10 bg-slate-950/60 p-3">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {quickTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <Link key={tab.key} href={tab.href} className="group flex flex-col items-center gap-1 text-center">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border transition group-hover:scale-105 ${tab.colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium text-slate-200">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
