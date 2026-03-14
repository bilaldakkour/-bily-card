'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import UserPageLayout from '@/components/shared/UserPageLayout'
import OrderSummaryCard from '@/components/shared/OrderSummaryCard'

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
  const [searchTerm, setSearchTerm] = useState('')

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

  const completedOrders = orders.filter((order) => order.status === 'completed').length
  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return orders

    return orders.filter((order) =>
      [
        order.orderId,
        order.productName,
        order.playerId,
        order.status,
        String(order.total),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [orders, searchTerm])

  return (
    <UserPageLayout
      title="My Orders"
      mobileTitle="طلباتي"
      subtitle="Track and review your recent purchases in one place."
      breadcrumbs={[
        { label: 'Home', href: '/' },
        { label: 'My Orders', href: '/my-orders' },
      ]}
      showHeader={false}
      fixedSidebarDesktop
      maxWidthClass="max-w-[1720px]"
      fixedSidebarRightClass="lg:right-6"
    >
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

        <div className="mt-4">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders, product, player ID..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </label>
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
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.94),rgba(5,10,22,0.98))] p-10 text-center shadow-[0_24px_70px_rgba(2,6,23,0.22)]">
          <h2 className="mb-3 text-xl font-semibold text-white">No matching orders</h2>
          <p className="text-slate-400">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderSummaryCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </UserPageLayout>
  )
}
