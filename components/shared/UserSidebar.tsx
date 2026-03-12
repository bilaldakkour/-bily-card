'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLanguage, type LanguageCode } from '@/hooks/useLanguage'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'
import { notifySessionExpired } from '@/lib/utils/sessionNotice'
import {
  Home,
  Wallet,
  Receipt,
  FileText,
  Trophy,
  Settings,
  LogOut,
  Palette,
  Globe,
  Phone,
  User,
  Menu,
  X,
  MoreHorizontal,
  Check,
  Shield,
} from 'lucide-react'

interface UserData {
  displayName?: string
  username?: string
  name?: string
  email?: string
  avatar?: string
  walletBalance?: {
    usd?: number
    lbp?: number
  }
  role?: string
}

interface SidebarOrder {
  orderId: string
  status: string
  total?: number
}

interface SidebarTransaction {
  type: string
  amount: number
}

interface UserSidebarProps {
  onBalanceUpdate?: () => void
}

export default function UserSidebar({ onBalanceUpdate }: UserSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { language, t, setAppLanguage, isRTL } = useLanguage()

  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
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
  const languageOptions: Array<{ code: LanguageCode; label: string }> = [
    { code: 'ar', label: t('lang.ar') },
    { code: 'en', label: t('lang.en') },
    { code: 'fr', label: t('lang.fr') },
  ]

  const navigationItems = [
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
  ]

  const userDisplayName =
    user?.displayName ||
    user?.username ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    t('nav.profile')

  useEffect(() => {
    fetchUserData()
  }, [])

  const clearLocalAuth = (token?: string) => {
    clearAuthUserCache(token)
    localStorage.removeItem('bilycard_token')
    localStorage.removeItem('token')
    localStorage.removeItem('adminToken')
    notifySessionExpired('انتهت الجلسة، سجل دخولك من جديد')
  }

  const fetchUserData = async () => {
    const token = localStorage.getItem('bilycard_token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const nextUser = await fetchAuthUser(token)

      if (!nextUser) {
        clearLocalAuth(token)
        setUser(null)
        setLoading(false)
        return
      }

      setUser(nextUser)

      const walletUsd = Number(nextUser?.walletBalance?.usd || 0)
      setFinanceStats((prev) => ({
        ...prev,
        currentDebt: walletUsd < 0 ? Math.abs(walletUsd) : 0,
      }))

      const [ordersRes, txRes] = await Promise.all([
        fetch('/api/orders', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }),
        fetch('/api/wallet/transactions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        }),
      ])

      if (
        ordersRes.status === 401 ||
        ordersRes.status === 403 ||
        txRes.status === 401 ||
        txRes.status === 403
      ) {
        clearLocalAuth(token)
        setUser(null)
        setLoading(false)
        return
      }

      const [ordersData, txData] = await Promise.all([
        ordersRes.json(),
        txRes.json(),
      ])

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

      setOrderStats({
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
        total: orders.length,
      })

      const totalDeposits = transactions
        .filter((tx) => String(tx.type || '').toLowerCase() === 'deposit')
        .reduce((sum, tx) => sum + Math.max(0, Number(tx.amount || 0)), 0)

      const totalOrdersAmount = orders
        .filter((order) => String(order.status || '').toLowerCase() === 'completed')
        .reduce((sum, order) => sum + Math.max(0, Number(order.total || 0)), 0)

      setFinanceStats((prev) => ({
        ...prev,
        totalTransactions: transactions.length,
        totalDeposits,
        totalOrdersAmount,
      }))
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      clearLocalAuth(token)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    const token = localStorage.getItem('bilycard_token') || localStorage.getItem('token') || undefined
    clearAuthUserCache(token)
    localStorage.removeItem('token')
    localStorage.removeItem('bilycard_token')
    localStorage.removeItem('bilycard_user_name')
    localStorage.removeItem('bilycard_user_email')
    window.dispatchEvent(new Event('bilycard-auth-changed'))
    router.push('/login')
  }

  const refreshBalance = () => {
    fetchUserData()
    onBalanceUpdate?.()
  }

  const handleLanguageChange = (code: LanguageCode) => {
    setAppLanguage(code)
    setIsLangMenuOpen(false)
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''

    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 2 * 1024 * 1024) return

    const token = localStorage.getItem('bilycard_token')
    if (!token) {
      router.push('/login')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        setAvatarUploading(true)
        const avatarData = typeof reader.result === 'string' ? reader.result : ''

        if (!avatarData) return

        const res = await fetch('/api/auth/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatar: avatarData }),
        })

        const data = await res.json()
        if (!res.ok || !data?.success) return

        const nextAvatar = data?.data?.avatar || avatarData

        setUser((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev))
        localStorage.setItem('bilycard_user_avatar', nextAvatar)
        window.dispatchEvent(new Event('bilycard-auth-changed'))
      } catch {
        // Ignore upload errors and keep current avatar
      } finally {
        setAvatarUploading(false)
      }
    }

    reader.readAsDataURL(file)
  }

  const sidebarContent = (
    <div className="h-full overflow-y-auto border-l border-white/10 bg-slate-900 p-6">
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <label className="relative block cursor-pointer" title="Upload avatar">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="User avatar"
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600">
                <User className="h-6 w-6 text-slate-900" />
              </div>
            )}

            <span className="absolute -bottom-1 -right-1 rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {avatarUploading ? '...' : '+'}
            </span>

            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>

          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="font-semibold text-white">{userDisplayName}</p>

            <span className="rounded-full bg-yellow-400/20 px-2 py-1 text-xs text-yellow-400">
              {t('sidebar.level')}
            </span>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-yellow-400"
            style={{ width: '60%' }}
          />
        </div>

        <p className={`mt-1 text-xs text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.progress')}
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-800 p-4">
        <h3 className={`mb-3 font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.availableBalance')}
        </h3>

        <div className={`mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-2xl font-bold text-green-400">
            ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
          </p>

          <p className="text-sm text-slate-400">
            {Number(user?.walletBalance?.lbp || 0).toFixed(0)} LBP
          </p>
        </div>

        <Link
          href="/wallet"
          onClick={() => {
            setIsMobileOpen(false)
            refreshBalance()
          }}
          className="block w-full rounded-lg bg-green-600 px-4 py-2 text-center font-medium text-white transition hover:bg-green-700"
        >
          {t('sidebar.addBalance')}
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-800 p-4">
        <h3 className={`mb-3 font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.purchaseSummary')}
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.pendingOrders')}</span>
            <span className="font-semibold text-yellow-300">{orderStats.pending}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.completedOrders')}</span>
            <span className="font-semibold text-green-300">{orderStats.completed}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.cancelledOrders')}</span>
            <span className="font-semibold text-red-300">{orderStats.cancelled}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-slate-800 p-4">
        <h3 className={`mb-3 font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.accountReport')}
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.currentBalance')}</span>
            <span className="font-semibold text-blue-300">${Number(user?.walletBalance?.usd || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.currentDebt')}</span>
            <span className="font-semibold text-red-300">${Number(financeStats.currentDebt || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.totalTransactions')}</span>
            <span className="font-semibold text-white">{financeStats.totalTransactions}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.totalDeposits')}</span>
            <span className="font-semibold text-green-300">${Number(financeStats.totalDeposits || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.totalOrdersAmount')}</span>
            <span className="font-semibold text-cyan-300">${Number(financeStats.totalOrdersAmount || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
            <span className="text-slate-300">{t('sidebar.totalOrdersCount')}</span>
            <span className="font-semibold text-white">{orderStats.total}</span>
          </div>
        </div>
      </div>

      <div className="relative mb-6 flex justify-center gap-2">
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800 transition hover:bg-slate-700"
          type="button"
        >
          <LogOut className="h-4 w-4 text-slate-300" />
        </button>

        <Link
          href="/products"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800 transition hover:bg-slate-700"
        >
          <Palette className="h-4 w-4 text-slate-300" />
        </Link>

        <button
          onClick={() => setIsLangMenuOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-800 transition hover:bg-slate-700"
          type="button"
        >
          <Globe className="h-4 w-4 text-slate-300" />
        </button>

        {isLangMenuOpen && (
          <div className="absolute -bottom-40 right-0 z-20 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-1.5 shadow-xl">
            {languageOptions.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <span>{lang.label}</span>
                {language === lang.code && <Check className="h-4 w-4 text-cyan-300" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="mb-6">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Icon className="h-5 w-5 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className={`rounded-xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h3 className="mb-2 font-semibold text-yellow-400">{t('sidebar.needHelp')}</h3>

        <Link
          href="https://wa.me/96171985887"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 font-medium text-slate-900 transition hover:bg-yellow-500"
        >
          <Phone className="h-4 w-4" />
          <span>{t('sidebar.contactSupport')}</span>
        </Link>
      </div>
    </div>
  )

  if (loading) {
    return (
      <>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900 md:hidden"
          type="button"
        >
          <Menu className="h-5 w-5 text-white" />
        </button>

        <div className="fixed right-0 top-0 z-40 hidden h-full md:block">
          <div
            className="absolute right-0 top-0 h-full w-4"
            onMouseEnter={() => setIsDesktopOpen(true)}
          />

          <button
            onMouseEnter={() => setIsDesktopOpen(true)}
            type="button"
            aria-label="Open sidebar"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/95 text-white shadow-lg"
          >
            {isDesktopOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>

          <div
            className={`h-full w-80 transform border-l border-white/10 bg-slate-900 p-6 pt-20 transition-transform duration-300 ${
              isDesktopOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            onMouseLeave={() => setIsDesktopOpen(false)}
          >
            <div className="animate-pulse space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-700" />
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded bg-slate-700" />
                  <div className="h-3 w-16 rounded bg-slate-700" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-20 w-full rounded-lg bg-slate-700" />
                <div className="h-12 w-full rounded-lg bg-slate-700" />
              </div>

              <div className="space-y-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-10 w-full rounded bg-slate-700" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!user) return null

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900 md:hidden"
        type="button"
      >
        <Menu className="h-5 w-5 text-white" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-50 h-full w-80 transform border-l border-white/10 bg-slate-900 transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800"
          type="button"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {sidebarContent}
      </div>

      <div className="fixed right-0 top-0 z-40 hidden h-full md:block">
        <div
          className="absolute right-0 top-0 h-full w-4"
          onMouseEnter={() => setIsDesktopOpen(true)}
        />

        <button
          onMouseEnter={() => setIsDesktopOpen(true)}
          type="button"
          aria-label="Open sidebar"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/95 text-white shadow-lg"
        >
          {isDesktopOpen ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
        </button>

        <div
          className={`h-full w-80 transform pt-20 transition-transform duration-300 ${
            isDesktopOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onMouseLeave={() => setIsDesktopOpen(false)}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  )
}