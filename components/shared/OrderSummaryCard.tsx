'use client'

import { CalendarDays, CreditCard, Package2, ReceiptText, UserRound, Wallet2 } from 'lucide-react'
import { MobilePanel, MobileMetricTile } from './MobileDesignSystem'
import { CopyButton } from '@/components/ui/CopyButton'

interface OrderSummaryCardProps {
  order: {
    _id: string
    orderId: string
    productName: string
    playerId: string
    quantity?: number
    price: number
    total?: number
    walletBalanceBefore?: number
    walletBalanceAfter?: number
    status: string
    createdAt: string
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'border-emerald-400/22 bg-emerald-500/12 text-emerald-200'
    case 'pending':
      return 'border-amber-400/22 bg-amber-500/12 text-amber-200'
    case 'processing':
      return 'border-sky-400/22 bg-sky-500/12 text-sky-200'
    case 'failed':
    case 'rejected':
      return 'border-rose-300/22 bg-rose-500/12 text-rose-200'
    case 'refunded':
      return 'border-slate-300/18 bg-slate-500/12 text-slate-200'
    default:
      return 'border-slate-300/18 bg-slate-500/12 text-slate-200'
  }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const before = Number(order.walletBalanceBefore || 0).toFixed(2)
  const after = Number(order.walletBalanceAfter || 0).toFixed(2)

  return (
    <MobilePanel className="p-0" tone="default">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-cyan-400/16 bg-cyan-500/10 text-cyan-200">
            <Package2 className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusColor(order.status)}`}>
                {order.status}
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
                {formatDate(order.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 px-4 py-4 sm:px-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-2 gap-2.5">
          <MobileMetricTile label="Quantity" value={String(order.quantity ?? 1)} />
          <MobileMetricTile label="Total" value={<span className="text-cyan-200">${total}</span>} />
        </div>

        <MobilePanel tone="soft" className="rounded-[20px] p-3.5">
          <div className="mb-2 flex items-center justify-end gap-2 text-slate-300">
            <Wallet2 className="h-4 w-4 text-cyan-300" />
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Wallet Snapshot</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Before</p>
              <p className="mt-1 text-sm font-semibold text-white">${before}</p>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">After</p>
              <p className="mt-1 text-sm font-semibold text-white">${after}</p>
            </div>
          </div>
        </MobilePanel>

        <div className="rounded-[20px] border border-cyan-400/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(37,99,235,0.12))] px-4 py-3.5 text-right">
          <div className="mb-2 flex items-center justify-end gap-1.5 text-cyan-200">
            <CreditCard className="h-4 w-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em]">Order Value</span>
          </div>
          <p className="text-2xl font-black text-white">${total}</p>
        </div>
      </div>
    </MobilePanel>
  )
}
