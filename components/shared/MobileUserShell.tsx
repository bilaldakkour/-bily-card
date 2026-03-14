'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  ChevronLeft,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  Phone,
  Receipt,
  Search,
  Settings,
  Shield,
  Trophy,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { useSupportContact } from '@/hooks/useSupportContact'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'

type UserData = {
  displayName?: string
  username?: string
  name?: string
  email?: string
  phoneNumber?: string
  country?: string
  avatar?: string
  role?: string
  walletBalance?: {
    usd?: number
    lbp?: number
  }
}

type SidebarOrder = {
  status?: string
  total?: number
}

type SidebarTransaction = {
  type?: string
  amount?: number
}

interface MobileUserShellProps {
  title?: string
}

export default function MobileUserShell({ title }: MobileUserShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isRTL, t } = useLanguage()
  const supportContact = useSupportContact()
  const [query, setQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [orderStats, setOrderStats] = useState({
    pending: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  })
  const [financeStats, setFinanceStats] = useState({
    totalTransactions: 0,
    totalDeposits: 0,
    totalOrdersAmount: 0,
    currentDebt: 0,
  })

  const navigationItems = useMemo(
    () => [
      { href: '/', label: t('sidebar.home'), icon: Home },
      { href: '/products', label: t('sidebar.products'), icon: Trophy },
      { href: '/wallet', label: t('sidebar.wallet'), icon: Wallet },
      { href: '/my-orders', label: t('sidebar.purchaseHistory'), icon: Receipt },
      { href: '/orders', label: t('sidebar.orders'), icon: FileText },
      { href: '/profile', label: t('sidebar.account'), icon: Settings },
      { href: '/contact', label: t('sidebar.contact'), icon: Phone },
      { href: '/account', label: t('sidebar.settings'), icon: Settings },
      ...(user?.role === 'admin'
        ? [{ href: '/admin', label: 'Admin Dashboard', icon: Shield }]
        : []),
    ],
    [t, user?.role]
  )

  useEffect(() => {
    const token = localStorage.getItem('bilycard_token')
    if (!token) return

    const loadData = async () => {
      try {
        const nextUser = await fetchAuthUser(token)
        if (!nextUser) {
          setUser(null)
          return
        }

        setUser(nextUser)

        const walletUsd = Number(nextUser.walletBalance?.usd || 0)
        setFinanceStats((prev) => ({
          ...prev,
          currentDebt: walletUsd < 0 ? Math.abs(walletUsd) : 0,
        }))

        const [ordersRes, txRes] = await Promise.all([
          fetch('/api/orders', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
          fetch('/api/wallet/transactions', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          }),
        ])

        const [ordersData, txData] = await Promise.all([ordersRes.json(), txRes.json()])
        const orders: SidebarOrder[] = Array.isArray(ordersData?.data) ? ordersData.data : []
        const transactions: SidebarTransaction[] = Array.isArray(txData?.transactions)
          ? txData.transactions
          : []

        const pendingCount = orders.filter((order) =>
          ['pending', 'processing'].includes(String(order.status || '').toLowerCase())
        ).length
        const completedCount = orders.filter(
          (order) => String(order.status || '').toLowerCase() === 'completed'
        ).length
        const cancelledCount = orders.filter((order) =>
          ['failed', 'rejected', 'refunded'].includes(String(order.status || '').toLowerCase())
        ).length

        const totalDeposits = transactions
          .filter((tx) => String(tx.type || '').toLowerCase() === 'deposit')
          .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount || 0)), 0)

        const totalOrdersAmount = orders
          .filter((order) => String(order.status || '').toLowerCase() === 'completed')
          .reduce((sum, order) => sum + Math.max(0, Number(order.total || 0)), 0)

        setOrderStats({
          pending: pendingCount,
          completed: completedCount,
          cancelled: cancelledCount,
          total: orders.length,
        })

        setFinanceStats((prev) => ({
          ...prev,
          totalTransactions: transactions.length,
          totalDeposits,
          totalOrdersAmount,
        }))
      } catch {
        setUser(null)
      }
    }

    void loadData()
  }, [])

  const handleSearch = () => {
    const next = query.trim()
    router.push(next ? `/products?search=${encodeURIComponent(next)}` : '/products')
  }

  const handleLogout = () => {
    const token = localStorage.getItem('bilycard_token') || localStorage.getItem('token') || undefined
    clearAuthUserCache(token)
    localStorage.removeItem('token')
    localStorage.removeItem('bilycard_token')
    localStorage.removeItem('bilycard_user_name')
    localStorage.removeItem('bilycard_user_email')
    localStorage.removeItem('bilycard_user_avatar')
    setIsMenuOpen(false)
    window.dispatchEvent(new Event('bilycard-auth-changed'))
    router.push('/login')
  }

  const userDisplayName =
    user?.displayName ||
    user?.username ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Bilycard@'

  return (
    <>
      <div className="md:hidden">
        <div className="mb-4 rounded-[28px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,15,29,0.98),rgba(5,10,22,1))] px-3 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.42)] ring-1 ring-cyan-400/8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/8 text-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <label className="relative block flex-1">
              <Search
                className={`pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 ${
                  isRTL ? 'left-4' : 'right-4'
                }`}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder={'\u0627\u0628\u062d\u062b \u0639\u0646 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a...'}
                className="w-full rounded-[22px] border border-cyan-400/12 bg-white/[0.035] px-5 py-3 text-right text-base text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
                dir="rtl"
              />
            </label>
          </div>
        </div>

        {title ? (
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-right text-[2.15rem] font-black leading-none text-white">{title}</h1>
          </div>
        ) : null}
      </div>

      {isMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-black/65 md:hidden"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu overlay"
          />

          <aside className="fixed inset-y-0 right-0 z-[80] w-[88vw] max-w-[372px] overflow-y-auto border-l border-cyan-400/22 bg-[linear-gradient(180deg,rgba(7,15,29,0.985),rgba(4,9,18,1))] px-4 pb-28 pt-5 shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_26px_80px_rgba(2,6,23,0.56)] md:hidden">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-right">
                <p className="text-lg font-bold text-white">{userDisplayName}</p>
                <p className="text-sm text-slate-400">{t('sidebar.account')}</p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-cyan-400/20 bg-cyan-500/10">
                {user?.avatar ? (
                  <img src={user.avatar} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-cyan-200" />
                )}
              </div>
            </div>

            <div className="mb-4 rounded-[26px] border border-cyan-400/14 bg-white/[0.035] p-4 text-right">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">{t('sidebar.level')}</span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                  LVL 3
                </span>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-800/90">
                <div className="h-2 w-[60%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">{t('sidebar.progress')}</p>

              <div className="mt-4 rounded-[22px] border border-cyan-400/18 bg-[linear-gradient(180deg,rgba(7,32,54,0.95),rgba(6,24,40,0.92))] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-cyan-300">
                    ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                  </span>
                  <span className="text-base text-slate-100">{t('sidebar.availableBalance')}</span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {Number(user?.walletBalance?.lbp || 0).toFixed(0)} LBP
                </p>
                <Link
                  href="/wallet"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-base font-semibold text-white shadow-[0_14px_30px_rgba(14,165,233,0.22)]"
                >
                  <Wallet className="h-4 w-4" />
                  {t('sidebar.addBalance')}
                </Link>
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-3 text-base text-slate-400">{'\u0627\u0644\u0648\u0635\u0648\u0644 \u0627\u0644\u0633\u0631\u064a\u0639'}</p>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between rounded-[20px] px-4 py-4 text-base transition ${
                      active
                        ? 'border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]'
                        : 'border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 rounded-[26px] border border-cyan-400/16 bg-[linear-gradient(180deg,rgba(8,18,33,0.98),rgba(15,23,42,0.96))] p-4 text-right shadow-[0_18px_36px_rgba(2,6,23,0.2)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{'\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628'}</p>
                  <p className="mt-1 text-sm text-slate-400">{'\u062b\u0627\u0628\u062a\u0629 \u0639\u0644\u0649 \u0646\u0633\u062e\u0629 \u0627\u0644\u062a\u0644\u0641\u0648\u0646'}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/16 bg-cyan-500/10 text-cyan-300">
                  <Settings className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{'\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645'}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{userDisplayName}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{'\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a'}</p>
                  <p className="mt-1 break-all text-sm font-semibold text-white">{user?.email || '-'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{'\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641'}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{user?.phoneNumber || '\u0633\u0646\u0631\u0628\u0637\u0647 \u0644\u0627\u062d\u0642\u0627\u064b'}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                  <p className="text-xs text-slate-500">{'\u0627\u0644\u062f\u0648\u0644\u0629'}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{user?.country || '\u0633\u0646\u0631\u0628\u0637\u0647\u0627 \u0644\u0627\u062d\u0642\u0627\u064b'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-3">
                    <p className="text-xs text-slate-500">{'\u0631\u0635\u064a\u062f \u0627\u0644\u0645\u062d\u0641\u0638\u0629'}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">
                      ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{Number(user?.walletBalance?.lbp || 0).toFixed(0)} LBP</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/14 bg-cyan-500/8 px-4 py-3">
                    <p className="text-xs text-slate-500">{'\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645'}</p>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">LVL 3</p>
                    <p className="mt-1 text-xs text-slate-500">{'\u062a\u0642\u062f\u0645 \u062b\u0627\u0628\u062a \u062d\u0627\u0644\u064a\u0627\u064b'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-rose-300/10 bg-[linear-gradient(180deg,rgba(31,24,35,0.94),rgba(18,20,32,0.96))] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-white">{'\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0623\u0645\u0627\u0646'}</p>
                  <Shield className="h-5 w-5 text-rose-300" />
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-500">{'\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0627\u0644\u062b\u0646\u0627\u0626\u064a\u0629'}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{'\u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645: email'}</p>
                    <p className="mt-1 text-xs text-slate-500">{'(\u0633\u0646\u0631\u0628\u0637\u0647\u0627 \u0644\u0627\u062d\u0642\u0627\u064b)'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs text-slate-500">{'\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'}</p>
                    <p className="mt-1 text-sm font-semibold text-white">{'\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0633\u0627\u0628'}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-2xl border border-cyan-400/14 bg-cyan-500/10 px-4 py-3 text-center text-sm font-semibold text-cyan-200"
                  >
                    {'\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628'}
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-2xl border border-rose-300/14 bg-rose-500/10 px-4 py-3 text-center text-sm font-semibold text-rose-200"
                  >
                    {'\u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-3 text-base text-slate-400">{t('sidebar.accountReport')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.currentBalance')}</span>
                <span className="font-semibold text-cyan-300">
                  ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.currentDebt')}</span>
                <span className="font-semibold text-red-300">
                  ${Number(financeStats.currentDebt || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalTransactions')}</span>
                <span className="font-semibold text-white">{financeStats.totalTransactions}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalDeposits')}</span>
                <span className="font-semibold text-emerald-300">
                  ${Number(financeStats.totalDeposits || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersAmount')}</span>
                <span className="font-semibold text-sky-300">
                  ${Number(financeStats.totalOrdersAmount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="text-slate-300">{t('sidebar.totalOrdersCount')}</span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-right">
              <p className="mb-3 text-base text-slate-400">{t('sidebar.purchaseSummary')}</p>

              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Receipt className="h-4 w-4 text-amber-300" />
                  {t('sidebar.pendingOrders')}
                </span>
                <span className="font-semibold text-amber-300">{orderStats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <Shield className="h-4 w-4 text-emerald-300" />
                  {t('sidebar.completedOrders')}
                </span>
                <span className="font-semibold text-emerald-300">{orderStats.completed}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <FileText className="h-4 w-4 text-red-300" />
                  {t('sidebar.cancelledOrders')}
                </span>
                <span className="font-semibold text-red-300">{orderStats.cancelled}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2 text-slate-300">
                  <CreditCard className="h-4 w-4 text-cyan-300" />
                  {t('sidebar.totalOrdersCount')}
                </span>
                <span className="font-semibold text-white">{orderStats.total}</span>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-cyan-400/16 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-4 text-right shadow-[0_18px_36px_rgba(14,165,233,0.08)]">
              <h3 className="mb-2 font-semibold text-cyan-300">{t('sidebar.needHelp')}</h3>
              <Link
                href={supportContact.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" />
                <span>{t('sidebar.contactSupport')}</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-red-400/20 bg-red-500/85 px-4 py-4 text-base font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              {'\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c'}
            </button>
          </aside>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-3 z-[60] px-4 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-[28px] border border-cyan-400/55 bg-[rgba(10,17,30,0.96)] px-4 py-3 shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_18px_50px_rgba(2,6,23,0.45)] backdrop-blur">
          <Link
            href="/account"
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/account' || pathname === '/profile' ? 'text-cyan-300' : 'text-slate-300'
            }`}
          >
            <User className="h-5 w-5" />
            <span>{'\u062d\u0633\u0627\u0628\u064a'}</span>
          </Link>

          <Link
            href="/notifications"
            className={`relative flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/notifications' ? 'text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Bell className="h-5 w-5" />
            <span>{'\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a'}</span>
            <span className="absolute right-3 top-0 h-2.5 w-2.5 rounded-full bg-red-500" />
          </Link>

          <Link
            href="/"
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              pathname === '/' ? 'text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>{'\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629'}</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={`flex min-w-[62px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-xs ${
              isMenuOpen ? 'bg-white/[0.06] text-cyan-300' : 'text-slate-300'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>{'\u0627\u0644\u0642\u0627\u0626\u0645\u0629'}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
