'use client'

import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle: string
  footer?: ReactNode
  children: ReactNode
}

export default function AuthShell({ title, subtitle, footer, children }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[8%] right-[10%] h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_20%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_minmax(0,440px)] lg:items-center">
          <section className="hidden lg:block">
            <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(160deg,rgba(10,18,33,0.96),rgba(4,10,22,0.98))] p-10 shadow-[0_28px_90px_rgba(2,6,23,0.28)]">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">BilyCard</p>
              <h1 className="mt-4 max-w-lg text-4xl font-black leading-tight text-white">
                Premium gaming storefront with a cleaner account experience.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
                Fast top-ups, clear pricing, and a streamlined flow for purchases, wallet management, and account access.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Fast</p>
                  <p className="mt-2 text-lg font-semibold text-white">Instant delivery</p>
                </div>
                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-violet-300">Secure</p>
                  <p className="mt-2 text-lg font-semibold text-white">Protected checkout</p>
                </div>
                <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Support</p>
                  <p className="mt-2 text-lg font-semibold text-white">Always available</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.97),rgba(5,10,22,1))] p-6 shadow-[0_28px_90px_rgba(2,6,23,0.32)] sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Account Access</p>
              <h2 className="mt-3 text-3xl font-black text-white">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>
            </div>

            {children}

            {footer && <div className="mt-6 border-t border-white/8 pt-5">{footer}</div>}
          </section>
        </div>
      </div>
    </main>
  )
}
