'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { CalendarDays, CreditCard, Eye, Package2, ReceiptText, Scale } from 'lucide-react'
import { MobilePanel } from './MobileDesignSystem'
import { CopyButton } from '@/components/ui/CopyButton'
import type { OrderDetailsItem } from './OrderDetailsModal'
import { useLanguage } from '@/hooks/useLanguage'

interface OrderSummaryCardProps {
  order: OrderDetailsItem
  onViewDetails?: (order: OrderDetailsItem) => void
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'border-emerald-400/24 bg-emerald-500/10 text-emerald-100'
    case 'pending':
    case 'processing':
      return 'border-cyan-400/24 bg-cyan-500/10 text-cyan-100'
    case 'failed':
    case 'rejected':
      return 'border-rose-300/24 bg-rose-500/10 text-rose-100'
    case 'refunded':
      return 'border-amber-300/24 bg-amber-500/10 text-amber-100'
    default:
      return 'border-slate-300/18 bg-slate-500/10 text-slate-200'
  }
}

function getStatusText(language: 'ar' | 'en' | 'fr', status: OrderDetailsItem['status']) {
  if (language === 'ar') {
    if (status === 'completed') return 'مكتمل'
    if (status === 'failed' || status === 'rejected') return 'ملغي'
    if (status === 'refunded') return 'مسترد'
    return 'قيد المتابعة'
  }

  if (language === 'fr') {
    if (status === 'completed') return 'Terminee'
    if (status === 'failed' || status === 'rejected') return 'Annulee'
    if (status === 'refunded') return 'Remboursee'
    return 'En suivi'
  }

  if (status === 'completed') return 'Completed'
  if (status === 'failed' || status === 'rejected') return 'Cancelled'
  if (status === 'refunded') return 'Refunded'
  return 'Tracking'
}

function formatDate(value: string, language: 'ar' | 'en' | 'fr') {
  return new Date(value).toLocaleDateString(
    language === 'ar' ? 'ar-LB' : language === 'fr' ? 'fr-FR' : 'en-US',
    {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  )
}

function getCopy(language: 'ar' | 'en' | 'fr') {
  if (language === 'ar') {
    return {
      quantity: 'الكمية',
      total: 'السعر',
      date: 'التاريخ',
      orderId: 'رقم الطلب',
      view: 'عرض التفاصيل',
    }
  }

  if (language === 'fr') {
    return {
      quantity: 'Quantite',
      total: 'Prix',
      date: 'Date',
      orderId: 'ID commande',
      view: 'Voir details',
    }
  }

  return {
    quantity: 'Qty',
    total: 'Price',
    date: 'Date',
    orderId: 'Order ID',
    view: 'View Details',
  }
}

function MiniStat({
  icon,
  label,
  value,
  accent = false,
  trailing,
}: {
  icon: ReactNode
  label: string
  value: string
  accent?: boolean
  trailing?: ReactNode
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-[14px] border border-cyan-400/16 bg-cyan-500/10 px-2.5 py-2 text-right'
          : 'rounded-[14px] border border-white/10 bg-white/[0.04] px-2.5 py-2 text-right'
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-200">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[10px] uppercase tracking-[0.16em] ${accent ? 'text-cyan-300' : 'text-slate-500'}`}>
            {label}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            {trailing}
            <p className={`truncate text-xs font-semibold sm:text-sm ${accent ? 'text-cyan-50' : 'text-white'}`}>
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrderSummaryCard({ order, onViewDetails }: OrderSummaryCardProps) {
  const { language, isRTL } = useLanguage()
  const copy = getCopy(language)
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const statusText = getStatusText(language, order.status)
  const isInteractive = Boolean(onViewDetails)

  const handleOpenDetails = () => {
    if (!onViewDetails) return
    onViewDetails(order)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isInteractive) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    handleOpenDetails()
  }

  return (
    <MobilePanel
      className={`overflow-hidden p-0 transition hover:border-cyan-300/18 hover:bg-[linear-gradient(180deg,rgba(10,20,36,0.98),rgba(7,15,28,0.98))] ${
        isInteractive ? 'cursor-pointer' : ''
      }`}
      tone="default"
    >
      <article
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`relative ${isInteractive ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/55 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950' : ''}`}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? handleOpenDetails : undefined}
        onKeyDown={isInteractive ? handleKeyDown : undefined}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />

        <div className="flex flex-col gap-2.5 px-2.5 py-2.5 sm:px-3 md:grid md:grid-cols-[minmax(0,1fr)_10.25rem_minmax(0,1fr)] md:items-center">
          <section className="min-w-0 text-right">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {statusText}
                  </span>
                  <h3 className="min-w-0 truncate text-sm font-bold text-white">
                    {order.productName}
                  </h3>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
                    <CalendarDays className="h-3.5 w-3.5 text-cyan-300" />
                    {formatDate(order.createdAt, language)}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
                    <ReceiptText className="h-3.5 w-3.5 text-cyan-300" />
                    <span className="truncate">{order.orderId}</span>
                    <CopyButton
                      value={order.orderId}
                      label={`Copy ${copy.orderId}`}
                      className="h-5 w-5 border-transparent bg-transparent text-cyan-200 hover:border-cyan-400/20 hover:bg-cyan-500/10"
                    />
                  </span>
                </div>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-cyan-400/16 bg-cyan-500/10 text-cyan-200 shadow-[0_10px_20px_rgba(2,6,23,0.16)] sm:h-11 sm:w-11">
                {order.productImage ? (
                  <img src={order.productImage} alt={order.productName} className="h-full w-full object-cover" />
                ) : (
                  <Package2 className="h-5 w-5" />
                )}
              </div>
            </div>
          </section>

          <div className="order-3 flex md:order-none md:justify-center">
            {onViewDetails ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  handleOpenDetails()
                }}
                className="inline-flex min-h-[2.7rem] w-full items-center justify-center gap-1.5 rounded-[14px] border border-cyan-300/24 bg-[linear-gradient(135deg,rgba(34,211,238,0.96),rgba(37,99,235,0.98))] px-3 py-2 text-xs font-black text-white shadow-[0_12px_22px_rgba(14,165,233,0.2)] transition hover:brightness-110 md:w-[10.25rem] md:text-sm"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span>{copy.view}</span>
              </button>
            ) : (
              <div className="inline-flex min-h-[2.7rem] w-full items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 md:w-[10.25rem]">
                {statusText}
              </div>
            )}
          </div>

          <section className="order-2 grid grid-cols-2 gap-2 md:order-none">
            <MiniStat
              icon={<Scale className="h-4 w-4" />}
              label={copy.quantity}
              value={String(order.quantity ?? 1)}
            />
            <MiniStat
              icon={<CreditCard className="h-4 w-4" />}
              label={copy.total}
              value={`$${total}`}
              accent
            />
          </section>
        </div>
      </article>
    </MobilePanel>
  )
}
