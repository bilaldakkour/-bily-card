'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'
import {
  Bell,
  Wallet,
  User,
  ChevronDown,
  LogOut,
  ShoppingBag,
  Home,
  Gamepad2,
  CreditCard,
  MessageCircle,
  Heart,
  LayoutDashboard,
  CheckCircle2,
  Clock3,
  ArrowDownToLine,
} from 'lucide-react'

type AuthUser = {
  displayName?: string
  username?: string
  name?: string
  email?: string
  avatar?: string
  role?: string
  walletBalance?: {
    usd?: number
    lbp?: number
  }
}

type NavbarOrder = {
  orderId?: string
  productName?: string
  status?: string
  total?: number
  createdAt?: string
}

type NavbarTransaction = {
  type?: string
  amount?: number
  currency?: string
  createdAt?: string
  description?: string
  notes?: string
}

type NavbarNotification = {
  id: string
  title: string
  description: string
  createdAt: string
  href?: string
  icon: 'order' | 'deposit'
}

export default function Navbar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [notifications, setNotifications] = useState<NavbarNotification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const bellRef = useRef<HTMLDivElement | null>(null)

  const myOrdersHref = isAuthenticated ? '/my-orders' : '/login'

  const fallbackName =
    (typeof window !== 'undefined' && localStorage.getItem('bilycard_user_name')) || ''
  const fallbackEmail =
    (typeof window !== 'undefined' && localStorage.getItem('bilycard_user_email')) || ''
  const fallbackAvatar =
    (typeof window !== 'undefined' && localStorage.getItem('bilycard_user_avatar')) || ''

  const userDisplayName =
    user?.displayName ||
    user?.username ||
    user?.name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    fallbackName ||
    (fallbackEmail ? fallbackEmail.split('@')[0] : '') ||
    t('nav.profile')

  const unreadCount = useMemo(() => {
    if (typeof window === 'undefined') return notifications.length
    const lastSeenAt = Number(localStorage.getItem('bilycard_notifications_seen_at') || 0)
    return notifications.filter((item) => new Date(item.createdAt).getTime() > lastSeenAt).length
  }, [notifications])

  useEffect(() => {
    const syncAuthState = async () => {
      const token = localStorage.getItem('bilycard_token')

      if (!token) {
        setIsAuthenticated(false)
        setUser(null)
        return
      }

      setIsAuthenticated(true)

      try {
        const nextUser = await fetchAuthUser(token)
        if (nextUser) {
          setUser(nextUser)

          const nextName =
            nextUser?.displayName ||
            nextUser?.username ||
            nextUser?.name ||
            (nextUser?.email ? nextUser.email.split('@')[0] : '')

          if (nextName) {
            localStorage.setItem('bilycard_user_name', nextName)
          }

          if (nextUser?.email) {
            localStorage.setItem('bilycard_user_email', nextUser.email)
          }

          if (nextUser?.avatar) {
            localStorage.setItem('bilycard_user_avatar', nextUser.avatar)
          }

          try {
            setLoadingNotifications(true)
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

            const [ordersPayload, txPayload] = await Promise.all([
              ordersRes.json().catch(() => ({})),
              txRes.json().catch(() => ({})),
            ])

            const orders = Array.isArray(ordersPayload?.data) ? (ordersPayload.data as NavbarOrder[]) : []
            const transactions = Array.isArray(txPayload?.transactions)
              ? (txPayload.transactions as NavbarTransaction[])
              : []

            const nextNotifications: NavbarNotification[] = [
              ...orders.slice(0, 4).map((order) => ({
                id: `order-${order.orderId || order.createdAt || Math.random()}`,
                title:
                  String(order.status || '').toLowerCase() === 'completed'
                    ? 'Order Completed'
                    : 'Order Update',
                description: `${order.productName || 'Product'}${order.total ? ` - $${Number(order.total).toFixed(2)}` : ''}`,
                createdAt: order.createdAt || new Date().toISOString(),
                href: '/my-orders',
                icon: 'order' as const,
              })),
              ...transactions
                .filter((tx) => String(tx.type || '').toLowerCase() === 'deposit')
                .slice(0, 3)
                .map((tx) => ({
                  id: `deposit-${tx.createdAt || Math.random()}`,
                  title: 'Balance Update',
                  description: `${tx.description || tx.notes || 'Deposit received'}${tx.amount ? ` - ${Number(tx.amount).toFixed(2)} ${tx.currency || 'USD'}` : ''}`,
                  createdAt: tx.createdAt || new Date().toISOString(),
                  href: '/wallet',
                  icon: 'deposit' as const,
                })),
            ]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 6)

            setNotifications(nextNotifications)
          } catch (notificationError) {
            console.error('Failed to fetch notifications:', notificationError)
            setNotifications([])
          } finally {
            setLoadingNotifications(false)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === 'bilycard_token' ||
        event.key === 'bilycard_user_name' ||
        event.key === 'bilycard_user_email'
      ) {
        void syncAuthState()
      }
    }

    const handleAuthChanged = () => {
      void syncAuthState()
    }

    void syncAuthState()
    setIsDropdownOpen(false)
    setIsNotificationsOpen(false)

    window.addEventListener('storage', handleStorage)
    window.addEventListener('bilycard-auth-changed', handleAuthChanged)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('bilycard-auth-changed', handleAuthChanged)
    }
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsNotificationsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleLogout = () => {
    const token = localStorage.getItem('bilycard_token') || localStorage.getItem('token') || undefined
    clearAuthUserCache(token)
    localStorage.removeItem('token')
    localStorage.removeItem('bilycard_token')
    localStorage.removeItem('bilycard_user_name')
    localStorage.removeItem('bilycard_user_email')
    localStorage.removeItem('bilycard_user_avatar')
    setIsAuthenticated(false)
    setUser(null)
    setIsDropdownOpen(false)
    window.dispatchEvent(new Event('bilycard-auth-changed'))
    window.location.href = '/login'
  }

  const handleNotificationsToggle = () => {
    const nextValue = !isNotificationsOpen
    setIsNotificationsOpen(nextValue)
    if (nextValue && typeof window !== 'undefined') {
      localStorage.setItem('bilycard_notifications_seen_at', String(Date.now()))
    }
  }

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.products'), href: '/products', icon: Gamepad2 },
    { name: 'My Favorites', href: '/my-favorites', icon: Heart },
    { name: t('nav.myOrders'), href: myOrdersHref, icon: ShoppingBag },
    { name: t('nav.wallet'), href: '/wallet', icon: Wallet },
    { name: t('nav.contact'), href: '/contact', icon: MessageCircle },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050b16]/75 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[74px] items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.26),rgba(14,165,233,0.08))] shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_14px_30px_rgba(8,47,73,0.35)]">
                <img
                  src="/payment-methods/profile web.jpg"
                  alt="Bily Card logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="leading-tight">
                <span className="block text-lg font-black tracking-[0.16em] text-white sm:text-xl">BILY CARD</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
                  Instant Gaming Top Up
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 md:flex">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-sky-500/10 text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-[7px] h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden sm:block" ref={bellRef}>
              <button
                onClick={handleNotificationsToggle}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-cyan-400/30 hover:text-white"
                type="button"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                  </>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-[360px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="text-xs text-slate-400">Recent updates for your account</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-[11px] font-semibold text-cyan-300">
                        {unreadCount} new
                      </span>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {loadingNotifications ? (
                      <div className="space-y-2 p-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                            <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
                            <div className="mt-2 h-3 w-44 animate-pulse rounded bg-slate-800" />
                          </div>
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell className="mx-auto h-8 w-8 text-slate-500" />
                        <p className="mt-3 text-sm font-medium text-white">No notifications yet</p>
                        <p className="mt-1 text-xs text-slate-400">Your latest orders and balance updates will appear here.</p>
                      </div>
                    ) : (
                      notifications.map((item) => {
                        const Icon = item.icon === 'deposit' ? ArrowDownToLine : String(item.title).toLowerCase().includes('completed') ? CheckCircle2 : Clock3
                        const content = (
                          <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 transition hover:border-cyan-400/15 hover:bg-white/[0.05]">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                              <Icon className={`h-4 w-4 ${item.icon === 'deposit' ? 'text-emerald-300' : 'text-cyan-300'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{item.description}</p>
                              <p className="mt-2 text-[11px] text-slate-500">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )

                        if (item.href) {
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setIsNotificationsOpen(false)}
                              className="block p-1"
                            >
                              {content}
                            </Link>
                          )
                        }

                        return (
                          <div key={item.id} className="p-1">
                            {content}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="hidden items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2.5 shadow-[0_12px_30px_rgba(6,78,59,0.18)] sm:flex">
                <Wallet className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-bold text-emerald-300">
                  ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                </span>
              </div>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 shadow-[0_14px_34px_rgba(2,6,23,0.28)] transition-colors hover:border-cyan-400/20 hover:bg-white/[0.07]"
                >
                  {(user?.avatar || fallbackAvatar) ? (
                    <img
                      src={user?.avatar || fallbackAvatar}
                      alt="User avatar"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <span className="hidden text-sm font-medium text-white sm:block">
                    {userDisplayName}
                  </span>

                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
                    <div className="border-b border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-white">{userDisplayName}</p>
                      <p className="text-xs text-slate-400">
                        {user?.email || fallbackEmail || ''}
                      </p>
                    </div>

                    <div className="py-2">
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="mx-2 flex items-center rounded-2xl px-3 py-2.5 text-sm text-cyan-300 hover:bg-slate-800 hover:text-cyan-200"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="mx-2 flex items-center rounded-2xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {t('nav.profile')}
                      </Link>

                      <Link
                        href="/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="mx-2 flex items-center rounded-2xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        {t('nav.wallet')}
                      </Link>

                      <Link
                        href="/my-orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="mx-2 flex items-center rounded-2xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {t('nav.myOrders')}
                      </Link>

                      <Link
                        href="/my-favorites"
                        onClick={() => setIsDropdownOpen(false)}
                        className="mx-2 flex items-center rounded-2xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        My Favorites
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="mx-2 flex w-[calc(100%-1rem)] items-center rounded-2xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] transition-all hover:from-cyan-400 hover:to-sky-500"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>

        <div className="md:hidden">
          <nav className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'border-cyan-400/30 bg-cyan-500/15 text-cyan-200'
                      : 'border-white/10 bg-white/[0.03] text-slate-300'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
