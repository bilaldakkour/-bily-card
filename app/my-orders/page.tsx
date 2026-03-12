"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'processing':
        return 'text-blue-400'
      case 'failed':
      case 'rejected':
        return 'text-red-400'
      case 'refunded':
        return 'text-slate-400'
      default:
        return 'text-slate-300'
    }
  }

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

      <div className="mx-auto max-w-7xl px-6 py-12 flex gap-8">
        <div className="flex-1 max-w-4xl">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center">
              <p className="text-slate-300">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center">
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
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-2xl border border-white/10 bg-slate-900/50 p-6"
                >
                  <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-slate-400">Order ID</p>
                      <p className="inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-300">
                        {order.orderId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Product</p>
                      <p className="font-medium text-white">{order.productName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Total</p>
                      <p className="font-semibold text-green-400">${Number(order.total || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <p className={`font-medium capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-sm text-slate-400">Player ID</p>
                        <p className="font-mono text-white">{order.playerId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Quantity</p>
                        <p className="text-white">{order.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Date</p>
                        <p className="text-sm text-white">
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-400">Wallet</p>
                        <p className="text-sm text-slate-300">
                          ${Number(order.walletBalanceBefore || 0).toFixed(2)} → ${Number(order.walletBalanceAfter || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <UserSidebar />
      </div>
    </div>
  )
}