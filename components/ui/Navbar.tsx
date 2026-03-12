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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020617]/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Bily Card</span>
            </Link>
          </div>

          <nav className="hidden items-center space-x-8 md:flex">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative px-3 py-2 text-sm font-medium transition-colors hover:text-blue-400 ${
                    isActive ? 'text-blue-400' : 'text-slate-300'
                  }`}
                >
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-purple-600" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-slate-400 transition-colors hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {isAuthenticated && (
              <div className="hidden items-center space-x-2 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 sm:flex">
                <Wallet className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  ${Number(user?.walletBalance?.usd || 0).toFixed(2)}
                </span>
              </div>
            )}

            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 transition-colors hover:bg-slate-700/50"
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
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-slate-800 shadow-xl">
                    <div className="border-b border-white/10 p-3">
                      <p className="text-sm font-medium text-white">{userDisplayName}</p>
                      <p className="text-xs text-slate-400">
                        {user?.email || fallbackEmail || ''}
                      </p>
                    </div>

                    <div className="py-1">
                      {user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center px-3 py-2 text-sm text-cyan-300 hover:bg-slate-700 hover:text-cyan-200"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <User className="mr-2 h-4 w-4" />
                        {t('nav.profile')}
                      </Link>

                      <Link
                        href="/wallet"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        {t('nav.wallet')}
                      </Link>

                      <Link
                        href="/my-orders"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        {t('nav.myOrders')}
                      </Link>

                      <Link
                        href="/my-favorites"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Heart className="mr-2 h-4 w-4" />
                        My Favorites
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
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
                className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}