'use client'

import { usePathname } from 'next/navigation'
import TopPromoCarousel from '@/components/ui/TopPromoCarousel'

export default function GlobalShowcaseStrip() {
  const pathname = usePathname()

  const hiddenPaths = ['/admin', '/login', '/register', '/verify-email']
  const shouldHide = hiddenPaths.some((path) => pathname?.startsWith(path))

  if (!pathname || pathname === '/' || shouldHide) {
    return null
  }

  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pt-4 lg:pr-24" dir="rtl">
      <TopPromoCarousel compact />
    </section>
  )
}
