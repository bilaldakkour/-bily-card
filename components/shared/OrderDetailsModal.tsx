'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Package2,
  ReceiptText,
  Share2,
  ShieldCheck,
  UserRound,
  Wallet2,
  X,
  XCircle,
} from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/lib/utils/cn'
import { CopyButton } from '@/components/ui/CopyButton'

export interface OrderDetailsItem {
  _id: string
  orderId: string
  productName: string
  productSlug?: string
  productImage?: string
  playerId: string
  quantity?: number
  price: number
  total?: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'rejected'
  providerStatus?: string
  selectedPackageOption?: string
  notes?: string
  failureReason?: string
  createdAt: string
}

interface OrderDetailsModalProps {
  order: OrderDetailsItem | null
  open: boolean
  onClose: () => void
}

type StepState = 'done' | 'active' | 'upcoming'
type Language = 'ar' | 'en' | 'fr'

function formatDate(value: string, language: Language) {
  return new Date(value).toLocaleString(language === 'ar' ? 'ar-LB' : language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeTime(value: string, language: Language) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''

  const diffMs = time - Date.now()
  const absSeconds = Math.abs(diffMs) / 1000
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]

  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' })

  for (const [unit, secondsPerUnit] of units) {
    if (absSeconds >= secondsPerUnit || unit === 'minute') {
      return formatter.format(Math.round(diffMs / 1000 / secondsPerUnit), unit)
    }
  }

  return ''
}

function getStatusState(status: OrderDetailsItem['status']) {
  switch (status) {
    case 'completed':
      return {
        pillClass: 'border-emerald-400/28 bg-emerald-500/12 text-emerald-100',
        panelClass: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
        glowClass: 'from-emerald-400/18 via-emerald-300/6 to-transparent',
        icon: CheckCircle2,
        iconClass: 'text-emerald-300',
      }
    case 'failed':
    case 'rejected':
      return {
        pillClass: 'border-rose-300/30 bg-rose-500/12 text-rose-100',
        panelClass: 'border-rose-300/20 bg-rose-500/10 text-rose-100',
        glowClass: 'from-rose-400/18 via-rose-300/6 to-transparent',
        icon: XCircle,
        iconClass: 'text-rose-300',
      }
    case 'refunded':
      return {
        pillClass: 'border-amber-300/30 bg-amber-500/12 text-amber-100',
        panelClass: 'border-amber-300/20 bg-amber-500/10 text-amber-100',
        glowClass: 'from-amber-300/18 via-amber-200/6 to-transparent',
        icon: ShieldCheck,
        iconClass: 'text-amber-200',
      }
    default:
      return {
        pillClass: 'border-cyan-300/30 bg-cyan-500/12 text-cyan-100',
        panelClass: 'border-cyan-300/18 bg-cyan-500/10 text-cyan-100',
        glowClass: 'from-cyan-400/18 via-sky-300/6 to-transparent',
        icon: Clock3,
        iconClass: 'text-cyan-200',
      }
  }
}

function getTimelineStates(status: OrderDetailsItem['status']): [StepState, StepState, StepState] {
  if (status === 'completed' || status === 'failed' || status === 'rejected' || status === 'refunded') {
    return ['done', 'done', 'active']
  }

  return ['done', 'active', 'upcoming']
}

