import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

const panelToneClasses = {
  default:
    'border-[#3a7bff]/20 bg-[linear-gradient(180deg,rgba(8,18,34,0.97),rgba(6,13,26,0.985))] shadow-[0_18px_52px_rgba(2,6,23,0.26)] ring-1 ring-white/[0.03]',
  soft:
    'border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.96),rgba(16,22,38,0.96))] shadow-[0_16px_44px_rgba(2,6,23,0.22)] ring-1 ring-white/[0.025]',
  accent:
    'border-[#d4a940]/20 bg-[linear-gradient(180deg,rgba(7,28,48,0.96),rgba(5,16,31,0.98))] shadow-[0_20px_56px_rgba(6,28,45,0.28)] ring-1 ring-[#9b78ff]/12',
  success:
    'border-emerald-400/16 bg-[linear-gradient(180deg,rgba(8,34,32,0.96),rgba(7,20,23,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.24)] ring-1 ring-emerald-300/8',
  danger:
    'border-rose-300/14 bg-[linear-gradient(180deg,rgba(34,16,28,0.96),rgba(20,14,24,0.98))] shadow-[0_24px_70px_rgba(2,6,23,0.24)] ring-1 ring-rose-200/8',
} as const

export const mobileInputClass =
  'w-full rounded-[16px] border border-white/10 bg-white/[0.045] px-3.5 py-2 text-sm text-white placeholder-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus:border-[#d4a940]/45 focus:bg-white/[0.055] focus:outline-none'

export const mobilePrimaryButtonClass =
  'inline-flex items-center justify-center rounded-[16px] bg-[linear-gradient(90deg,#2e5bff,#7e57ff,#d4a940)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(46,91,255,0.24)] transition hover:brightness-110'

export const mobileSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-[18px] border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]'

export const mobileChipClass =
  'inline-flex items-center rounded-full border border-[#d4a940]/30 bg-[linear-gradient(90deg,rgba(46,91,255,0.22),rgba(126,87,255,0.16),rgba(212,169,64,0.2))] px-2.5 py-1 text-[11px] font-semibold text-[#f7dc99]'

export function MobilePageBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,rgba(46,91,255,0.2),transparent_62%)] blur-2xl" />
      <div className="absolute -left-12 top-24 h-36 w-36 rounded-full bg-[#7e57ff]/10 blur-3xl" />
      <div className="absolute -right-10 top-28 h-36 w-36 rounded-full bg-[#d4a940]/12 blur-3xl" />
      <div className="absolute bottom-14 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-[#3a7bff]/8 blur-3xl" />
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
        'relative overflow-hidden rounded-[22px] p-2.5 backdrop-blur-xl sm:p-3',
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
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <div className="min-w-0 text-right">
        {eyebrow ? (
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f3c96b]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-0.5 text-lg font-black leading-tight text-white sm:text-[1.1rem]">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-5 text-slate-400 sm:text-sm">{description}</p> : null}
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
        'rounded-[20px] border border-white/10 bg-white/[0.04] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        'rounded-[20px] border border-white/10 bg-white/[0.04] px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
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
    <MobilePanel className={cn('px-3.5 py-5 text-center', className)} tone="soft">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </MobilePanel>
  )
}
