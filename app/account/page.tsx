'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogoutButton } from '@/components/shared'
import UserSidebar from '@/components/shared/UserSidebar'
import { useLanguage } from '@/hooks/useLanguage'

interface WalletBalance {
  usd: number
  lbp: number
}

interface Order {
  _id: string
  orderId: string
  productName: string
  playerId: string
  price: number
  total?: number
  walletBalanceBefore?: number
  walletBalanceAfter?: number
  status: string
  createdAt: string
}

interface UserData {
  displayName: string
  email: string
  walletBalance: WalletBalance
  role: string
}

export default function AccountPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    Promise.all([
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
      fetch('/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json()),
    ])
      .then(([userData, ordersData]) => {
        if (userData.success) {
          setUser(userData.data)
        } else {
          router.push('/login')
        }
        if (ordersData.success && ordersData.data) {
          setRecentOrders(ordersData.data.slice(0, 5))
        }
      })
      .catch(() => {
        router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-white">{t('account.loading')}</div>
      </main>
    )
  }

  if (!user) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10'
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'processing':
        return 'text-blue-400 bg-blue-400/10'
      case 'failed':
        return 'text-red-400 bg-red-400/10'
      default:
        return 'text-slate-400 bg-slate-400/10'
    }
  }

  return (
    <main dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white">{t('account.title')}</h1>
            <p className="mt-2 text-slate-400">{t('account.subtitle')}</p>
          </div>

          {/* User Info Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {/* User Profile Card */}
            <div className="rounded-lg border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{t('account.name')}</p>
              <p className="text-xl font-bold text-white">{user.displayName}</p>
              <p className="mt-4 text-sm text-slate-400">{t('account.email')}</p>
              <p className="break-all text-sm text-white">{user.email}</p>
            </div>

            {/* Wallet USD */}
            <div className="rounded-lg border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{t('account.walletUsd')}</p>
              <p className="text-3xl font-bold text-green-400">
                ${user.walletBalance.usd.toFixed(2)}
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/wallet"
                  className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {t('account.topUpWallet')}
                </Link>
              </div>
            </div>

            {/* Wallet LBP */}
            <div className="rounded-lg border border-white/10 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{t('account.walletLbp')}</p>
              <p className="text-3xl font-bold text-blue-400">
                ₾{user.walletBalance.lbp.toFixed(0)}
              </p>
              <div className="mt-4">
                <p className="text-xs text-slate-500">{t('account.secondaryCurrency')}</p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">{t('account.recentOrders')}</h2>
              <Link
                href="/orders"
                className="text-sm text-blue-400 transition hover:text-blue-300"
              >
                {t('account.viewAll')} →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center">
                <p className="text-slate-400">{t('account.noOrders')}</p>
                <Link
                  href="/products"
                  className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition hover:bg-blue-700"
                >
                  {t('account.browseProducts')}
                </Link>
              </div>
            ) : (
              <div className="space-y-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr className="text-left text-slate-400">
                      <th className="pb-3 font-medium">{t('orders.orderId')}</th>
                      <th className="pb-3 font-medium">{t('orders.product')}</th>
                      <th className="pb-3 font-medium">{t('orders.playerId')}</th>
                      <th className="pb-3 font-medium">{t('orders.price')}</th>
                      <th className="pb-3 font-medium">Wallet</th>
                      <th className="pb-3 font-medium">{t('orders.status')}</th>
                      <th className="pb-3 font-medium text-right">{t('orders.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-white/5 hover:bg-slate-800/50"
                      >
                        <td className="py-3">
                          <span className="inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-300">
                            {order.orderId}
                          </span>
                        </td>
                        <td className="py-3 text-white">{order.productName}</td>
                        <td className="py-3 font-mono text-slate-300">{order.playerId}</td>
                        <td className="py-3 font-semibold text-green-400">${Number(order.total ?? order.price).toFixed(2)}</td>
                        <td className="py-3 text-xs text-slate-300">
                          ${Number(order.walletBalanceBefore || 0).toFixed(2)} → ${Number(order.walletBalanceAfter || 0).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block rounded px-3 py-1 text-xs font-medium capitalize ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Link
              href="/products"
              className="block rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white transition hover:bg-blue-700"
            >
              {t('account.continueShopping')}
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Sidebar */}
        <UserSidebar />
      </div>
    </main>
  )
}