function getCopy(language: Language) {
  const dictionary = {
    ar: {
      title: 'تفاصيل الطلب',
      share: 'مشاركة',
      close: 'إغلاق',
      created: 'التاريخ',
      orderId: 'رقم الطلب',
      account: 'معرّف الحساب',
      package: 'الباقة',
      quantity: 'الكمية',
      total: 'الإجمالي',
      wallet: 'تفاصيل الرصيد',
      before: 'قبل',
      after: 'بعد',
      note: 'ملاحظات التنفيذ',
      provider: 'حالة التنفيذ',
      requested: 'تم الطلب',
      tracking: 'قيد المتابعة',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      refunded: 'مسترد',
      itemSnapshot: 'ملخص الطلب',
      relativeUnknown: 'الآن',
      shareSuccess: 'تم نسخ ملخص الطلب.',
      statusBand: 'الحالة الحالية',
      valueBand: 'قيمة الطلب',
      walletBand: 'الرصيد أثناء الطلب',
    },
    en: {
      title: 'Order Details',
      share: 'Share',
      close: 'Close',
      created: 'Date',
      orderId: 'Order ID',
      account: 'Account ID',
      package: 'Package',
      quantity: 'Quantity',
      total: 'Total',
      wallet: 'Wallet Snapshot',
      before: 'Before',
      after: 'After',
      note: 'Execution Notes',
      provider: 'Fulfillment',
      requested: 'Requested',
      tracking: 'Tracking',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      itemSnapshot: 'Order Snapshot',
      relativeUnknown: 'Now',
      shareSuccess: 'Order summary copied.',
      statusBand: 'Current Status',
      valueBand: 'Order Value',
      walletBand: 'Balance During Order',
    },
    fr: {
      title: 'Details de la commande',
      share: 'Partager',
      close: 'Fermer',
      created: 'Date',
      orderId: 'ID commande',
      account: 'ID compte',
      package: 'Pack',
      quantity: 'Quantite',
      total: 'Total',
      wallet: 'Resume du portefeuille',
      before: 'Avant',
      after: 'Apres',
      note: 'Notes d execution',
      provider: 'Execution',
      requested: 'Demande',
      tracking: 'En suivi',
      completed: 'Terminee',
      cancelled: 'Annulee',
      refunded: 'Remboursee',
      itemSnapshot: 'Resume de commande',
      relativeUnknown: 'Maintenant',
      shareSuccess: 'Resume de commande copie.',
      statusBand: 'Statut Actuel',
      valueBand: 'Valeur',
      walletBand: 'Solde Pendant La Commande',
    },
  } as const

  return dictionary[language]
}

function getStatusText(language: Language, status: OrderDetailsItem['status'], copy: ReturnType<typeof getCopy>) {
  if (status === 'completed') return copy.completed
  if (status === 'failed' || status === 'rejected') return copy.cancelled
  if (status === 'refunded') return copy.refunded
  return copy.tracking
}

function getStatusDescription(language: Language, status: OrderDetailsItem['status']) {
  if (status === 'completed') {
    return language === 'ar'
      ? 'اكتمل تنفيذ الطلب بنجاح ووصل إلى المرحلة الأخيرة.'
      : language === 'fr'
        ? 'La commande est terminee et a atteint la derniere etape.'
        : 'The order completed successfully and reached the final stage.'
  }

  if (status === 'failed' || status === 'rejected') {
    return language === 'ar'
      ? 'تم إلغاء الطلب أو فشل تنفيذه، لذلك ظهرت النتيجة النهائية كملغي.'
      : language === 'fr'
        ? 'La commande a ete annulee ou a echoue, la derniere etape est donc annulee.'
        : 'The order was cancelled or failed, so the final stage is marked cancelled.'
  }

  if (status === 'refunded') {
    return language === 'ar'
      ? 'تمت إعادة قيمة الطلب إلى الرصيد أو تسجيله كعملية استرداد.'
      : language === 'fr'
        ? 'La commande a ete remboursee ou retournee au portefeuille.'
        : 'The order was refunded or returned back to the wallet.'
  }

  return language === 'ar'
    ? 'تم إنشاء الطلب وهو الآن ضمن مرحلة المتابعة.'
    : language === 'fr'
      ? 'La commande a ete creee et elle est maintenant en suivi.'
      : 'The order has been created and is now in tracking.'
}

