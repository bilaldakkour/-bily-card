'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLanguage, type LanguageCode } from '@/hooks/useLanguage'
import { useSupportContact } from '@/hooks/useSupportContact'
import { clearAuthUserCache, fetchAuthUser, fetchUserActivitySnapshot } from '@/lib/utils/authClient'
import { logoutCustomer } from '@/lib/utils/customerLogout'
import { notifySessionExpired } from '@/lib/utils/sessionNotice'
import {
  Home,
  Wallet,
  Receipt,
  FileText,
  Trophy,
  Heart,
  Settings,
  LogOut,
  Palette,
  Globe,
  Phone,
  User,
  Menu,
  X,
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
  desktopSticky?: boolean
}

const getLevelState = (balanceRaw: number) => {
  const balance = Number.isFinite(balanceRaw) ? Math.max(0, balanceRaw) : 0

  if (balance < 500) {
    return { level: 1, progress: (balance / 500) * 100, nextLevel: 2 as number | null }
  }
  if (balance < 1500) {
    return { level: 2, progress: ((balance - 500) / 1000) * 100, nextLevel: 3 as number | null }
  }
  if (balance < 6000) {
    return { level: 3, progress: ((balance - 1500) / 4500) * 100, nextLevel: 4 as number | null }
  }
  if (balance < 12000) {
    return { level: 4, progress: ((balance - 6000) / 6000) * 100, nextLevel: 5 as number | null }
  }
  if (balance < 25000) {
    return { level: 5, progress: ((balance - 12000) / 13000) * 100, nextLevel: null as number | null }
  }

  return { level: 5, progress: 100, nextLevel: null as number | null }
}

