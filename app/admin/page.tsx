'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  CreditCard,
  DollarSign,
  GitMerge,
  Package,
  PlugZap,
  ClipboardList,
  Images,
  Receipt,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type PeriodFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'

interface ProductBreakdown {
  productName: string
  sales: number
  profit: number
  ordersCount: number
}

interface UserBreakdown {
  userId: string
  label: string
  revenue: number
  profit: number
  ordersCount: number
}

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
  manualOrdersCount: number
  manualRevenue: number
  manualCost: number
  manualProfit: number
  normalRevenue: number
  normalCost: number
  normalProfit: number
  combinedRevenue: number
  combinedCost: number
  combinedTotalProfit: number
  topProductsByProfit: ProductBreakdown[]
  topProductsBySales: ProductBreakdown[]
  topUsersByRevenue: UserBreakdown[]
  topUsersByProfit: UserBreakdown[]
  filters: {
    period: PeriodFilter
    from: string
    to: string
  }
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
  { href: '/admin/manual-orders', label: 'Manual Orders', icon: ClipboardList },
  { href: '/admin/home-banners', label: 'Home Banners', icon: Images },
  { href: '/admin/deposits', label: 'Deposits', icon: CreditCard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/provider-mappings', label: 'Mappings', icon: GitMerge },
  { href: '/admin/providers', label: 'Providers', icon: PlugZap },
  { href: '/admin/diagnostics', label: 'Diagnostics', icon: Activity },
  { href: '/admin/users', label: 'Users', icon: UserRound },
]

