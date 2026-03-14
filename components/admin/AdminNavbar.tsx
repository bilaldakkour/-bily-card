'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { clearAuthUserCache, fetchAuthUser } from '@/lib/utils/authClient'

interface User {
  displayName: string
  email: string
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Deposits', href: '/admin/deposits', icon: CreditCard },
  { name: 'Payment Methods', href: '/admin/payment-methods', icon: WalletCards },
  { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'Products', href: '/admin/products', icon: Package },
  { name: 'Users', href: '/admin/users', icon: Users },
]

export default function AdminNavbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [today, setToday] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    setToday(new Intl.DateTimeFormat('en-US').format(new Date()))

    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    fetchAuthUser(token)
      .then((data) => {
        setUser(data)
      })
      .catch(() => {
        clearAuthUserCache(token)
        localStorage.removeItem('adminToken')
        router.push('/admin/login')
      })
  }, [router])

  const handleLogout = () => {
    const token = localStorage.getItem('adminToken') || undefined
    clearAuthUserCache(token)
    localStorage.removeItem('adminToken')
    setIsMenuOpen(false)
    router.push('/admin/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white sm:text-lg">Admin Panel</h2>
          {user && (
            <p className="max-w-[180px] truncate text-xs text-slate-400 sm:max-w-none sm:text-sm">
              Welcome, {user.displayName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15 sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Site</span>
          </Link>
          <span className="hidden text-sm text-slate-400 sm:inline">{today}</span>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
            aria-label={isMenuOpen ? 'Close admin menu' : 'Open admin menu'}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl lg:hidden">
          <div className="mb-3 text-xs text-slate-500">{today}</div>
          <Link
            href="/"
            onClick={() => setIsMenuOpen(false)}
            className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Site</span>
          </Link>
          <nav className="grid gap-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-200 transition hover:bg-white/[0.06]"
                >
                  <Icon className="h-4 w-4 text-cyan-300" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-500"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </header>
  )
}
