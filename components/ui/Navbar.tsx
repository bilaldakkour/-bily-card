'use client'

import { useEffect, useState } from 'react'
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

export default function Navbar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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

    window.addEventListener('storage', handleStorage)
    window.addEventListener('bilycard-auth-changed', handleAuthChanged)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('bilycard-auth-changed', handleAuthChanged)
    }
  }, [pathname])

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

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.products'), href: '/products', icon: Gamepad2 },
    { name: 'My Favorites', href: '/my-favorites', icon: Heart },
    { name: t('nav.myOrders'), href: myOrdersHref, icon: ShoppingBag },
    { name: t('nav.wallet'), href: '/wallet', icon: Wallet },
    { name: t('nav.contact'), href: '/contact', icon: MessageCircle },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b16]/75 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[74px] items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(56,189,248,0.26),rgba(14,165,233,0.08))] shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_14px_30px_rgba(8,47,73,0.35)]">
                <Gamepad2 className="h-5 w-5 text-cyan-200" />
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
            <button className="relative hidden h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-cyan-400/30 hover:text-white sm:flex">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

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
