'use client'

import { CalendarDays, CreditCard, Package2, ReceiptText, UserRound, Wallet2 } from 'lucide-react'

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
      return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
    case 'pending':
      return 'border-amber-400/25 bg-amber-500/10 text-amber-300'
    case 'processing':
      return 'border-sky-400/25 bg-sky-500/10 text-sky-300'
    case 'failed':
    case 'rejected':
      return 'border-red-400/25 bg-red-500/10 text-red-300'
    case 'refunded':
      return 'border-slate-400/20 bg-slate-500/10 text-slate-300'
    default:
      return 'border-slate-400/20 bg-slate-500/10 text-slate-300'
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

function InfoCell({
  label,
  value,
  accent = 'text-white',
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-[0.92rem] font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

export default function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const total = Number(order.total ?? order.price ?? 0).toFixed(2)
  const before = Number(order.walletBalanceBefore || 0).toFixed(2)
  const after = Number(order.walletBalanceAfter || 0).toFixed(2)

  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,19,35,0.98),rgba(6,11,24,0.99))] shadow-[0_18px_48px_rgba(2,6,23,0.18)] transition-colors hover:border-cyan-400/20">
      <div className="px-5 py-4">
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2.9fr)_minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(0,1.45fr)_152px] xl:items-center">
          <div className="min-w-0">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-cyan-400/15 bg-cyan-500/10 text-cyan-300">
                <Package2 className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2.5">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
                    <ReceiptText className="h-4 w-4" />
                    {order.orderId}
                  </span>
                </div>

                <p className="truncate text-[1.05rem] font-semibold text-white">{order.productName}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.95rem] text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-4 w-4 text-cyan-300" />
                    {order.playerId || '-'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-amber-300" />
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 md:grid-cols-3 xl:grid-cols-2 xl:border-0 xl:bg-transparent xl:p-0">
            <InfoCell label="Quantity" value={String(order.quantity ?? 1)} />
            <InfoCell label="Total" value={`$${total}`} accent="text-cyan-300" />
            <InfoCell label="Status" value={order.status} accent="text-slate-200" />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 xl:border-0 xl:bg-transparent xl:p-0">
            <InfoCell label="Account" value={order.playerId || '-'} />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 xl:border-0 xl:bg-transparent xl:p-0">
            <div className="mb-2 flex items-center gap-2">
              <Wallet2 className="h-4 w-4 text-cyan-300" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Wallet Snapshot</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-slate-900/70 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Before</p>
                <p className="mt-1 text-[0.92rem] font-semibold text-white">${before}</p>
              </div>
              <div className="rounded-xl bg-slate-900/70 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">After</p>
                <p className="mt-1 text-[0.92rem] font-semibold text-white">${after}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-500/10 px-3.5 py-3 text-right">
              <div className="mb-1.5 flex items-center justify-end gap-1.5 text-emerald-300">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Total</span>
              </div>
              <p className="text-[1.35rem] font-bold text-white">${total}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
