'use client'

import type { ComponentType, ReactNode } from 'react'
import { CalendarDays, CreditCard, Eye, Package2, ReceiptText, Scale, Tag } from 'lucide-react'
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
      return 'border-emerald-400/22 bg-emerald-500/12 text-emerald-100'
    case 'pending':
    case 'processing':
      return 'border-cyan-400/22 bg-cyan-500/12 text-cyan-100'
    case 'failed':
    case 'rejected':
      return 'border-rose-300/22 bg-rose-500/12 text-rose-100'
    case 'refunded':
      return 'border-amber-300/22 bg-amber-500/12 text-amber-100'
    default:
      return 'border-slate-300/18 bg-slate-500/12 text-slate-200'
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
      view: 'التفاصيل',
    }
  }

  if (language === 'fr') {
    return {
      quantity: 'Quantite',
      total: 'Prix',
      date: 'Date',
      orderId: 'ID commande',
      view: 'Details',
    }
  }

  return {
    quantity: 'Qty',
    total: 'Price',
    date: 'Date',
    orderId: 'Order ID',
    view: 'Details',
  }
}

function MetaChip({
  icon,
  label,
  value,
  accent = false,
  trailing,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
  trailing?: ReactNode
}) {
  const Icon = icon

  return (
    <span
      className={
        accent
          ? 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-400/16 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] text-cyan-100'
          : 'inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-slate-300'
      }
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[7.5rem] truncate font-semibold text-white">{value}</span>
      {trailing}
    </span>
  )
}

export default function OrderSummaryCard({ order, onViewDetails }: OrderSummaryCardProps) {
  const { language } = useLanguage()
  const copy = getCopy(language)
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const statusText = getStatusText(language, order.status)

  return (
    <MobilePanel className="overflow-hidden p-0" tone="default">
      <div className="flex items-center gap-3 px-3 py-3.5 sm:px-4">
        <div className="min-w-0 flex-1 text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusColor(order.status)}`}
            >
              {statusText}
            </span>
            <h3 className="min-w-0 truncate text-[15px] font-bold text-white sm:text-base">{order.productName}</h3>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
            <MetaChip
              icon={Scale}
              label={copy.quantity}
              value={String(order.quantity ?? 1)}
            />
            <MetaChip
              icon={CreditCard}
              label={copy.total}
              value={`$${total}`}
              accent
            />
            <MetaChip
              icon={ReceiptText}
              label={copy.orderId}
              value={order.orderId}
              trailing={
                <CopyButton
                  value={order.orderId}
                  label={`Copy ${copy.orderId}`}
                  className="h-5 w-5 border-transparent bg-transparent text-cyan-200 hover:border-cyan-400/20 hover:bg-cyan-500/10"
                />
              }
            />
            <MetaChip
              icon={CalendarDays}
              label={copy.date}
              value={formatDate(order.createdAt, language)}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border border-cyan-400/16 bg-cyan-500/10 text-cyan-200 sm:h-14 sm:w-14">
            {order.productImage ? (
              <img src={order.productImage} alt={order.productName} className="h-full w-full object-cover" />
            ) : (
              <Package2 className="h-5 w-5" />
            )}
          </div>

          {onViewDetails ? (
            <button
              type="button"
              onClick={() => onViewDetails(order)}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/18 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-400/28 hover:bg-cyan-500/14"
            >
              <Eye className="h-3.5 w-3.5" />
              {copy.view}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-slate-300">
              <Tag className="h-3.5 w-3.5" />
              {statusText}
            </span>
          )}
        </div>
      </div>
    </MobilePanel>
  )
}