export default function OrderDetailsModal({ order, open, onClose }: OrderDetailsModalProps) {
  const { language, isRTL } = useLanguage()
  const [shareNotice, setShareNotice] = useState('')

  useEffect(() => {
    if (!shareNotice) return
    const timeout = window.setTimeout(() => setShareNotice(''), 2200)
    return () => window.clearTimeout(timeout)
  }, [shareNotice])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || !order) return null

  const copy = getCopy(language)
  const statusMeta = getStatusState(order.status)
  const timeline = getTimelineStates(order.status)
  const StatusIcon = statusMeta.icon
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const before = Number(order.walletBalanceBefore || 0).toFixed(2)
  const after = Number(order.walletBalanceAfter || 0).toFixed(2)
  const relativeTime = formatRelativeTime(order.createdAt, language) || copy.relativeUnknown
  const statusLabel = getStatusText(language, order.status, copy)
  const statusDescription = getStatusDescription(language, order.status)
  const noteText =
    order.failureReason ||
    order.notes ||
    order.providerStatus ||
    (language === 'ar'
      ? 'سيتم تحديث هذه البطاقة تلقائياً عند أي تغيير على حالة الطلب.'
      : language === 'fr'
        ? 'Cette carte sera mise a jour automatiquement a chaque changement.'
        : 'This card will update automatically when the order status changes.')

  const stepLabels = [
    copy.requested,
    copy.tracking,
    order.status === 'completed'
      ? copy.completed
      : order.status === 'failed' || order.status === 'rejected'
        ? copy.cancelled
        : order.status === 'refunded'
          ? copy.refunded
          : copy.completed,
  ]

  const progressWidth = timeline[2] === 'active' ? '100%' : '50%'
  const shareText = [
    copy.title,
    `${copy.orderId}: ${order.orderId}`,
    `${copy.itemSnapshot}: ${order.productName}`,
    `${copy.account}: ${order.playerId || '-'}`,
    `${copy.quantity}: ${order.quantity ?? 1}`,
    `${copy.total}: $${total}`,
    `${copy.provider}: ${statusLabel}`,
  ].join('\n')

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${copy.title} - ${order.orderId}`,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        setShareNotice(copy.shareSuccess)
      }
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.10),transparent_28%),rgba(2,6,23,0.86)] p-1.5 backdrop-blur-md sm:items-center sm:p-2.5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-modal-title"
      onClick={onClose}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="relative w-full max-w-[27.75rem] overflow-hidden rounded-[22px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(6,14,28,0.985),rgba(4,10,22,0.995))] shadow-[0_22px_56px_rgba(2,6,23,0.5)] ring-1 ring-white/[0.05] sm:max-w-[28.75rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b', statusMeta.glowClass)} />

        <div className="relative border-b border-white/8 px-2.5 py-2.5 sm:px-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-rose-300/25 hover:bg-rose-400/10 hover:text-white"
                aria-label={copy.close}
              >
                <X className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[11px] border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-cyan-400/25 hover:bg-cyan-500/10 hover:text-cyan-100"
                aria-label={copy.share}
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 text-right">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">{copy.itemSnapshot}</p>
              <h2 id="order-details-modal-title" className="mt-1 text-[1.02rem] font-black text-white sm:text-[1.22rem]">
                {copy.title}
              </h2>
              <p className="mt-1 text-xs text-slate-400">{relativeTime}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto px-2 py-2 sm:px-2.5 sm:py-2.5">
          <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start gap-2.5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.05] shadow-[0_12px_24px_rgba(2,6,23,0.2)] sm:h-16 sm:w-16">
                {order.productImage ? (
                  <img src={order.productImage} alt={order.productName} className="h-full w-full object-cover" />
                ) : (
                  <Package2 className="h-7 w-7 text-cyan-200" />
                )}
              </div>

              <div className="min-w-0 flex-1 text-right">
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold', statusMeta.pillClass)}>
                    {statusLabel}
                  </span>
                </div>

                <h3 className="mt-2 text-[0.95rem] font-black text-white sm:text-base">{order.productName}</h3>

                <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{copy.quantity}</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{order.quantity ?? 1}</p>
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{copy.created}</p>
                    <p className="mt-0.5 text-sm font-semibold text-white">{formatDate(order.createdAt, language)}</p>
                  </div>
                  {order.selectedPackageOption ? (
                    <div className="rounded-full border border-cyan-400/14 bg-cyan-500/[0.08] px-2.5 py-1.5 text-right">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">{copy.package}</p>
                      <p className="mt-0.5 text-sm font-semibold text-cyan-50">{order.selectedPackageOption}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-[18px] border border-white/10 bg-white/[0.03] px-2.5 py-2.5">
            <div className="relative grid grid-cols-3 gap-2.5">
              <div
                className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-[0.95rem] h-[2px] -translate-y-1/2 rounded-full bg-white/10"
                aria-hidden="true"
              >
                <span
                  className={cn(
                    'absolute inset-y-0 rounded-full bg-cyan-300/70 shadow-[0_0_18px_rgba(34,211,238,0.20)]',
                    isRTL ? 'right-0' : 'left-0'
                  )}
                  style={{ width: progressWidth }}
                />
              </div>

              {stepLabels.map((label, index) => {
                const stepState = timeline[index]
                const isDone = stepState === 'done'
                const isActive = stepState === 'active'
                const isFinalError = index === 2 && (order.status === 'failed' || order.status === 'rejected')
                const isFinalRefund = index === 2 && order.status === 'refunded'
                const circleClass = isFinalError
                  ? 'border-rose-300/30 bg-rose-500/18 text-rose-200'
                  : isFinalRefund
                    ? 'border-amber-300/30 bg-amber-500/18 text-amber-100'
                    : isDone || isActive
                      ? 'border-cyan-300/30 bg-cyan-500/16 text-cyan-100'
                      : 'border-white/10 bg-white/[0.03] text-slate-500'

                return (
                  <div key={label} className="relative text-center">
                    <div
                      className={cn(
                        'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-sm sm:h-[34px] sm:w-[34px]',
                        circleClass
                      )}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isActive ? (
                        <Clock3 className="h-4 w-4" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </div>
                    <p className={cn('mt-1.5 text-[10px] font-semibold sm:text-[11px]', isDone || isActive ? 'text-white' : 'text-slate-500')}>
                      {label}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2.5 py-2.5 text-right">
              <div className="flex items-center justify-between gap-3">
                <CopyButton value={order.orderId} label={copy.orderId} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{copy.orderId}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{order.orderId}</p>
                </div>
                <ReceiptText className="h-[18px] w-[18px] text-slate-400" />
              </div>
            </div>

            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2.5 py-2.5 text-right">
              <div className="flex items-center justify-between gap-3">
                <CopyButton value={order.playerId || ''} label={copy.account} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{copy.account}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-white">{order.playerId || '-'}</p>
                </div>
                <UserRound className="h-[18px] w-[18px] text-slate-400" />
              </div>
            </div>

            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-2.5 py-2.5 text-right">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{copy.created}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatDate(order.createdAt, language)}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeTime}</p>
                </div>
                <CalendarDays className="h-[18px] w-[18px] text-slate-400" />
              </div>
            </div>

            <div className="rounded-[16px] border border-cyan-400/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(37,99,235,0.10))] px-2.5 py-2.5 text-right">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">{copy.total}</p>
                  <p className="mt-1 text-base font-black text-white">${total}</p>
                </div>
                <CreditCard className="h-[18px] w-[18px] text-cyan-200" />
              </div>
            </div>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-2.5 text-right">
              <div className="mb-2.5 flex items-center justify-end gap-2 text-slate-200">
                <span className="text-sm font-black">{copy.note}</span>
                <ShieldCheck className="h-[18px] w-[18px] text-cyan-300" />
              </div>

              <div className="rounded-[14px] border border-white/8 bg-slate-950/40 px-2.5 py-2.5">
                <p className="text-[13px] leading-5 text-slate-200">{noteText}</p>
              </div>

              {order.providerStatus ? (
                <div className="mt-2.5 flex items-center justify-between rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm">
                  <span className="font-semibold text-white">{order.providerStatus}</span>
                  <span className="text-slate-500">{copy.provider}</span>
                </div>
              ) : null}
            </div>

            <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-2.5 text-right">
              <div className="mb-2.5 flex items-center justify-end gap-2 text-slate-200">
                <span className="text-sm font-black">{copy.walletBand}</span>
                <Wallet2 className="h-[18px] w-[18px] text-cyan-300" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{copy.before}</p>
                  <p className="mt-1.5 text-base font-bold text-white">${before}</p>
                </div>
                <div className="rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{copy.after}</p>
                  <p className="mt-1.5 text-base font-bold text-white">${after}</p>
                </div>
              </div>
            </div>
          </div>

          <div className={cn('mt-2 rounded-[16px] border px-2.5 py-2.5', statusMeta.panelClass)}>
            <div className="flex items-start justify-between gap-3">
              <StatusIcon className={cn('mt-0.5 h-5 w-5 shrink-0', statusMeta.iconClass)} />
              <div className="min-w-0 flex-1 text-right">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-current/80">{copy.statusBand}</p>
                <p className="mt-1 text-[15px] font-black">{statusLabel}</p>
                <p className="mt-1 text-[13px] leading-5 text-current/85">{statusDescription}</p>
              </div>
            </div>
          </div>

          {shareNotice ? (
            <div className="mt-2.5 rounded-[14px] border border-cyan-400/18 bg-cyan-500/10 px-3 py-2 text-right text-sm text-cyan-100">
              {shareNotice}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
