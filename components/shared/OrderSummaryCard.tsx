'use client'

import { CalendarDays, CreditCard, Eye, Package2, ReceiptText, UserRound, Wallet2 } from 'lucide-react'
import { MobilePanel, MobileMetricTile } from './MobileDesignSystem'
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
  return new Date(value).toLocaleDateString(language === 'ar' ? 'ar-LB' : language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrderSummaryCard({ order, onViewDetails }: OrderSummaryCardProps) {
  const { language } = useLanguage()
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const before = Number(order.walletBalanceBefore || 0).toFixed(2)
  const after = Number(order.walletBalanceAfter || 0).toFixed(2)
  const viewDetailsLabel =
    language === 'ar' ? 'عرض التفاصيل' : language === 'fr' ? 'Voir les details' : 'View Details'
  const quantityLabel = language === 'ar' ? 'الكمية' : language === 'fr' ? 'Quantite' : 'Quantity'
  const totalLabel = language === 'ar' ? 'الإجمالي' : language === 'fr' ? 'Total' : 'Total'
  const walletLabel =
    language === 'ar' ? 'تفاصيل الرصيد' : language === 'fr' ? 'Resume du portefeuille' : 'Wallet Snapshot'
  const beforeLabel = language === 'ar' ? 'قبل' : language === 'fr' ? 'Avant' : 'Before'
  const afterLabel = language === 'ar' ? 'بعد' : language === 'fr' ? 'Apres' : 'After'
  const valueLabel = language === 'ar' ? 'قيمة الطلب' : language === 'fr' ? 'Valeur' : 'Order Value'
  const statusText = getStatusText(language, order.status)

  return (
    <MobilePanel className="p-0" tone="default">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 text-cyan-200">
            {order.productImage ? (
              <img src={order.productImage} alt={order.productName} className="h-full w-full object-cover" />
            ) : (
              <Package2 className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusColor(order.status)}`}>
                {statusText}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-cyan-200">
                <ReceiptText className="h-3.5 w-3.5" />
                {order.orderId}
                <CopyButton
                  value={order.orderId}
                  label="Copy order ID"
                  className="h-6 w-6 border-transparent bg-transparent text-cyan-200 hover:border-cyan-400/20 hover:bg-cyan-500/10"
                />
              </span>
            </div>

            <h3 className="line-clamp-2 text-base font-bold text-white sm:text-lg">{order.productName}</h3>

            <div className="mt-2 flex flex-col gap-1.5 text-sm text-slate-400">
              <span className="inline-flex items-center justify-end gap-1.5">
                <UserRound className="h-4 w-4 text-cyan-300" />
                {order.playerId || '-'}
                {order.playerId ? (
                  <CopyButton
                    value={order.playerId}
                    label="Copy player ID"
                    className="h-6 w-6 border-transparent bg-transparent text-slate-300 hover:border-cyan-400/20 hover:bg-cyan-500/10 hover:text-cyan-200"
                  />
                ) : null}
              </span>
              <span className="inline-flex items-center justify-end gap-1.5">
                <CalendarDays className="h-4 w-4 text-amber-300" />
                {formatDate(order.createdAt, language)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-2 gap-2.5">
          <MobileMetricTile label={quantityLabel} value={String(order.quantity ?? 1)} />
          <MobileMetricTile label={totalLabel} value={<span className="text-cyan-200">${total}</span>} />
        </div>

        <MobilePanel tone="soft" className="rounded-[20px] p-3.5">
          <div className="mb-2 flex items-center justify-end gap-2 text-slate-300">
            <Wallet2 className="h-4 w-4 text-cyan-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{walletLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{beforeLabel}</p>
              <p className="mt-1 text-sm font-semibold text-white">${before}</p>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{afterLabel}</p>
              <p className="mt-1 text-sm font-semibold text-white">${after}</p>
            </div>
          </div>
        </MobilePanel>

        <div className="rounded-[20px] border border-cyan-400/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(37,99,235,0.12))] px-4 py-3.5 text-right">
          <div className="mb-2 flex items-center justify-end gap-1.5 text-cyan-200">
            <CreditCard className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">{valueLabel}</span>
          </div>
          <p className="text-2xl font-black text-white">${total}</p>
        </div>
      </div>

      {onViewDetails ? (
        <div className="border-t border-white/8 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => onViewDetails(order)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-cyan-400/18 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/28 hover:bg-cyan-500/14"
          >
            <Eye className="h-[18px] w-[18px]" />
            {viewDetailsLabel}
          </button>
        </div>
      ) : null}
    </MobilePanel>
  )
}
