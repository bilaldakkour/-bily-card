'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  DollarSign,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  rejectedOrders: number
  pendingDeposits: number
  totalSales: number
  totalProfit: number
  totalWalletBalance: number
}

interface RecentOrder {
  _id: string
  orderId: string
  productName: string
  price: number
  status: string
  createdAt: string
  userId: {
    displayName: string
    email: string
  } | null
}

interface RecentDeposit {
  _id: string
  username: string
  amount: number
  currency: string
  status: string
  createdAt: string
}

const quickLinks = [
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/deposits', label: 'Deposits', icon: CreditCard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/users', label: 'Users', icon: UserRound },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    void fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        setError('Admin token missing. Please login again.')
        setLoading(false)
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const statsPromise = fetch('/api/admin/stats', { headers }).then((res) => res.json())
      const ordersPromise = fetch('/api/admin/orders?limit=5', { headers }).then((res) => res.json())
      const depositsPromise = fetch('/api/admin/deposits?status=pending&limit=5', {
        headers,
      }).then((res) => res.json())

      const statsData = await statsPromise

      if (statsData?.success) {
        setStats(statsData.data)
      }

      setLoading(false)

      void ordersPromise.then((ordersData) => {
        if (ordersData?.success) setRecentOrders(ordersData.data || [])
      })

      void depositsPromise.then((depositsData) => {
        if (depositsData?.success) setRecentDeposits(depositsData.deposits || [])
      })
    } catch {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const statCards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, tone: 'text-white', icon: UserRound },
        { label: 'Total Orders', value: stats.totalOrders, tone: 'text-white', icon: ShoppingCart },
        { label: 'Pending Orders', value: stats.pendingOrders, tone: 'text-amber-300', icon: Receipt },
        { label: 'Completed Orders', value: stats.completedOrders, tone: 'text-emerald-300', icon: Package },
        { label: 'Rejected Orders', value: stats.rejectedOrders, tone: 'text-rose-300', icon: Receipt },
        { label: 'Pending Deposits', value: stats.pendingDeposits, tone: 'text-sky-300', icon: CreditCard },
        { label: 'Total Sales', value: `$${stats.totalSales.toFixed(2)}`, tone: 'text-emerald-300', icon: DollarSign },
        { label: 'Total Profit', value: `$${Number(stats.totalProfit || 0).toFixed(2)}`, tone: 'text-cyan-300', icon: TrendingUp },
        { label: 'Wallet Added', value: `$${stats.totalWalletBalance.toFixed(2)}`, tone: 'text-violet-300', icon: Wallet },
      ]
    : []

  const statusTone = (status: string) => {
    if (status === 'completed' || status === 'approved') return 'bg-emerald-500/15 text-emerald-300'
    if (status === 'pending') return 'bg-amber-500/15 text-amber-300'
    if (status === 'rejected' || status === 'failed') return 'bg-rose-500/15 text-rose-300'
    return 'bg-slate-500/15 text-slate-300'
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading dashboard...</div>
  }

  if (error) {
    return <div className="text-center text-red-400">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(10,17,30,0.98),rgba(15,23,42,0.94))] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.24)]">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400 sm:text-base">Welcome to Bily Card Admin Panel</p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:hidden">
          {quickLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-4 text-white shadow-[0_10px_24px_rgba(2,6,23,0.18)]"
              >
                <Icon className="h-5 w-5 text-cyan-300" />
                <p className="mt-3 text-sm font-semibold">{item.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400 sm:text-sm">{card.label}</p>
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
                <p className={`mt-3 text-xl font-bold sm:text-3xl ${card.tone}`}>{card.value}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white sm:text-xl">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-cyan-300 hover:text-cyan-200">
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-slate-400">No recent orders</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-2xl border border-white/8 bg-slate-800/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-cyan-300">{order.orderId}</p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{order.productName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {order.userId?.displayName || 'Unknown user'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-3 py-1 text-xs font-medium ${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-emerald-300">${order.price.toFixed(2)}</span>
                    <span className="text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white sm:text-xl">Recent Deposits</h2>
            <Link href="/admin/deposits" className="text-sm text-cyan-300 hover:text-cyan-200">
              View all
            </Link>
          </div>

          {recentDeposits.length === 0 ? (
            <p className="text-slate-400">No recent deposits</p>
          ) : (
            <div className="space-y-3">
              {recentDeposits.map((deposit) => (
                <div
                  key={deposit._id}
                  className="rounded-2xl border border-white/8 bg-slate-800/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{deposit.username}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {deposit.amount} {deposit.currency}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded px-3 py-1 text-xs font-medium ${statusTone(deposit.status)}`}>
                      {deposit.status}
                    </span>
                  </div>

                  <div className="mt-3 text-right text-xs text-slate-500">
                    {new Date(deposit.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