export default function UserSidebar({
  onBalanceUpdate,
  desktopSticky = true,
}: UserSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { language, t, setAppLanguage, isRTL } = useLanguage()
  const supportContact = useSupportContact()

  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
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
  const favoritesLabel =
    language === 'ar' ? 'المفضلة' : language === 'fr' ? 'Favoris' : 'Favorites'

  const navigationItems = [
    { href: '/', label: t('sidebar.home'), icon: Home },
    { href: '/products', label: t('sidebar.products'), icon: Trophy },
    { href: '/wallet', label: t('sidebar.wallet'), icon: Wallet },
    { href: '/my-orders', label: t('sidebar.purchaseHistory'), icon: Receipt },
    { href: '/my-favorites', label: favoritesLabel, icon: Heart },
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
  const walletUsd = Number(user?.walletBalance?.usd || 0)
  const levelState = getLevelState(walletUsd)
  const levelProgress = Math.max(0, Math.min(100, Math.round(levelState.progress)))
  const levelLabelBase =
    language === 'ar' ? 'المستوى الحالي' : language === 'fr' ? 'Niveau actuel' : 'Current level'
  const levelProgressLabel =
    language === 'ar'
      ? levelState.nextLevel
        ? `${levelProgress}% نحو المستوى ${levelState.nextLevel}`
        : levelProgress >= 100
          ? 'تم الوصول لأعلى مستوى'
          : `${levelProgress}% ضمن المستوى 5`
      : language === 'fr'
        ? levelState.nextLevel
          ? `${levelProgress}% vers niveau ${levelState.nextLevel}`
          : levelProgress >= 100
            ? 'Niveau maximum atteint'
            : `${levelProgress}% dans niveau 5`
        : levelState.nextLevel
          ? `${levelProgress}% to level ${levelState.nextLevel}`
          : levelProgress >= 100
            ? 'Max level reached'
            : `${levelProgress}% within level 5`

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

      const snapshot = await fetchUserActivitySnapshot(token)
      const orders: SidebarOrder[] = Array.isArray(snapshot?.orders) ? snapshot.orders : []
      const transactions: SidebarTransaction[] = Array.isArray(snapshot?.transactions)
        ? snapshot.transactions
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

  const handleLogout = async () => {
    await logoutCustomer('/login')
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

  const railBody = (
    <div className="flex min-h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.985),rgba(5,10,22,1))] shadow-[0_26px_80px_rgba(2,6,23,0.28)]">
      <div className="border-b border-white/8 px-4 py-4 md:px-5">
        <div className="flex items-center gap-3">
          <label className="relative block cursor-pointer" title="Upload avatar">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="User avatar"
                className="h-12 w-12 rounded-full border border-white/10 object-cover shadow-[0_10px_24px_rgba(2,6,23,0.28)]"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/20 bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_12px_28px_rgba(202,138,4,0.24)]">
                <User className="h-5 w-5 text-slate-900" />
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

          <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="truncate text-sm font-bold text-white">{userDisplayName}</p>
            <Link
              href="/level-progress"
              onClick={() => setIsMobileOpen(false)}
              className="mt-1 inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/15 px-2.5 py-1 text-xs font-semibold text-yellow-300 transition hover:border-yellow-300/40 hover:bg-yellow-400/20"
            >
              {levelLabelBase} {levelState.level}
            </Link>
          </div>
        </div>

        <div className="mt-4 h-2 w-full rounded-full bg-slate-800/90">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-yellow-300 to-amber-500"
            style={{ width: `${levelProgress}%` }}
          />
        </div>

        <p className={`mt-1.5 text-xs text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>
          {levelProgressLabel}
        </p>

        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-3.5">
          <h3 className={`mb-2 text-sm font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('sidebar.availableBalance')}
          </h3>

          <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-xl font-bold text-green-400">
              ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
            </p>
          </div>

          <Link
            href="/wallet"
            onClick={() => {
              setIsMobileOpen(false)
              refreshBalance()
            }}
            className="mt-3 block w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-green-500"
          >
            {t('sidebar.addBalance')}
          </Link>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-4 md:px-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className={`text-sm font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
            Menu
          </h3>

          <div className="relative flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
              type="button"
            >
              <LogOut className="h-4 w-4 text-slate-300" />
            </button>

            <Link
              href="/products"
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
            >
              <Palette className="h-4 w-4 text-slate-300" />
            </Link>

            <button
              onClick={() => setIsLangMenuOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]"
              type="button"
            >
              <Globe className="h-4 w-4 text-slate-300" />
            </button>

            {isLangMenuOpen && (
              <div className="absolute -bottom-40 right-0 z-20 w-44 rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-xl">
                {languageOptions.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                  >
                    <span>{lang.label}</span>
                    {language === lang.code && <Check className="h-4 w-4 text-cyan-300" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-1.5">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-[0_12px_24px_rgba(14,165,233,0.22)]'
                      : 'border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <Icon className="h-5 w-5 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-b border-white/8 px-4 py-4 md:px-5">
        <h3 className={`mb-3 text-sm font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.accountReport')}
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.currentBalance')}</span>
            <span className="font-semibold text-blue-300">${Number(user?.walletBalance?.usd || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.currentDebt')}</span>
            <span className="font-semibold text-red-300">${Number(financeStats.currentDebt || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.totalTransactions')}</span>
            <span className="font-semibold text-white">{financeStats.totalTransactions}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.totalDeposits')}</span>
            <span className="font-semibold text-green-300">${Number(financeStats.totalDeposits || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.totalOrdersAmount')}</span>
            <span className="font-semibold text-cyan-300">${Number(financeStats.totalOrdersAmount || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.totalOrdersCount')}</span>
            <span className="font-semibold text-white">{orderStats.total}</span>
          </div>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-4 md:px-5">
        <h3 className={`mb-3 text-sm font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('sidebar.purchaseSummary')}
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.pendingOrders')}</span>
            <span className="font-semibold text-yellow-300">{orderStats.pending}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.completedOrders')}</span>
            <span className="font-semibold text-green-300">{orderStats.completed}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="text-slate-300">{t('sidebar.cancelledOrders')}</span>
            <span className="font-semibold text-red-300">{orderStats.cancelled}</span>
          </div>
        </div>
      </div>

      <div className={`px-4 py-4 md:px-5 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className="rounded-[24px] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 to-yellow-600/10 p-3.5 shadow-[0_18px_36px_rgba(146,64,14,0.12)]">
          <h3 className="mb-2 font-semibold text-yellow-400">{t('sidebar.needHelp')}</h3>

          <Link
            href={supportContact.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-yellow-500"
          >
            <Phone className="h-4 w-4" />
            <span>{t('sidebar.contactSupport')}</span>
          </Link>
        </div>
      </div>
    </div>
  )

  const loadingBody = (
    <div className="min-h-full overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.985),rgba(5,10,22,1))] p-5">
      <div className="animate-pulse space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-700" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-700" />
            <div className="h-3 w-16 rounded bg-slate-700" />
          </div>
        </div>
        <div className="h-24 rounded-[24px] bg-slate-800/80" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-2xl bg-slate-800/80" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 rounded-2xl bg-slate-800/80" />
          ))}
        </div>
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

        <div className="hidden md:block md:w-full">
          <div className={desktopSticky ? 'sticky top-[90px]' : ''}>
            <div className="h-[calc(100vh-108px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
              {loadingBody}
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
          className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800"
          type="button"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="h-full overflow-y-auto p-4 pt-14">
          {railBody}
        </div>
      </div>

      <div className="hidden md:block md:w-full">
        <div className={desktopSticky ? 'sticky top-[90px]' : ''}>
          <div className="h-[calc(100vh-108px)] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]">
            {railBody}
          </div>
        </div>
      </div>
    </>
  )
}
