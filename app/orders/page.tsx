'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import { useLanguage } from '@/hooks/useLanguage'

interface Order {
  _id: string
  orderId: string
  productName: string
  playerId: string
  price: number
  total?: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'rejected'
  createdAt: string
}

export default function OrdersPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
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
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setOrders(data.data)
        }
      })
      .catch(() => {
        console.error(t('orders.failedFetch'))
      })
      .finally(() => setLoading(false))
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'pending':
        return 'text-yellow-400'
      case 'processing':
        return 'text-blue-400'
      case 'failed':
        return 'text-red-400'
      case 'refunded':
        return 'text-slate-400'
      case 'rejected':
        return 'text-red-400'
      default:
        return 'text-white'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-white">{t('orders.loading')}</div>
        </div>
      </main>
    )
  }

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">{t('orders.title')}</h1>
          <Link
            href="/account"
            className="rounded-lg bg-slate-800 px-6 py-2 text-white transition hover:bg-slate-700"
          >
            {t('orders.backToAccount')}
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
            <p className="mb-4 text-slate-400">{t('orders.noOrders')}</p>
            <Link
              href="/products"
              className="inline-block rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
            >
              {t('orders.browseProducts')}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="rounded-lg border border-white/10 bg-slate-900 p-6 text-white transition hover:border-white/20"
              >
                <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-slate-400">{t('orders.orderId')}</p>
                    <p className="inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-300">
                      {order.orderId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('orders.product')}</p>
                    <p className="font-medium">{order.productName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('orders.price')}</p>
                    <p className="font-semibold text-green-400">${Number(order.total ?? order.price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{t('orders.status')}</p>
                    <p className={`font-medium capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </p>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-slate-400">{t('orders.playerId')}</p>
                      <p className="font-mono">{order.playerId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{t('orders.date')}</p>
                      <p className="text-sm">
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

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </main>
  )
}
