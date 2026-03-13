"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  CreditCard,
  Package2,
  ReceiptText,
  UserRound,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import UserSidebar from '@/components/shared/UserSidebar'

interface OrderItem {
  _id: string
  orderId: string
  productName: string
  playerId: string
  quantity: number
  price: number
  total: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'rejected'
  createdAt: string
}

export default function MyOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')

    if (!token) {
      router.push('/login')
      return
    }

    fetch('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) {
          setOrders(data.data)
        }
      })
      .catch(() => {
        setOrders([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const getStatusColor = (status: OrderItem['status']) => {
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

  const completedOrders = orders.filter((order) => order.status === 'completed').length

  return (
    <div className="min-h-screen">
      <PageHeader
        title="My Orders"
        subtitle="Track and review your recent purchases in one place."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'My Orders', href: '/my-orders' },
        ]}
      />

      <div className="mx-auto max-w-[1480px] px-4 py-8 sm:px-5 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="min-w-0 space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.22)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                    Purchase History
                  </p>
                  <h2 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">Recent Orders</h2>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    Every order is laid out in a clearer, easier-to-scan card.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:min-w-[240px]">
                  <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-3.5 py-2.5">
                    <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Orders</p>
                    <p className="mt-1 text-xl font-bold text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3.5 py-2.5">
                    <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Completed</p>
                    <p className="mt-1 text-xl font-bold text-white">{completedOrders}</p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-10 text-center shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
                <p className="text-slate-300">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-10 text-center shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
                <h2 className="mb-4 text-2xl font-semibold text-white">
                  No orders found yet
                </h2>

                <p className="mb-6 text-slate-400">
                  When you purchase a product, your orders will appear here.
                </p>

                <Link
                  href="/products"
                  className="inline-block rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black transition-colors hover:bg-cyan-400"
                >
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <article
                    key={order._id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,19,35,0.96),rgba(6,11,24,0.98))] p-4 shadow-[0_20px_56px_rgba(2,6,23,0.2)] sm:p-5"
                  >
                    <div className="flex flex-col gap-3 border-b border-white/8 pb-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2 text-cyan-300">
                          <ReceiptText className="h-3.5 w-3.5" />
                          <span className="text-xs font-black uppercase tracking-[0.18em]">Order Overview</span>
                        </div>

                        <div className="flex flex-wrap items-start gap-2.5">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Order ID</p>
                            <p className="mt-1 inline-flex max-w-full rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-[11px] text-cyan-300">
                              {order.orderId}
                            </p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Product</p>
                            <p className="mt-1 text-base font-semibold text-white sm:text-lg">{order.productName}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize sm:text-sm ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3.5 py-2.5 text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">Total</p>
                          <p className="mt-1 text-lg font-bold text-white sm:text-xl">${Number(order.total || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2.5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
                        <div className="mb-1.5 flex items-center gap-2 text-slate-300">
                          <UserRound className="h-3.5 w-3.5 text-cyan-300" />
                          <p className="text-sm font-semibold">Player / Account</p>
                        </div>
                        <p className="break-words font-mono text-[13px] text-white sm:text-sm">{order.playerId || '-'}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
                        <div className="mb-1.5 flex items-center gap-2 text-slate-300">
                          <Package2 className="h-3.5 w-3.5 text-violet-300" />
                          <p className="text-sm font-semibold">Order Details</p>
                        </div>
                        <div className="space-y-1.5 text-[13px] sm:text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Quantity</span>
                            <span className="font-semibold text-white">{order.quantity}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Unit Price</span>
                            <span className="font-semibold text-white">${Number(order.price || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">Total</span>
                            <span className="font-semibold text-cyan-300">${Number(order.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3.5">
                        <div className="mb-1.5 flex items-center gap-2 text-slate-300">
                          <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
                          <p className="text-sm font-semibold">Date & Time</p>
                        </div>
                        <p className="text-[13px] text-white sm:text-sm">{formatDate(order.createdAt)}</p>
                      </div>

                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3.5 sm:col-span-2 xl:col-span-3">
                        <div className="mb-2 flex items-center gap-2 text-slate-300">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-300" />
                          <p className="text-sm font-semibold">Wallet Snapshot</p>
                        </div>

                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-900/60 px-3.5 py-2.5">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Before</p>
                            <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                              ${Number(order.walletBalanceBefore || 0).toFixed(2)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-900/60 px-3.5 py-2.5">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">After</p>
                            <p className="mt-1 text-sm font-semibold text-white sm:text-base">
                              ${Number(order.walletBalanceAfter || 0).toFixed(2)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-900/60 px-3.5 py-2.5">
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Change</p>
                            <p className="mt-1 text-sm font-semibold text-cyan-300 sm:text-base">
                              ${Number((order.walletBalanceBefore || 0) - (order.walletBalanceAfter || 0)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:pt-0">
            <div className="hidden lg:block lg:sticky lg:top-[90px]">
              <UserSidebar desktopSticky={false} />
            </div>

            <div className="lg:hidden">
              <UserSidebar />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
