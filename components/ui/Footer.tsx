'use client'

import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'

type FooterProps = {
  withRightRailOffset?: boolean
}

export default function Footer({ withRightRailOffset = false }: FooterProps) {
  return (
    <footer className="relative mt-14 overflow-hidden border-t border-white/10 bg-[linear-gradient(180deg,rgba(3,10,23,0.98),rgba(2,8,18,1))] py-10 sm:py-12">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div
        className={`relative mx-auto px-4 sm:px-6 ${
          withRightRailOffset ? 'max-w-[1480px] lg:pr-[392px]' : 'max-w-7xl'
        }`}
      >
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center shadow-[0_22px_56px_rgba(2,6,23,0.26)] sm:px-8 sm:py-9">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl border border-cyan-400/18 bg-cyan-500/8 px-3.5 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-500/12">
              <Gamepad2 className="h-5 w-5 text-cyan-200" />
            </span>
            <div className="text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">BILY CARD</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Digital Storefront</p>
            </div>
          </div>

          <h2 className="mt-4 text-xl font-black text-white sm:text-2xl">Bily Card</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Bily Card هي منصة رقمية احترافية متخصصة في توفير المنتجات الرقمية، شحن الألعاب، والخدمات الإلكترونية بسرعة وموثوقية عالية.
          </p>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            تجربة رقمية احترافية لشحن الألعاب والمنتجات والخدمات الإلكترونية بسرعة وموثوقية.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold">
            <Link href="/about" className="text-slate-300 transition hover:text-cyan-200">
              من نحن
            </Link>
            <Link href="/privacy-policy" className="text-slate-300 transition hover:text-cyan-200">
              سياسة الخصوصية
            </Link>
            <Link href="/terms" className="text-slate-300 transition hover:text-cyan-200">
              شروط الخدمة
            </Link>
            <Link href="/contact" className="text-slate-300 transition hover:text-cyan-200">
              اتصل بنا
            </Link>
          </div>
        </div>

        <div className="mt-7 border-t border-white/10 pt-5 text-center">
          <p className="text-sm text-slate-400">© 2026 Bily Card. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
