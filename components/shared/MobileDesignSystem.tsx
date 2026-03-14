import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

const panelToneClasses = {
  default:
    'border-cyan-400/12 bg-[linear-gradient(180deg,rgba(8,18,34,0.96),rgba(6,13,26,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.24)] ring-1 ring-white/[0.03]',
  soft:
    'border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.94),rgba(16,22,38,0.94))] shadow-[0_20px_56px_rgba(2,6,23,0.22)] ring-1 ring-white/[0.025]',
  accent:
    'border-cyan-400/16 bg-[linear-gradient(180deg,rgba(7,28,48,0.96),rgba(5,16,31,0.98))] shadow-[0_24px_70px_rgba(6,28,45,0.26)] ring-1 ring-cyan-300/10',
  success:
    'border-emerald-400/16 bg-[linear-gradient(180deg,rgba(8,34,32,0.96),rgba(7,20,23,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.24)] ring-1 ring-emerald-300/8',
  danger:
    'border-rose-300/14 bg-[linear-gradient(180deg,rgba(34,16,28,0.96),rgba(20,14,24,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.24)] ring-1 ring-rose-200/8',
} as const

export const mobileInputClass =
  'w-full rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus:border-cyan-400/45 focus:bg-white/[0.055] focus:outline-none'

export const mobilePrimaryButtonClass =
  'inline-flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(34,211,238,0.96),rgba(37,99,235,0.98))] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(14,165,233,0.24)] transition hover:brightness-110'

export const mobileSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-[18px] border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]'

export const mobileChipClass =
  'inline-flex items-center rounded-full border border-cyan-400/18 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200'

export function MobilePageBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_62%)] blur-2xl" />
      <div className="absolute -left-12 top-24 h-40 w-40 rounded-full bg-cyan-500/8 blur-3xl" />
      <div className="absolute -right-10 top-32 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-400/6 blur-3xl" />
    </div>
  )
}

export function MobilePanel({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: keyof typeof panelToneClasses
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[26px] p-4 backdrop-blur-xl sm:p-5',
        panelToneClasses[tone],
        className
      )}
    >
      {children}
    </div>
  )
}

export function MobileSectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0 text-right">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-black leading-tight text-white">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function MobileMetricTile({
  label,
  value,
  hint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-white/10 bg-white/[0.04] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-1.5 text-lg font-bold text-white">{value}</div>
      {hint ? <div className="mt-1.5 text-xs text-slate-400">{hint}</div> : null}
    </div>
  )
}

export function MobileEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <MobilePanel className={cn('px-5 py-8 text-center', className)} tone="soft">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </MobilePanel>
  )
}