const periodOptions: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [error, setError] = useState('')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const hasFetchedSideRef = useRef(false)
  const hasLoadedStatsOnceRef = useRef(false)

  const buildStatsQuery = () => {
    const params = new URLSearchParams()
    params.set('period', periodFilter)
    if (periodFilter === 'custom') {
      if (customFrom) params.set('from', customFrom)
      if (customTo) params.set('to', customTo)
    }
    return params.toString()
  }

  const fetchSidePanels = async (token: string) => {
    try {
      const headers = buildAdminAuthHeaders(token)
      const [ordersData, depositsData] = await Promise.all([
        fetch('/api/admin/orders?limit=5', { headers }).then(async (res) => {
          if (isUnauthorizedStatus(res.status)) {
            router.push('/admin/login')
            return null
          }
          return res.json()
        }),
        fetch('/api/admin/deposits?status=pending&limit=5', { headers }).then(async (res) => {
          if (isUnauthorizedStatus(res.status)) {
            router.push('/admin/login')
            return null
          }
          return res.json()
        }),
      ])

      if (ordersData?.success) setRecentOrders(ordersData.data || [])
      if (depositsData?.success) setRecentDeposits(depositsData.deposits || [])
    } catch {
      // keep dashboard usable even if side panels fail
    }
  }

  const fetchStats = async (token: string) => {
    if (periodFilter === 'custom' && (!customFrom || !customTo)) {
      return
    }

    setStatsLoading(true)
    try {
      const query = buildStatsQuery()
      const res = await fetch(`/api/admin/stats?${query}`, {
        headers: buildAdminAuthHeaders(token),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const statsData = await res.json()
      if (statsData == null) return

      if (statsData?.success) {
        setStats(statsData.data)
        setError('')
      } else {
        setError('Failed to load dashboard stats')
      }
    } catch {
      setError('Failed to load dashboard stats')
    } finally {
      hasLoadedStatsOnceRef.current = true
      setStatsLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = getAdminTokenOptional()

    if (!hasFetchedSideRef.current) {
      hasFetchedSideRef.current = true
      void fetchSidePanels(token)
    }

    void fetchStats(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, customFrom, customTo])

  const statusTone = (status: string) => {
    if (status === 'completed' || status === 'approved') return 'bg-emerald-500/15 text-emerald-300'
    if (status === 'pending') return 'bg-amber-500/15 text-amber-300'
    if (status === 'rejected' || status === 'failed') return 'bg-rose-500/15 text-rose-300'
    return 'bg-slate-500/15 text-slate-300'
  }

  const coreProfitCards = useMemo(() => {
    if (!stats) return []
    return [
      { label: 'Revenue', value: `$${Number(stats.combinedRevenue || 0).toFixed(2)}`, tone: 'text-emerald-300', icon: DollarSign },
      { label: 'Cost', value: `$${Number(stats.combinedCost || 0).toFixed(2)}`, tone: 'text-amber-300', icon: Receipt },
      { label: 'Profit', value: `$${Number(stats.combinedTotalProfit || 0).toFixed(2)}`, tone: 'text-cyan-300', icon: TrendingUp },
      { label: 'Orders Count', value: stats.totalOrders, tone: 'text-white', icon: ShoppingCart },
      { label: 'Manual Orders Count', value: stats.manualOrdersCount, tone: 'text-white', icon: ClipboardList },
    ]
  }, [stats])

  const operationalCards = useMemo(() => {
    if (!stats) return []
    return [
      { label: 'Total Users', value: stats.totalUsers, tone: 'text-white', icon: UserRound },
      { label: 'Pending Orders', value: stats.pendingOrders, tone: 'text-amber-300', icon: Receipt },
      { label: 'Completed Orders', value: stats.completedOrders, tone: 'text-emerald-300', icon: Package },
      { label: 'Rejected Orders', value: stats.rejectedOrders, tone: 'text-rose-300', icon: Receipt },
      { label: 'Pending Deposits', value: stats.pendingDeposits, tone: 'text-sky-300', icon: CreditCard },
      { label: 'Wallet Added', value: `$${stats.totalWalletBalance.toFixed(2)}`, tone: 'text-violet-300', icon: Wallet },
    ]
  }, [stats])

  if (loading) {
    return <div className="text-center text-slate-400">Loading dashboard...</div>
  }

  if (error && !stats) {
    return <div className="text-center text-red-400">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(10,17,30,0.98),rgba(15,23,42,0.94))] p-5 shadow-[0_24px_70px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">Advanced profit overview with safe filters</p>
            {stats?.filters ? (
              <p className="mt-1 text-xs text-slate-500">
                Range: {new Date(stats.filters.from).toLocaleDateString('en-US')} - {new Date(stats.filters.to).toLocaleDateString('en-US')}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriodFilter(option.value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  periodFilter === option.value
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {periodFilter === 'custom' && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:max-w-md">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
            />
          </div>
        )}

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

      {statsLoading && hasLoadedStatsOnceRef.current ? (
        <div className="text-xs text-cyan-300">Updating filtered profit data...</div>
      ) : null}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {coreProfitCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400 sm:text-sm">{card.label}</p>
                    <Icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className={`mt-3 text-xl font-bold sm:text-2xl ${card.tone}`}>{card.value}</p>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs text-slate-400">Profit from Normal Orders</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">${Number(stats.normalProfit || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">Revenue ${Number(stats.normalRevenue || 0).toFixed(2)} | Cost ${Number(stats.normalCost || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs text-slate-400">Profit from Manual Orders</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">${Number(stats.manualProfit || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">Revenue ${Number(stats.manualRevenue || 0).toFixed(2)} | Cost ${Number(stats.manualCost || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <p className="text-xs text-slate-400">Combined Total Profit</p>
              <p className="mt-2 text-2xl font-bold text-lime-300">${Number(stats.combinedTotalProfit || 0).toFixed(2)}</p>
              <p className="mt-1 text-xs text-slate-500">Combined Revenue ${Number(stats.combinedRevenue || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Top Products by Profit</h2>
              {stats.topProductsByProfit?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-slate-300">
                      <tr>
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2">Profit</th>
                        <th className="px-2 py-2">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.topProductsByProfit.map((row) => (
                        <tr key={`profit-${row.productName}`}>
                          <td className="px-2 py-2 text-slate-200">{row.productName}</td>
                          <td className="px-2 py-2 text-cyan-300">${Number(row.profit || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-emerald-300">${Number(row.sales || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No product profit data in this period.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Top Products by Sales</h2>
              {stats.topProductsBySales?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-slate-300">
                      <tr>
                        <th className="px-2 py-2">Product</th>
                        <th className="px-2 py-2">Sales</th>
                        <th className="px-2 py-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.topProductsBySales.map((row) => (
                        <tr key={`sales-${row.productName}`}>
                          <td className="px-2 py-2 text-slate-200">{row.productName}</td>
                          <td className="px-2 py-2 text-emerald-300">${Number(row.sales || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-cyan-300">${Number(row.profit || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No product sales data in this period.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Top Users by Revenue</h2>
              {stats.topUsersByRevenue?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-slate-300">
                      <tr>
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Revenue</th>
                        <th className="px-2 py-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.topUsersByRevenue.map((row) => (
                        <tr key={`user-revenue-${row.userId}`}>
                          <td className="px-2 py-2 text-slate-200">{row.label}</td>
                          <td className="px-2 py-2 text-emerald-300">${Number(row.revenue || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-cyan-300">${Number(row.profit || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No user revenue data in this period.</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-white">Top Users by Profit</h2>
              {stats.topUsersByProfit?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10 text-left text-slate-300">
                      <tr>
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Profit</th>
                        <th className="px-2 py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {stats.topUsersByProfit.map((row) => (
                        <tr key={`user-profit-${row.userId}`}>
                          <td className="px-2 py-2 text-slate-200">{row.label}</td>
                          <td className="px-2 py-2 text-cyan-300">${Number(row.profit || 0).toFixed(2)}</td>
                          <td className="px-2 py-2 text-emerald-300">${Number(row.revenue || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No user profit data in this period.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {operationalCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400 sm:text-sm">{card.label}</p>
                    <Icon className="h-4 w-4 text-cyan-300" />
                  </div>
                  <p className={`mt-3 text-xl font-bold sm:text-2xl ${card.tone}`}>{card.value}</p>
                </div>
              )
            })}
          </div>
        </>
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
                <div key={order._id} className="rounded-2xl border border-white/8 bg-slate-800/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-cyan-300">{order.orderId}</p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{order.productName}</p>
                      <p className="mt-1 text-xs text-slate-400">{order.userId?.displayName || 'Unknown user'}</p>
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
                <div key={deposit._id} className="rounded-2xl border border-white/8 bg-slate-800/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{deposit.username}</p>
                      <p className="mt-1 text-xs text-slate-400">{deposit.amount} {deposit.currency}</p>
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
